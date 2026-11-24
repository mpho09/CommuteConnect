import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, MailWarning, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { ErrorState, LoadingList } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import type { Me, OperatorApplication } from '../../lib/api/types'
import { sessionQueryKey, useSession } from '../../lib/session/session'
import { toFieldErrors } from '../auth/schemas'
import { DOCUMENTS } from './documents'

const MAX_DESCRIPTION = 600

const applicationSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Enter your business or association name.')
    .max(120, 'Use 120 characters or fewer.'),
  description: z
    .string()
    .trim()
    .min(20, 'Describe your service in at least 20 characters.')
    .max(MAX_DESCRIPTION, `Use ${MAX_DESCRIPTION} characters or fewer.`),
  contactEmail: z
    .string()
    .trim()
    .min(1, 'Enter a contact email.')
    .pipe(z.email('Enter a valid email address, like bookings@example.co.za.')),
  serviceArea: z
    .string()
    .trim()
    .min(2, 'Describe where you operate.')
    .max(120, 'Use 120 characters or fewer.'),
})

type FieldName = keyof OperatorApplication
const ID: Record<FieldName, string> = {
  businessName: 'op-business-name',
  description: 'op-description',
  contactEmail: 'op-contact-email',
  serviceArea: 'op-service-area',
}

/** S15 Operator Setup (PRD US9, F6): business profile and service details. */
export function OperatorSetupPage() {
  const api = useApi()
  const { user } = useSession()
  const operator = useQuery({ queryKey: ['operator', 'mine'], queryFn: () => api.getMyOperator() })

  if (!user || operator.isPending) {
    return (
      <Shell>
        <LoadingList count={1} label="Loading…" />
      </Shell>
    )
  }
  if (operator.isError) {
    return (
      <Shell>
        <ErrorState onRetry={() => void operator.refetch()} />
      </Shell>
    )
  }
  // One operator profile per user: continue where they left off.
  if (operator.data) return <Navigate to="/operator/verification" replace />

  return (
    <Shell>
      <header className="mb-space-lg">
        <p className="text-label-md font-label-md uppercase tracking-wider text-secondary">
          Step 1 of 2 · Business profile
        </p>
        <h1 className="mt-space-xs text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
          List your transport service
        </h1>
        <p className="mt-space-xs text-body-lg text-on-surface-variant">
          Tell us about your business. Next you’ll upload documents so an admin can verify you. Your
          routes go live once you’re verified.
        </p>
      </header>
      {user.emailVerified ? (
        <ApplicationForm user={user} />
      ) : (
        <p
          role="note"
          className="flex items-start gap-space-sm rounded-xl border border-accent/40 bg-accent/10 p-space-md text-body-md"
        >
          <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <strong>Verify your email to apply as an operator.</strong> We sent a link to{' '}
            {user.email}.
          </span>
        </p>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-margin-mobile py-space-xl md:px-margin">{children}</div>
  )
}

function ApplicationForm({ user }: { user: Me }) {
  const api = useApi()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<OperatorApplication>({
    businessName: '',
    description: '',
    contactEmail: user.email,
    serviceArea: '',
  })
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const apply = useMutation({
    mutationFn: (input: OperatorApplication) => api.applyAsOperator(input),
    onSuccess: async () => {
      // Applying adds the operator role, so refresh the session too.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operator', 'mine'] }),
        queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
      ])
      toast.success('Business profile saved', 'Now upload your documents for verification.')
      await navigate('/operator/verification')
    },
    onError: (e) => {
      const err = isApiError(e) ? e : new ApiError('server_error')
      if (Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors)
      else setFormError(err.message)
      setAttempt((n) => n + 1)
    },
  })

  function set(key: FieldName, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const parsed = applicationSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(toFieldErrors<FieldName>(parsed.error))
      setAttempt((n) => n + 1)
      return
    }
    setErrors({})
    apply.mutate(parsed.data)
  }

  const summary = [
    ...(formError ? [{ message: formError }] : []),
    ...(Object.keys(ID) as FieldName[])
      .filter((k) => errors[k])
      .map((k) => ({ fieldId: ID[k], message: errors[k] })),
  ]

  return (
    <div className="grid gap-space-lg lg:grid-cols-[1fr_20rem] lg:items-start">
      <Card>
        <form
          onSubmit={onSubmit}
          noValidate
          aria-label="Business profile"
          className="flex flex-col gap-space-lg"
        >
          <ErrorSummary errors={summary} focusKey={attempt} />
          <Field
            id={ID.businessName}
            label="Business or association name"
            hint="As registered with CIPC or in your association’s constitution. Shown to commuters."
            error={errors.businessName}
            required
          >
            {(c) => (
              <Input
                {...c}
                autoComplete="organization"
                value={values.businessName}
                onChange={(e) => set('businessName', e.target.value)}
              />
            )}
          </Field>
          <Field
            id={ID.description}
            label="About your service"
            hint={`What you run, where from and when. ${values.description.length}/${MAX_DESCRIPTION}`}
            error={errors.description}
            required
          >
            {(c) => (
              <Textarea
                {...c}
                maxLength={MAX_DESCRIPTION}
                placeholder="e.g. Minibus taxis from Tembisa rank to Midrand and Sandton, weekdays 05:00–19:00."
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
              />
            )}
          </Field>
          <div className="grid gap-space-md sm:grid-cols-2">
            <Field
              id={ID.contactEmail}
              label="Contact email"
              hint="For CommuteConnect and enquiry notifications. Not shown publicly."
              error={errors.contactEmail}
              required
            >
              {(c) => (
                <Input
                  {...c}
                  type="email"
                  autoComplete="email"
                  value={values.contactEmail}
                  onChange={(e) => set('contactEmail', e.target.value)}
                />
              )}
            </Field>
            <Field
              id={ID.serviceArea}
              label="Service area"
              hint="e.g. Tembisa, Midrand and Sandton"
              error={errors.serviceArea}
              required
            >
              {(c) => (
                <Input
                  {...c}
                  value={values.serviceArea}
                  onChange={(e) => set('serviceArea', e.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={apply.isPending}>
              {apply.isPending ? 'Saving…' : 'Save and continue to documents'}
              {!apply.isPending && <ArrowRight aria-hidden className="size-4" />}
            </Button>
          </div>
        </form>
      </Card>

      <aside className="flex flex-col gap-space-md rounded-2xl bg-surface-container-low p-space-md">
        <h2 className="text-title-md font-title-md">What you’ll need next</h2>
        <ul className="flex flex-col gap-space-sm text-body-md">
          {DOCUMENTS.map((d) => (
            <li key={d.type}>
              <strong>{d.label}</strong>
              {!d.required && <span className="text-on-surface-variant"> (recommended)</span>}
              <span className="block text-on-surface-variant">{d.description}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-space-sm text-body-sm text-on-surface-variant">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-secondary" />
          Documents are private. Only CommuteConnect admins reviewing your application can see them.
        </p>
      </aside>
    </div>
  )
}
