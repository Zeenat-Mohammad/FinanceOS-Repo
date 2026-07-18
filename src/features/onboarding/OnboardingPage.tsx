import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type FieldErrors, type UseFormRegisterReturn, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleDashed, CircleDot, Clock3, Lock, SkipForward } from 'lucide-react';
import {
  AccountsRepository,
  BillsRepository,
  IncomeSourcesRepository,
  OnboardingRepository,
  ProfileRepository
} from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { useAuthStore } from '@/features/auth/authStore';
import { BrandLogo, Button, Card, EmptyState, LoadingState, Page, PageHeader, Table } from '@/shared/components';
import { HouseholdMissingError, ProfileMissingError, toAppError, ValidationError } from '@/shared/errors';
import { Logger } from '@/core/logging/Logger';
import { buildCsvPreview, parseCsv, type CsvMapping, type CsvPreviewRow, type CsvSummary } from './csv';
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, getTimezoneOptions } from '@/core/locale/options';

const TIMEZONE_OPTIONS = getTimezoneOptions();
const currencyCodes = CURRENCY_OPTIONS.map((c) => c.code) as [string, ...string[]];

const mandatoryStepIds = ['personalDetails', 'accounts', 'income', 'savings', 'bills'] as const;

const steps = [
  { id: 'personalDetails', label: 'Personal Details', required: true },
  { id: 'accounts', label: 'Accounts', required: true },
  { id: 'income', label: 'Income', required: true },
  { id: 'savings', label: 'Savings', required: true },
  { id: 'bills', label: 'Bills', required: true },
  { id: 'goals', label: 'Goals', required: false },
  { id: 'debts', label: 'Debts', required: false },
  { id: 'assets', label: 'Assets', required: false },
  { id: 'investments', label: 'Investments', required: false },
  { id: 'insurance', label: 'Insurance', required: false }
] as const;

type StepId = (typeof steps)[number]['id'];

const optionalNumber = z.preprocess((value) => (value === '' || value === null ? undefined : value), z.coerce.number().optional());
const requiredAmount = z.preprocess((value) => (value === '' || value === null ? undefined : value), z.coerce.number({ required_error: 'Enter an amount.' }).nonnegative('Amount cannot be negative.'));
const positiveAmount = z.preprocess((value) => (value === '' || value === null ? undefined : value), z.coerce.number({ required_error: 'Enter an amount.' }).positive('Amount must be greater than zero.'));

const schema = z.object({
  fullName: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().min(3).max(3).default('USD'),
  locale: z.string().default('en-US'),
  timezone: z.string().default('UTC'),
  salaryFrequency: z.string().optional(),
  familySize: optionalNumber,
  accountName: z.string().optional(),
  accountType: z.string().optional(),
  institution: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
  incomeType: z.string().optional(),
  incomeAmount: optionalNumber,
  incomeFrequency: z.string().optional(),
  billType: z.string().optional(),
  billAmount: optionalNumber,
  billDueDay: optionalNumber,
  emergencyFund: optionalNumber,
  currentSavings: optionalNumber,
  monthlySavings: optionalNumber,
  preferredSavingsPercent: optionalNumber,
  savingsAccount: z.string().optional(),
  savingsNotes: z.string().optional(),
  goalName: z.string().optional(),
  goalTarget: optionalNumber,
  goalTargetDate: z.string().optional(),
  goalPriority: z.string().optional(),
  debtName: z.string().optional(),
  debtBalance: optionalNumber,
  debtInterest: optionalNumber,
  debtMinimumPayment: optionalNumber,
  debtDueDate: z.string().optional(),
  assetType: z.string().optional(),
  assetValue: optionalNumber,
  investmentType: z.string().optional(),
  investmentValue: optionalNumber,
  insuranceType: z.string().optional(),
  insuranceCoverage: optionalNumber
});

type FormValues = z.infer<typeof schema>;

const stepValidation: Record<StepId, z.ZodTypeAny> = {
  personalDetails: z.object({
    fullName: z.string().min(2, 'Enter your full name.'),
    country: z.string().min(1, 'Select your country.'),
    currency: z.enum(currencyCodes, { message: 'Select a currency.' }),
    locale: z.string().min(2, 'Enter a locale.'),
    timezone: z.string().min(1, 'Select a timezone.'),
    salaryFrequency: z.string().optional(),
    familySize: optionalNumber
  }),
  accounts: z.object({
    accountName: z.string().min(1, 'Enter an account name.'),
    accountType: z.string().min(1, 'Choose an account type.'),
    institution: z.string().optional(),
    openingBalance: z.coerce.number()
  }),
  income: z.object({
    incomeType: z.string().min(1, 'Choose an income type.'),
    incomeAmount: positiveAmount,
    incomeFrequency: z.string().min(1, 'Choose a recurring frequency.')
  }),
  savings: z.object({
    emergencyFund: requiredAmount,
    currentSavings: requiredAmount,
    monthlySavings: requiredAmount,
    preferredSavingsPercent: z.coerce.number().min(0, 'Savings percentage cannot be negative.').max(100, 'Savings percentage cannot exceed 100.'),
    savingsAccount: z.string().optional(),
    savingsNotes: z.string().optional()
  }),
  bills: z.object({
    billType: z.string().min(1, 'Choose a bill.'),
    billAmount: requiredAmount,
    billDueDay: z.coerce.number().int('Enter a whole due day.').min(1, 'Due day must be between 1 and 31.').max(31, 'Due day must be between 1 and 31.')
  }),
  goals: z.object({ goalName: z.string().optional(), goalTarget: optionalNumber, goalTargetDate: z.string().optional(), goalPriority: z.string().optional() }),
  debts: z.object({ debtName: z.string().optional(), debtBalance: optionalNumber, debtInterest: optionalNumber, debtMinimumPayment: optionalNumber, debtDueDate: z.string().optional() }),
  assets: z.object({ assetType: z.string().optional(), assetValue: optionalNumber }),
  investments: z.object({ investmentType: z.string().optional(), investmentValue: optionalNumber }),
  insurance: z.object({ insuranceType: z.string().optional(), insuranceCoverage: optionalNumber })
};

export default function OnboardingPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: schema.parse({
      currency: 'USD',
      locale: navigator.language || 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      openingBalance: 0
    })
  });

  const onboardingQuery = useQuery({
    queryKey: user ? queryKeys.onboarding.byUser(user.id) : queryKeys.onboarding.current,
    queryFn: () => OnboardingRepository.getState(user!.id),
    enabled: Boolean(user),
    retry: false
  });

  const currentStep = steps[currentIndex];
  const watchedValues = form.watch();
  const onboardingData = useMemo(() => onboardingQuery.data?.data ?? {}, [onboardingQuery.data?.data]);
  const completedSteps = useMemo(() => new Set(onboardingData.completed_steps ?? []), [onboardingData.completed_steps]);
  const skippedSteps = useMemo(() => new Set(onboardingData.skipped_steps ?? []), [onboardingData.skipped_steps]);
  const currencyCode = watchedValues.currency || onboardingQuery.data?.profile?.currency || 'USD';
  const locale = watchedValues.locale || onboardingQuery.data?.profile?.locale || 'en-US';
  const currencySymbol = getCurrencySymbol(currencyCode, locale);
  const progress = getMandatoryProgress(completedSteps);
  const canContinue = stepValidation[currentStep.id].safeParse(watchedValues).success;
  const isOptionalStep = !currentStep.required;
  const canFinish = mandatoryStepIds.every((stepId) => completedSteps.has(stepId));

  useEffect(() => {
    if (!onboardingQuery.data) return;

    const savedStep = onboardingData.current_step ?? onboardingQuery.data.profile?.onboarding_step;
    const savedIndex = steps.findIndex((step) => step.id === savedStep);
    if (savedIndex >= 0) {
      setCurrentIndex(savedIndex);
    }

    form.reset(getHydratedDefaults(onboardingQuery.data.profile, onboardingData));
  }, [form, onboardingData, onboardingQuery.data]);

  if (!user) return null;

  if (onboardingQuery.isLoading) {
    return <LoadingState label="Loading onboarding" />;
  }

  if (!onboardingQuery.data?.profile) {
    return <EmptyState title="Profile missing" message="Your profile could not be loaded. Please refresh or sign in again." />;
  }

  if (!onboardingQuery.data.household) {
    return <EmptyState title="Household missing" message="Your household workspace could not be loaded. Please refresh and try again." />;
  }

  const profile = onboardingQuery.data.profile;
  const household = onboardingQuery.data.household;

  async function saveStep(mode: 'draft' | 'continue' | 'skip') {
    setMessage(null);
    setError(null);

    try {
      if (!profile) throw new ProfileMissingError('Onboarding profile missing', { userId: user!.id });
      if (!household) throw new HouseholdMissingError('Onboarding household missing', { userId: user!.id });
      if (mode === 'skip' && currentStep.required) throw new ValidationError('Mandatory step cannot be skipped');

      const values = form.getValues();
      let stepData: Record<string, unknown> | Record<string, unknown>[];
      let nextCompletedSteps = [...completedSteps];
      let nextSkippedSteps = [...skippedSteps];

      if (mode === 'continue') {
        validateStep(currentStep.id, values, form);
        stepData = await persistCompletedStep(values, currentStep.id);
        nextCompletedSteps = addUnique(nextCompletedSteps, currentStep.id);
        nextSkippedSteps = nextSkippedSteps.filter((stepId) => stepId !== currentStep.id);
      } else if (mode === 'skip') {
        stepData = { skipped: true, skippedAt: new Date().toISOString() };
        nextSkippedSteps = addUnique(nextSkippedSteps, currentStep.id);
      } else {
        stepData = makeMetadataStep(values, currentStep.id);
      }

      const nextIndex = mode === 'draft' ? currentIndex : Math.min(currentIndex + 1, steps.length - 1);
      const nextStepId = steps[nextIndex]?.id ?? currentStep.id;
      const nextProgress = getMandatoryProgress(new Set(nextCompletedSteps));

      await OnboardingRepository.saveStep({
        userId: user!.id,
        household,
        stepId: currentStep.id,
        stepData,
        nextStepId,
        completedSteps: nextCompletedSteps,
        skippedSteps: nextSkippedSteps,
        progressPercentage: nextProgress,
        completedAt: nextProgress === 100 ? new Date().toISOString() : null
      });

      await onboardingQuery.refetch();
      setMessage(mode === 'draft' ? 'Draft saved.' : mode === 'skip' ? 'Step skipped. You can return anytime.' : 'Progress saved.');
      if (mode !== 'draft') {
        setCurrentIndex(nextIndex);
      }
    } catch (err) {
      Logger.error('Onboarding step save failed', { stepId: currentStep.id, mode, error: err });
      setError(toAppError(err).userMessage);
    }
  }

  async function persistCompletedStep(values: FormValues, stepId: StepId): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    if (stepId === 'personalDetails') {
      const currencyPreferences = {
        ...(isPlainRecord(profile.tax_preferences) ? profile.tax_preferences : {}),
        currency_code: values.currency,
        currency_symbol: getCurrencySymbol(values.currency, values.locale),
        locale: values.locale
      };

      await ProfileRepository.upsertProfile({
        id: user!.id,
        full_name: values.fullName,
        country: values.country,
        currency: values.currency,
        locale: values.locale,
        timezone: values.timezone,
        salary_frequency: values.salaryFrequency,
        family_size: values.familySize,
        tax_preferences: currencyPreferences
      });

      return {
        fullName: values.fullName,
        country: values.country,
        currency_code: values.currency,
        currency_symbol: getCurrencySymbol(values.currency, values.locale),
        locale: values.locale,
        timezone: values.timezone,
        salaryFrequency: values.salaryFrequency,
        familySize: values.familySize
      };
    }

    if (stepId === 'accounts') {
      const account = await AccountsRepository.create({
        household_id: household.id,
        user_id: user!.id,
        name: values.accountName!,
        type: values.accountType as never,
        group_name: accountGroupFromType(values.accountType),
        institution: values.institution || null,
        opening_balance: values.openingBalance,
        currency: currencyCode
      });

      return [...getPersistedStepItems(onboardingData.accounts), account as unknown as Record<string, unknown>];
    }

    if (stepId === 'income') {
      const income = await IncomeSourcesRepository.create({
        household_id: household.id,
        name: values.incomeType!,
        payer: values.incomeType!,
        amount: values.incomeAmount,
        currency: currencyCode,
        frequency: values.incomeFrequency as never
      });

      return [...getPersistedStepItems(onboardingData.income), income as unknown as Record<string, unknown>];
    }

    if (stepId === 'bills') {
      const bill = await BillsRepository.create({
        household_id: household.id,
        name: values.billType!,
        biller: values.billType!,
        amount: values.billAmount ?? 0,
        currency: currencyCode,
        due_day: values.billDueDay
      });

      return [...getPersistedStepItems(onboardingData.bills), bill as unknown as Record<string, unknown>];
    }

    return makeMetadataStep(values, stepId);
  }

  async function finish() {
    setMessage(null);
    setError(null);

    try {
      if (!canFinish) {
        throw new ValidationError('Complete Personal Details, Accounts, Income, Savings, and Bills before finishing onboarding.');
      }

      await OnboardingRepository.finish(user!.id, household, {
        ...onboardingData,
        completed_steps: [...completedSteps],
        skipped_steps: [...skippedSteps],
        progress_percentage: 100,
        completed_at: new Date().toISOString()
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.byUser(user!.id) });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      Logger.error('Onboarding finish failed', { error: err });
      setError(toAppError(err).userMessage);
    }
  }

  return (
    <Page>
      <BrandLogo className="lg:hidden" />
      <PageHeader
        title="Onboarding"
        description="Build your starting financial profile. Mandatory steps control progress; optional sections can be skipped and revisited later."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">
            Step {currentIndex + 1} of {steps.length}: {currentStep.label}
          </div>
          <div className="text-sm text-muted">{progress}% mandatory completion</div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-primary">
          <div className="h-2 rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-10">
          {steps.map((step, index) => {
            const status = getStepStatus(step, index, currentIndex, completedSteps, skippedSteps);
            const locked = !canNavigateToStep(index, completedSteps, currentIndex);
            const displayStatus = locked ? 'Locked' : status;

            return (
              <button
                key={step.id}
                className={stepButtonClass(status, locked)}
                disabled={locked}
                aria-label={`${step.label}: ${displayStatus}`}
                onClick={() => setCurrentIndex(index)}
                title={displayStatus}
                type="button"
              >
                <span>{step.label}</span>
                <span className="mt-1 flex justify-center">
                  <StepStatusIcon status={displayStatus} />
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-5">
        <StepFields currencySymbol={currencySymbol} errors={form.formState.errors} stepId={currentStep.id} form={form} />

        {message ? <div className="text-sm text-success">{message}</div> : null}
        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}>
              Previous
            </Button>
            {isOptionalStep ? (
              <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => saveStep('skip')}>
                Skip
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => saveStep('draft')}>
              Save Draft
            </Button>
            <Button disabled={currentStep.required && !canContinue} onClick={() => saveStep('continue')}>
              Save & Continue
            </Button>
            <Button className="bg-success text-primary hover:bg-success" disabled={!canFinish} onClick={finish}>
              Finish
            </Button>
          </div>
        </div>
      </Card>

      <CsvImportPanel
        onSave={async (payload) => {
          await OnboardingRepository.saveStep({
            userId: user.id,
            household,
            stepId: 'csvImport',
            stepData: payload,
            nextStepId: currentStep.id,
            completedSteps: [...completedSteps],
            skippedSteps: [...skippedSteps],
            progressPercentage: progress
          });
          await onboardingQuery.refetch();
        }}
      />
    </Page>
  );
}

function StepFields({
  stepId,
  form,
  errors,
  currencySymbol
}: {
  stepId: StepId;
  form: UseFormReturn<FormValues>;
  errors: FieldErrors<FormValues>;
  currencySymbol: string;
}) {
  if (stepId === 'personalDetails') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input error={errors.fullName?.message} label="Full name" registration={form.register('fullName')} />
        <Select
          error={errors.country?.message}
          label="Country"
          registration={form.register('country')}
          options={COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.label }))}
        />
        <Select
          error={errors.currency?.message}
          label="Currency"
          registration={form.register('currency')}
          options={CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
        />
        <Input error={errors.locale?.message} label="Locale" registration={form.register('locale')} />
        <Select
          error={errors.timezone?.message}
          label="Timezone"
          registration={form.register('timezone')}
          options={TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz.replaceAll('_', ' ') }))}
        />
        <Select label="Salary frequency" registration={form.register('salaryFrequency')} options={['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual', 'irregular']} />
        <Input error={errors.familySize?.message} label="Family size" type="number" registration={form.register('familySize')} />
      </div>
    );
  }

  if (stepId === 'accounts') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input error={errors.accountName?.message} label="Account name" registration={form.register('accountName')} />
        <Select error={errors.accountType?.message} label="Type" registration={form.register('accountType')} options={['checking', 'savings', 'wallet', 'cash', 'credit_card', 'investment', 'crypto', 'loan']} />
        <Input label="Institution" registration={form.register('institution')} />
        <Input error={errors.openingBalance?.message} label={`Opening balance (${currencySymbol})`} type="number" registration={form.register('openingBalance')} />
      </div>
    );
  }

  if (stepId === 'income') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Select error={errors.incomeType?.message} label="Income type" registration={form.register('incomeType')} options={['Salary', 'Business', 'Freelance', 'Rental', 'Other']} />
        <Input error={errors.incomeAmount?.message} label={`Amount (${currencySymbol})`} type="number" registration={form.register('incomeAmount')} />
        <Select error={errors.incomeFrequency?.message} label="Recurring frequency" registration={form.register('incomeFrequency')} options={['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual', 'irregular']} />
      </div>
    );
  }

  if (stepId === 'savings') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input error={errors.emergencyFund?.message} label={`Emergency fund (${currencySymbol})`} type="number" registration={form.register('emergencyFund')} />
        <Input error={errors.currentSavings?.message} label={`Current savings (${currencySymbol})`} type="number" registration={form.register('currentSavings')} />
        <Input error={errors.monthlySavings?.message} label={`Monthly savings (${currencySymbol})`} type="number" registration={form.register('monthlySavings')} />
        <Input error={errors.preferredSavingsPercent?.message} label="Preferred savings %" type="number" registration={form.register('preferredSavingsPercent')} />
        <Input label="Savings account" registration={form.register('savingsAccount')} />
        <Input label="Optional notes" registration={form.register('savingsNotes')} />
      </div>
    );
  }

  if (stepId === 'bills') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Select error={errors.billType?.message} label="Bill" registration={form.register('billType')} options={['Rent', 'Mortgage', 'Electricity', 'Internet', 'Insurance', 'Phone', 'Streaming', 'Custom']} />
        <Input error={errors.billAmount?.message} label={`Amount (${currencySymbol})`} type="number" registration={form.register('billAmount')} />
        <Input error={errors.billDueDay?.message} label="Due day" type="number" registration={form.register('billDueDay')} />
      </div>
    );
  }

  if (stepId === 'goals') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Goal" registration={form.register('goalName')} />
        <Input label={`Target (${currencySymbol})`} type="number" registration={form.register('goalTarget')} />
        <Input label="Target date" type="date" registration={form.register('goalTargetDate')} />
        <Select label="Priority" registration={form.register('goalPriority')} options={['low', 'medium', 'high']} />
      </div>
    );
  }

  if (stepId === 'debts') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Debt name" registration={form.register('debtName')} />
        <Input label={`Balance (${currencySymbol})`} type="number" registration={form.register('debtBalance')} />
        <Input label="Interest" type="number" registration={form.register('debtInterest')} />
        <Input label={`Minimum payment (${currencySymbol})`} type="number" registration={form.register('debtMinimumPayment')} />
        <Input label="Due date" type="date" registration={form.register('debtDueDate')} />
      </div>
    );
  }

  if (stepId === 'assets') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Asset" registration={form.register('assetType')} options={['Property', 'Vehicle', 'Cash', 'Gold', 'Crypto', 'Other']} />
        <Input label={`Estimated value (${currencySymbol})`} type="number" registration={form.register('assetValue')} />
      </div>
    );
  }

  if (stepId === 'investments') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Investment" registration={form.register('investmentType')} options={['Stocks', 'ETF', 'Mutual Funds', 'Crypto', 'Gold']} />
        <Input label={`Estimated value (${currencySymbol})`} type="number" registration={form.register('investmentValue')} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Insurance type" registration={form.register('insuranceType')} />
      <Input label={`Coverage amount (${currencySymbol})`} type="number" registration={form.register('insuranceCoverage')} />
    </div>
  );
}

function CsvImportPanel({ onSave }: { onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [preview, setPreview] = useState<CsvPreviewRow[]>([]);
  const [summary, setSummary] = useState<CsvSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('PDF import is not supported.');
      return;
    }

    const parsed = parseCsv(await file.text());
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setPreview([]);
    setSummary(null);
    setMessage(`${parsed.rows.length} CSV rows loaded.`);
  }

  function generatePreview() {
    const result = buildCsvPreview(rows, mapping);
    setPreview(result.preview);
    setSummary(result.summary);
  }

  async function saveSummary() {
    await onSave({
      mapping,
      summary,
      preview: preview.slice(0, 25)
    });
    setMessage('CSV import summary saved.');
  }

  return (
    <Card className="space-y-4">
      <PageHeader title="CSV Import" description="Upload a CSV, map columns, preview rows, detect duplicates, and save an import summary. PDF import is intentionally disabled." />
      <input className="input" type="file" accept=".csv,text/csv" onChange={(event) => loadFile(event.target.files?.[0])} />

      {headers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {(['date', 'description', 'amount', 'category'] as const).map((field) => (
            <label key={field}>
              <span className="text-sm capitalize text-muted">{field}</span>
              <select className="select mt-1" value={mapping[field] ?? ''} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}>
                <option value="">Choose column</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" disabled={rows.length === 0} onClick={generatePreview}>
          Preview
        </Button>
        <Button disabled={!summary} onClick={saveSummary}>
          Save Import Summary
        </Button>
      </div>

      {message ? <div className="text-sm text-muted">{message}</div> : null}
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Card>Total: {summary.totalRows}</Card>
          <Card>Valid: {summary.validRows}</Card>
          <Card>Duplicates: {summary.duplicateRows}</Card>
          <Card>Invalid: {summary.invalidRows}</Card>
        </div>
      ) : null}

      {preview.length > 0 ? (
        <Table>
          <thead>
            <tr className="text-left text-muted">
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preview.slice(0, 10).map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-3 py-2">{row.rowNumber}</td>
                <td className="px-3 py-2">{row.normalized.date}</td>
                <td className="px-3 py-2">{row.normalized.description}</td>
                <td className="px-3 py-2">{row.normalized.amount}</td>
                <td className="px-3 py-2">{row.duplicate ? 'Duplicate' : row.errors.length ? row.errors.join(', ') : 'Valid'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </Card>
  );
}

function Input({
  label,
  registration,
  type = 'text',
  error
}: {
  label: string;
  registration: UseFormRegisterReturn;
  type?: string;
  error?: string;
}) {
  return (
    <label>
      <span className="text-sm text-muted">{label}</span>
      <input className="input mt-1" type={type} {...registration} />
      {error ? <div className="mt-1 text-xs text-destructive">{error}</div> : null}
    </label>
  );
}

function Select({
  label,
  registration,
  options,
  error
}: {
  label: string;
  registration: UseFormRegisterReturn;
  options: Array<string | { value: string; label: string }>;
  error?: string;
}) {
  return (
    <label>
      <span className="text-sm text-muted">{label}</span>
      <select className="select mt-1" {...registration}>
        <option value="">Choose</option>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          );
        })}
      </select>
      {error ? <div className="mt-1 text-xs text-destructive">{error}</div> : null}
    </label>
  );
}

function validateStep(stepId: StepId, values: FormValues, form: UseFormReturn<FormValues>) {
  const result = stepValidation[stepId].safeParse(values);
  if (result.success) return;

  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FormValues | undefined;
    if (field) {
      form.setError(field, { type: 'manual', message: issue.message });
    }
  }

  throw new ValidationError(`${steps.find((step) => step.id === stepId)?.label ?? 'Step'} validation failed`, result.error);
}

function makeMetadataStep(values: FormValues, stepId: StepId): Record<string, unknown> {
  if (stepId === 'personalDetails') {
    return {
      fullName: values.fullName,
      country: values.country,
      currency_code: values.currency,
      currency_symbol: getCurrencySymbol(values.currency, values.locale),
      locale: values.locale,
      timezone: values.timezone,
      salaryFrequency: values.salaryFrequency,
      familySize: values.familySize
    };
  }

  if (stepId === 'accounts') {
    return { accountName: values.accountName, accountType: values.accountType, institution: values.institution, openingBalance: values.openingBalance };
  }

  if (stepId === 'income') {
    return { incomeType: values.incomeType, incomeAmount: values.incomeAmount, incomeFrequency: values.incomeFrequency };
  }

  if (stepId === 'savings') {
    return {
      emergencyFund: values.emergencyFund,
      currentSavings: values.currentSavings,
      monthlySavings: values.monthlySavings,
      preferredSavingsPercent: values.preferredSavingsPercent,
      savingsAccount: values.savingsAccount,
      notes: values.savingsNotes
    };
  }

  if (stepId === 'bills') {
    return { billType: values.billType, billAmount: values.billAmount, billDueDay: values.billDueDay };
  }

  if (stepId === 'goals') {
    return { goal: values.goalName, target: values.goalTarget, targetDate: values.goalTargetDate, priority: values.goalPriority };
  }

  if (stepId === 'debts') {
    return {
      name: values.debtName,
      balance: values.debtBalance,
      interest: values.debtInterest,
      minimumPayment: values.debtMinimumPayment,
      dueDate: values.debtDueDate
    };
  }

  if (stepId === 'assets') {
    return { type: values.assetType, value: values.assetValue };
  }

  if (stepId === 'investments') {
    return { type: values.investmentType, value: values.investmentValue };
  }

  return { type: values.insuranceType, coverage: values.insuranceCoverage };
}

function getHydratedDefaults(profile: Awaited<ReturnType<typeof OnboardingRepository.getState>>['profile'], data: Awaited<ReturnType<typeof OnboardingRepository.getState>>['data']): FormValues {
  const personalDetails = isPlainRecord(data.personalDetails) ? data.personalDetails : {};
  const account = getLatestStepRecord(data.accounts);
  const income = getLatestStepRecord(data.income);
  const bill = getLatestStepRecord(data.bills);
  const savings = isPlainRecord(data.savings) ? data.savings : {};

  return {
    fullName: (personalDetails.fullName as string | undefined) ?? profile?.full_name ?? '',
    country: normalizeCountry((personalDetails.country as string | undefined) ?? profile?.country),
    currency: normalizeCurrencyCode((personalDetails.currency_code as string | undefined) ?? profile?.currency),
    locale: (personalDetails.locale as string | undefined) ?? profile?.locale ?? navigator.language ?? 'en-US',
    timezone: normalizeTimezone((personalDetails.timezone as string | undefined) ?? profile?.timezone),
    salaryFrequency: (personalDetails.salaryFrequency as string | undefined) ?? profile?.salary_frequency ?? '',
    familySize: (personalDetails.familySize as number | undefined) ?? profile?.family_size ?? undefined,
    accountName: (account.name as string | undefined) ?? (account.accountName as string | undefined) ?? '',
    accountType: (account.type as string | undefined) ?? (account.accountType as string | undefined) ?? '',
    institution: (account.institution as string | undefined) ?? '',
    openingBalance: (account.opening_balance as number | undefined) ?? (account.openingBalance as number | undefined) ?? 0,
    incomeType: (income.name as string | undefined) ?? (income.incomeType as string | undefined) ?? '',
    incomeAmount: (income.amount as number | undefined) ?? (income.incomeAmount as number | undefined),
    incomeFrequency: (income.frequency as string | undefined) ?? (income.incomeFrequency as string | undefined) ?? '',
    billType: (bill.name as string | undefined) ?? (bill.billType as string | undefined) ?? '',
    billAmount: (bill.amount as number | undefined) ?? (bill.billAmount as number | undefined),
    billDueDay: (bill.due_day as number | undefined) ?? (bill.billDueDay as number | undefined),
    emergencyFund: savings.emergencyFund as number | undefined,
    currentSavings: savings.currentSavings as number | undefined,
    monthlySavings: savings.monthlySavings as number | undefined,
    preferredSavingsPercent: savings.preferredSavingsPercent as number | undefined,
    savingsAccount: (savings.savingsAccount as string | undefined) ?? '',
    savingsNotes: (savings.notes as string | undefined) ?? '',
    goalName: '',
    goalTarget: undefined,
    goalTargetDate: '',
    goalPriority: '',
    debtName: '',
    debtBalance: undefined,
    debtInterest: undefined,
    debtMinimumPayment: undefined,
    debtDueDate: '',
    assetType: '',
    assetValue: undefined,
    investmentType: '',
    investmentValue: undefined,
    insuranceType: '',
    insuranceCoverage: undefined
  };
}

function normalizeCurrencyCode(value: string | null | undefined): string {
  const code = (value || 'USD').toUpperCase();
  return currencyCodes.includes(code) ? code : 'USD';
}

function normalizeCountry(value: string | null | undefined): string {
  const code = (value || '').toUpperCase();
  if (COUNTRY_OPTIONS.some((c) => c.code === code)) return code;
  if (value) return 'OTHER';
  return 'US';
}

function normalizeTimezone(value: string | null | undefined): string {
  const tz = value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return TIMEZONE_OPTIONS.includes(tz) ? tz : TIMEZONE_OPTIONS[0] ?? 'UTC';
}

function getCurrencySymbol(currency: string, locale: string) {
  try {
    const symbol = new Intl.NumberFormat(locale || 'en-US', { style: 'currency', currency: currency || 'USD' })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value;
    return symbol ?? currency;
  } catch {
    return currency || 'USD';
  }
}

function getMandatoryProgress(completedSteps: Set<string>) {
  const completedMandatory = mandatoryStepIds.filter((stepId) => completedSteps.has(stepId)).length;
  return Math.round((completedMandatory / mandatoryStepIds.length) * 100);
}

function canNavigateToStep(targetIndex: number, completedSteps: Set<string>, currentIndex: number) {
  if (targetIndex <= currentIndex) return true;
  const targetStep = steps[targetIndex];
  if (completedSteps.has(targetStep.id)) return true;
  return steps.slice(0, targetIndex).filter((step) => step.required).every((step) => completedSteps.has(step.id));
}

function getStepStatus(step: (typeof steps)[number], index: number, currentIndex: number, completedSteps: Set<string>, skippedSteps: Set<string>) {
  if (index === currentIndex) return 'Current';
  if (completedSteps.has(step.id)) return 'Completed';
  if (skippedSteps.has(step.id)) return 'Skipped';
  return step.required ? 'Upcoming' : 'Optional';
}

function stepButtonClass(status: string, locked: boolean) {
  if (locked) return 'rounded-md bg-surface-muted px-2 py-2 text-xs text-muted opacity-60';
  if (status === 'Current') return 'rounded-md bg-accent px-2 py-2 text-xs text-white';
  if (status === 'Completed') return 'rounded-md bg-success px-2 py-2 text-xs text-primary';
  if (status === 'Skipped') return 'rounded-md border border-border bg-transparent px-2 py-2 text-xs text-muted hover:bg-secondary hover:text-white';
  return 'rounded-md bg-surface-muted px-2 py-2 text-xs text-muted transition hover:bg-secondary hover:text-white';
}

function StepStatusIcon({ status }: { status: string }) {
  const className = 'h-4 w-4';

  if (status === 'Locked') {
    return (
      <>
        <Lock aria-hidden className={className} />
        <span className="sr-only">Locked</span>
      </>
    );
  }

  if (status === 'Current') {
    return (
      <>
        <CircleDot aria-hidden className={className} />
        <span className="sr-only">Current</span>
      </>
    );
  }

  if (status === 'Completed') {
    return (
      <>
        <CheckCircle2 aria-hidden className={className} />
        <span className="sr-only">Completed</span>
      </>
    );
  }

  if (status === 'Skipped') {
    return (
      <>
        <SkipForward aria-hidden className={className} />
        <span className="sr-only">Skipped</span>
      </>
    );
  }

  if (status === 'Optional') {
    return (
      <>
        <CircleDashed aria-hidden className={className} />
        <span className="sr-only">Optional</span>
      </>
    );
  }

  return (
    <>
      <Clock3 aria-hidden className={className} />
      <span className="sr-only">Upcoming</span>
    </>
  );
}

function addUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getLatestStepRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    const latest = value.at(-1);
    return isPlainRecord(latest) ? latest : {};
  }

  return isPlainRecord(value) ? value : {};
}

function getPersistedStepItems(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isPlainRecord);
  }

  if (isPlainRecord(value) && typeof value.id === 'string') {
    return [value];
  }

  return [];
}

function accountGroupFromType(type?: string) {
  if (type === 'cash') return 'cash';
  if (type === 'credit_card') return 'credit_card';
  if (type === 'investment' || type === 'crypto') return 'investment';
  if (type === 'loan') return 'loan';
  if (type === 'wallet') return 'wallet';
  return 'bank';
}
