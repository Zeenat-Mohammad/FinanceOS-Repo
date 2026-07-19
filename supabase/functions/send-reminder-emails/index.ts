type ReminderDelivery = {
  id: string;
  household_id: string;
  reminder_kind: 'calendar' | 'recurring';
  calendar_reminder_id: string | null;
  recurring_rule_id: string | null;
  scheduled_for: string;
  recipient_email: string;
  subject: string;
  body: string;
  attempt_count: number;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const REMINDER_FROM_EMAIL = Deno.env.get('REMINDER_FROM_EMAIL') ?? 'Finlo <reminders@finlofinance.com>';
const CRON_SECRET = Deno.env.get('REMINDER_CRON_SECRET');
const MAX_ATTEMPTS = Number(Deno.env.get('REMINDER_MAX_ATTEMPTS') ?? '3');

const jsonHeaders = {
  'content-type': 'application/json'
};

function supabaseHeaders() {
  return {
    ...jsonHeaders,
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`
  };
}

function assertAuthorized(request: Request) {
  if (!CRON_SECRET) return;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token !== CRON_SECRET) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
  }
}

async function enqueueDueReminders(nowIso: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/enqueue_due_reminder_emails`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ p_now: nowIso })
  });

  if (!response.ok) {
    throw new Error(`Failed to enqueue reminders: ${response.status} ${await response.text()}`);
  }

  return Number(await response.json());
}

async function loadPendingDeliveries(nowIso: string): Promise<ReminderDelivery[]> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/reminder_email_deliveries`);
  url.searchParams.set('select', '*');
  url.searchParams.set('status', 'eq.pending');
  url.searchParams.set('scheduled_for', `lte.${nowIso}`);
  url.searchParams.set('deleted_at', 'is.null');
  url.searchParams.set('order', 'scheduled_for.asc');
  url.searchParams.set('limit', '50');

  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to load pending reminders: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as ReminderDelivery[];
}

async function patchDelivery(id: string, payload: Record<string, unknown>) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/reminder_email_deliveries`);
  url.searchParams.set('id', `eq.${id}`);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders(),
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to update reminder delivery ${id}: ${response.status} ${await response.text()}`);
  }
}

async function patchSourceStatus(delivery: ReminderDelivery, payload: Record<string, unknown>) {
  const table = delivery.reminder_kind === 'calendar' ? 'calendar_reminders' : 'recurring_rules';
  const sourceId = delivery.reminder_kind === 'calendar' ? delivery.calendar_reminder_id : delivery.recurring_rule_id;
  if (!sourceId) return;

  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('id', `eq.${sourceId}`);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders(),
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.warn(`Could not update reminder source ${sourceId}: ${response.status} ${await response.text()}`);
  }
}

async function sendEmail(delivery: ReminderDelivery) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      authorization: `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: REMINDER_FROM_EMAIL,
      to: [delivery.recipient_email],
      subject: delivery.subject,
      text: delivery.body
    })
  });

  if (!response.ok) {
    throw new Error(`Resend failed: ${response.status} ${await response.text()}`);
  }
}

Deno.serve(async (request) => {
  try {
    assertAuthorized(request);

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase service credentials are not configured.' }), { status: 500, headers: jsonHeaders });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured.' }), { status: 500, headers: jsonHeaders });
    }

    const nowIso = new Date().toISOString();
    const queued = await enqueueDueReminders(nowIso);
    const deliveries = await loadPendingDeliveries(nowIso);

    let sent = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      try {
        await patchDelivery(delivery.id, {
          attempt_count: delivery.attempt_count + 1,
          last_attempt_at: nowIso,
          last_error: null
        });
        await sendEmail(delivery);
        await patchDelivery(delivery.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: null
        });
        await patchSourceStatus(
          delivery,
          delivery.reminder_kind === 'calendar'
            ? { status: 'sent' }
            : { reminder_status: 'sent', reminder_last_sent_at: new Date().toISOString(), reminder_last_error: null }
        );
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown reminder email failure';
        const nextAttempts = delivery.attempt_count + 1;
        const status = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
        await patchDelivery(delivery.id, {
          status,
          attempt_count: nextAttempts,
          last_attempt_at: new Date().toISOString(),
          last_error: message
        });
        await patchSourceStatus(
          delivery,
          delivery.reminder_kind === 'calendar'
            ? { status: 'failed' }
            : { reminder_status: 'failed', reminder_failure_count: nextAttempts, reminder_last_error: message }
        );
        failed += 1;
      }
    }

    return new Response(JSON.stringify({ queued, processed: deliveries.length, sent, failed }), {
      headers: jsonHeaders
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected reminder sender error' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
});
