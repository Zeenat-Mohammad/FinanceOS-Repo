import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bell,
  BookOpen,
  Camera,
  Check,
  HelpCircle,
  KeyRound,
  Link2,
  LogOut,
  Mail,
  MessageSquareText,
  Pencil,
  Shield,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { ProfileRepository, SecurityRepository } from '@/data/repositories/ProfileRepository';
import { HouseholdsRepository } from '@/data/repositories/HouseholdsRepository';
import { CurrencyMigrationRepository } from '@/data/repositories/CurrencyMigrationRepository';
import { changePasswordWithCurrentPassword, sendPasswordReset, supabaseLogout, verifyPassword } from '@/features/auth/authService';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { getPasswordChecks, passwordSchema } from '@/features/auth/passwordValidation';
import { useAuthStore } from '@/features/auth/authStore';
import { FINLO_FAQS } from '@/features/assistant/knowledge/finloKnowledge';
import { Button, Card, Modal, Page, PageHeader } from '@/shared/components';
import { toAppError } from '@/shared/errors';
import { useThemeStore, type ThemeMode } from '@/shared/state/theme';
import { useCurrencyUiStore } from '@/shared/state/currencyUi';
import { CurrencyConverter } from '@/features/dashboard/components/CurrencyConverter';
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, getTimezoneOptions } from '@/core/locale/options';
import { cn } from '@/core/utils/cn';

const PROFILE_TABS = [
  { id: 'personal', label: 'Personal Information' },
  { id: 'security', label: 'Security' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'currency', label: 'Currency' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'theme', label: 'Theme' },
  { id: 'connected', label: 'Connected Services' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'support', label: 'Support' },
  { id: 'delete', label: 'Delete Account' }
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number]['id'];

const currencyCodes = CURRENCY_OPTIONS.map((c) => c.code) as [string, ...string[]];

const profileSchema = z.object({
  fullName: z.string().min(2, 'Enter your name.'),
  country: z.string().min(1, 'Select your country.'),
  timezone: z.string().min(1, 'Select your timezone.'),
  currency: z.enum(currencyCodes, { message: 'Select a currency.' }),
  locale: z.string().min(2, 'Enter your language/locale.'),
  theme: z.enum(['system', 'dark', 'light'])
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.')
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const TIMEZONE_OPTIONS = getTimezoneOptions();

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, profile, household, setAuthContext, setUser } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const currencyUi = useCurrencyUiStore();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resolvedCurrency = useMemo(() => {
    const code = (profile?.currency || household?.default_currency || 'USD').toUpperCase();
    return currencyCodes.includes(code) ? code : 'USD';
  }, [profile?.currency, household?.default_currency]);

  const resolvedCountry = useMemo(() => {
    const code = (profile?.country || '').toUpperCase();
    if (COUNTRY_OPTIONS.some((c) => c.code === code)) return code;
    if (profile?.country) return 'OTHER';
    return 'US';
  }, [profile?.country]);

  const resolvedTimezone = useMemo(() => {
    const tz = profile?.timezone || household?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    return TIMEZONE_OPTIONS.includes(tz) ? tz : TIMEZONE_OPTIONS[0] ?? 'UTC';
  }, [profile?.timezone, household?.timezone]);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.full_name ?? user?.email?.split('@')[0] ?? '',
      country: resolvedCountry,
      timezone: resolvedTimezone,
      currency: resolvedCurrency as ProfileFormValues['currency'],
      locale: profile?.locale ?? navigator.language,
      theme
    }
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema)
  });
  const newPassword = passwordForm.watch('newPassword') ?? '';
  const securityEvents = useMemo(() => (user ? SecurityRepository.readLocalEvents(user.id) : []), [user, message]);

  useEffect(() => {
    let cancelled = false;
    async function loadAvatar() {
      if (!profile?.avatar_url) {
        setAvatarPreview(null);
        return;
      }
      const url = await ProfileRepository.resolveAvatarUrl(profile.avatar_url);
      if (!cancelled) setAvatarPreview(url);
    }
    void loadAvatar();
    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_url]);

  if (!user || !profile) return null;

  async function saveProfile(values: ProfileFormValues) {
    setMessage(null);
    setError(null);

    if (!user || !profile) {
      setError('Your profile session is still loading. Please wait a moment and try again.');
      return;
    }

    const previousCurrency = (profile.currency || household?.default_currency || 'USD').toUpperCase();
    const nextCurrency = values.currency.toUpperCase();
    const currencyChanged = previousCurrency !== nextCurrency;

    try {
      if (currencyChanged && household?.id) {
        currencyUi.start(`Converting amounts from ${previousCurrency} to ${nextCurrency}…`);
        await CurrencyMigrationRepository.convertHousehold({
          householdId: household.id,
          userId: user.id,
          fromCurrency: previousCurrency,
          toCurrency: nextCurrency,
          onProgress: (msg) => currencyUi.setMessage(msg)
        });
        currencyUi.setMessage('Refreshing Finlo across the app…');
        await queryClient.invalidateQueries();
      }

      const updatedProfile = await ProfileRepository.updateProfile(user.id, {
        full_name: values.fullName,
        country: values.country === 'OTHER' ? profile.country || 'OTHER' : values.country,
        timezone: values.timezone,
        currency: nextCurrency,
        locale: values.locale,
        tax_preferences: {
          theme: values.theme,
          currency_code: nextCurrency,
          currency_symbol: getCurrencySymbol(nextCurrency, values.locale),
          locale: values.locale
        }
      });

      let updatedHousehold = household;
      if (household?.id) {
        updatedHousehold = await HouseholdsRepository.updateDefaults(household.id, {
          default_currency: nextCurrency,
          locale: values.locale,
          timezone: values.timezone
        });
      }

      setAuthContext({ user, profile: updatedProfile, household: updatedHousehold });
      setTheme(values.theme as ThemeMode);
      await SecurityRepository.logEvent(user.id, 'profile_update', {
        fields: currencyChanged ? ['profile', 'currency_conversion'] : ['profile'],
        from: previousCurrency,
        to: nextCurrency
      }).catch((auditError) => {
        console.warn('[Profile] Profile update audit log failed', auditError);
      });
      setMessage(
        currencyChanged
          ? `Profile updated. All amounts converted to ${nextCurrency}.`
          : 'Profile updated.'
      );
    } catch (err) {
      console.error('[Profile] Failed to save profile', {
        error: err,
        userId: user.id,
        householdId: household?.id ?? null,
        currencyChanged,
        previousCurrency,
        nextCurrency
      });
      setError(getProfileSaveMessage(err, { currencyChanged, previousCurrency, nextCurrency }));
    } finally {
      currencyUi.stop();
    }
  }

  async function changePassword(values: PasswordFormValues) {
    setMessage(null);
    setError(null);

    try {
      await changePasswordWithCurrentPassword(user!.email!, values.currentPassword, values.newPassword);
      passwordForm.reset();
      await SecurityRepository.logEvent(user!.id, 'password_change');
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(toAppError(err).userMessage);
    }
  }

  async function resetPasswordEmail() {
    setMessage(null);
    setError(null);

    try {
      await sendPasswordReset(user!.email!);
      await SecurityRepository.logEvent(user!.id, 'password_reset_request');
      setMessage('Password reset email sent.');
    } catch (err) {
      setError(toAppError(err).userMessage);
    }
  }

  async function signOut() {
    await supabaseLogout();
    setUser(null);
  }

  async function confirmDelete() {
    setDeleteMessage(null);
    setError(null);

    try {
      await verifyPassword(user!.email!, deletePassword);
      setDeleteMessage(
        'Identity confirmed. Secure account deletion requires the server-side deletion endpoint to be connected before data can be permanently removed.'
      );
    } catch (err) {
      setError(toAppError(err).userMessage);
    }
  }

  async function onAvatarSelected(file: File | undefined) {
    if (!file) return;
    setAvatarBusy(true);
    setMessage(null);
    setError(null);
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    try {
      const updated = await ProfileRepository.uploadAvatar(user!.id, file);
      setAuthContext({ user, profile: updated, household });
      const signed = await ProfileRepository.resolveAvatarUrl(updated.avatar_url);
      setAvatarPreview(signed);
      setMessage('Avatar updated.');
    } catch (err) {
      const resolved = await ProfileRepository.resolveAvatarUrl(profile?.avatar_url);
      setAvatarPreview(resolved);
      setError(toAppError(err).userMessage);
    } finally {
      URL.revokeObjectURL(localPreview);
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const initials = (profile.full_name ?? user.email ?? 'F').slice(0, 1).toUpperCase();

  return (
    <Page>
      <PageHeader title="Profile" description="Identity, preferences, security, and support — all in one place." />

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-border pb-3">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition',
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'border border-border bg-white text-muted hover:text-foreground'
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-success">
          <Check aria-hidden className="h-4 w-4" />
          {message}
        </div>
      ) : null}
      {error ? <div className="mb-4 text-sm text-destructive">{error}</div> : null}

      {activeTab === 'personal' ? (
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="space-y-4">
          <div className="grid place-items-center text-center">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile avatar"
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-accent/40"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--color-button)] text-3xl font-semibold text-white">
                  {initials}
                </div>
              )}
            </div>
            <h2 className="mt-3 text-lg font-semibold">{profile.full_name ?? 'Finlo User'}</h2>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onAvatarSelected(e.target.files?.[0])}
          />
          <Button
            className="w-full"
            type="button"
            disabled={avatarBusy}
            onClick={() => fileRef.current?.click()}
          >
            <Camera aria-hidden className="h-4 w-4" />
            {avatarBusy ? 'Uploading…' : 'Change Avatar'}
          </Button>
          <p className="text-xs text-muted">JPEG, PNG, or WebP · max 5 MB. Files are scanned and stored privately in your avatars bucket.</p>
        </Card>

        <Card>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={profileForm.handleSubmit(saveProfile)}>
            <Field label="Name" error={profileForm.formState.errors.fullName?.message}>
              <input className="input" {...profileForm.register('fullName')} />
            </Field>
            <Field label="Email">
              <input className="input" disabled value={user.email ?? ''} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">
                <Pencil aria-hidden className="h-4 w-4" />
                Save Profile
              </Button>
            </div>
          </form>
        </Card>
      </div>
      ) : null}

      {activeTab === 'security' ? (
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Shield aria-hidden className="h-5 w-5 text-success" />
          <h2 className="text-lg font-semibold">Security</h2>
        </div>
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={passwordForm.handleSubmit(changePassword)}>
          <PasswordInput
            label="Current Password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <PasswordInput
            label="New Password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <PasswordInput
            label="Confirm Password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <div className="grid gap-1 text-xs text-muted sm:col-span-3">
            {getPasswordChecks(newPassword).map((check) => (
              <span key={check.label} className={check.valid ? 'text-success' : undefined}>
                {check.valid ? '✓' : '•'} {check.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button type="submit">
              <KeyRound aria-hidden className="h-4 w-4" />
              Change Password
            </Button>
            <Button
              className="border border-border bg-transparent text-foreground hover:bg-[var(--color-button-hover)] hover:text-white"
              onClick={resetPasswordEmail}
              type="button"
            >
              <Mail aria-hidden className="h-4 w-4" />
              Reset Password Email
            </Button>
          </div>
        </form>
      </Card>
      ) : null}

      {activeTab === 'preferences' ? (
      <Card>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={profileForm.handleSubmit(saveProfile)}>
          <Field label="Country" error={profileForm.formState.errors.country?.message}>
            <select className="select" {...profileForm.register('country')}>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Timezone" error={profileForm.formState.errors.timezone?.message}>
            <select className="select" {...profileForm.register('timezone')}>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Language / locale" error={profileForm.formState.errors.locale?.message}>
            <input className="input" {...profileForm.register('locale')} />
          </Field>
          <Field label="Household">
            <input className="input" disabled value={household?.name ?? 'My Household'} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit">
              <Pencil aria-hidden className="h-4 w-4" />
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>
      ) : null}

      {activeTab === 'currency' ? (
      <>
        <Card>
          <form className="grid gap-4 sm:max-w-md" onSubmit={profileForm.handleSubmit(saveProfile)}>
            <Field label="Display currency" error={profileForm.formState.errors.currency?.message}>
              <select className="select" {...profileForm.register('currency')}>
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted">
                Changing currency converts all amounts app-wide using live exchange rates.
              </p>
            </Field>
            <Button type="submit">
              <Pencil aria-hidden className="h-4 w-4" />
              Save Currency
            </Button>
          </form>
        </Card>
        <CurrencyConverter baseCurrency={profile.currency || household?.default_currency || 'USD'} />
      </>
      ) : null}

      {activeTab === 'notifications' ? (
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <p className="text-sm text-muted">
          Bill reminders, budget alerts, and goal milestones appear in the notification bell in the top bar. Email delivery is configured via Supabase Edge Functions.
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Upcoming bills and recurring payments</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Budget overspend warnings</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Goal milestone progress</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Debt payoff milestones</li>
        </ul>
      </Card>
      ) : null}

      {activeTab === 'theme' ? (
      <Card>
        <form className="grid gap-4 sm:max-w-md" onSubmit={profileForm.handleSubmit(saveProfile)}>
          <Field label="Theme">
            <select className="select" {...profileForm.register('theme')}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </Field>
          <Button type="submit">
            <Pencil aria-hidden className="h-4 w-4" />
            Save Theme
          </Button>
        </form>
      </Card>
      ) : null}

      {activeTab === 'connected' ? (
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted" />
          <h2 className="text-lg font-semibold">Connected Services</h2>
        </div>
        <p className="text-sm text-muted">Bank feeds, broker sync, and open banking connections will appear here in a future release.</p>
      </Card>
      ) : null}

      {activeTab === 'privacy' ? (
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Data protection</h2>
        </div>
        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Household data is scoped with Supabase Row Level Security.</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Avatar uploads validate type, size, and file signatures.</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Passwords require length, case, number, and special character.</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Sensitive actions are logged for your review (login, password, avatar).</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Failed sign-ins are rate-limited on this device after repeated attempts.</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Currency codes are sanitized to ISO-style 3-letter values.</li>
          <li className="rounded-md border border-border/60 bg-primary/40 px-3 py-2">Private storage buckets keep receipts and avatars off the public web.</li>
        </ul>
        {securityEvents.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Recent security activity</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {securityEvents.slice(0, 5).map((event) => (
                <li key={`${event.type}-${event.at}`}>
                  {event.type.replaceAll('_', ' ')} · {new Date(event.at).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
      ) : null}

      {activeTab === 'support' ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">FAQ</h2>
          </div>
          <div className="space-y-2">
            {FINLO_FAQS.map((faq) => (
              <div key={faq.id} className="rounded-md border border-border/60 bg-primary/20">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-foreground"
                  onClick={() => setExpandedFaq((current) => (current === faq.id ? null : faq.id))}
                >
                  {faq.question}
                  <span className="text-muted">{expandedFaq === faq.id ? '−' : '+'}</span>
                </button>
                {expandedFaq === faq.id ? (
                  <p className="border-t border-border/40 px-3 py-2 text-sm text-muted">{faq.answer}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-success" />
              <h2 className="text-lg font-semibold">Documentation</h2>
            </div>
            <p className="text-sm text-muted">
              Product rules and the financial knowledge base ship with the Finlo repository under{' '}
              <code className="text-foreground">docs/ProductRules.md</code> and{' '}
              <code className="text-foreground">docs/financial-knowledge.md</code>. Ask Finlo AI on the Financial News page for guided answers.
            </p>
          </Card>
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold">Contact</h2>
            </div>
            <p className="text-sm text-muted">
              Email{' '}
              <a href="mailto:hajra.mshahid24@gmail.com" className="text-accent hover:underline">
                hajra.mshahid24@gmail.com
              </a>{' '}
              for support.
            </p>
          </Card>
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold">Feedback</h2>
            </div>
            <p className="text-sm text-muted">Report bugs, request features, or share product feedback.</p>
            <Link to="/feedback">
              <Button type="button">
                <MessageSquareText className="h-4 w-4" />
                Open Feedback
              </Button>
            </Link>
          </Card>
        </div>
      </div>
      ) : null}

      {activeTab === 'delete' ? (
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Delete account</h2>
        <p className="text-sm text-muted">
          Permanently remove your Finlo account and household data. This action cannot be undone.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            className="border border-border bg-transparent text-foreground hover:bg-[var(--color-button-hover)] hover:text-white"
            onClick={signOut}
          >
            <LogOut aria-hidden className="h-4 w-4" />
            Sign Out
          </Button>
          <Button className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden className="h-4 w-4" />
            Delete Account
          </Button>
        </div>
      </Card>
      ) : null}

      <Modal open={deleteOpen} title="Delete account" onClose={() => setDeleteOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-muted">All financial data will be permanently deleted. Confirm your password before continuing.</p>
          <PasswordInput
            label="Confirm password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
          />
          {deleteMessage ? <div className="text-sm text-success">{deleteMessage}</div> : null}
          <div className="flex justify-end gap-2">
            <Button
              className="border border-border bg-transparent text-foreground hover:bg-[var(--color-button-hover)] hover:text-white"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive" disabled={!deletePassword} onClick={confirmDelete}>
              <Trash2 aria-hidden className="h-4 w-4" />
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <div className="mt-1 text-xs text-destructive">{error}</div> : null}
    </label>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function getCurrencySymbol(currency: string, locale: string) {
  try {
    return (
      new Intl.NumberFormat(locale, { style: 'currency', currency })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? currency
    );
  } catch {
    return currency;
  }
}

function getProfileSaveMessage(
  error: unknown,
  context: { currencyChanged: boolean; previousCurrency: string; nextCurrency: string }
) {
  const appError = toAppError(error);

  if (context.currencyChanged) {
    if (error instanceof Error && error.message) {
      return `Currency conversion from ${context.previousCurrency} to ${context.nextCurrency} failed: ${error.message}`;
    }
    return `Currency conversion from ${context.previousCurrency} to ${context.nextCurrency} failed. Your profile was not changed.`;
  }

  if (appError.code === 'PERMISSION_ERROR') {
    return 'Your account does not have permission to save this profile.';
  }

  if (appError.code === 'NETWORK_ERROR') {
    return 'Network connection failed while saving your profile. Please check your connection and try again.';
  }

  if (appError.code === 'DATABASE_ERROR') {
    return 'Your profile could not be saved to the database. Please refresh and try again.';
  }

  if (error instanceof Error && error.message && !isLikelyTechnicalError(error.message)) {
    return error.message;
  }

  return 'Your profile could not be saved. The technical details were logged in the console.';
}

function isLikelyTechnicalError(message: string) {
  return /undefined|null|object|property|stack|syntax|json|supabase|postgrest|constraint|violates|column|relation/i.test(message);
}
