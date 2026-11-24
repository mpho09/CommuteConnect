import { useMutation } from '@tanstack/react-query'
import { CircleCheck, LinkIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Field } from '../../components/ui/Field'
import { useApi } from '../../lib/api/apiContext'
import { ApiError, isApiError } from '../../lib/api/errors'
import { AuthHeading } from './AuthLayout'
import { PasswordInput } from './PasswordInput'
import { resetPasswordSchema, toFieldErrors, type FieldErrors } from './schemas'

type FieldName = 'password' | 'confirmPassword'

const ID: Record<FieldName, string> = {
  password: 'reset-password',
  confirmPassword: 'reset-confirm-password',
}

/** Choose a new password from the emailed link (`?token=`). */
export function ResetPasswordPage() {
  const api = useApi()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<FieldName>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const reset = useMutation({
    mutationFn: () => api.resetPassword(token, password),
    onError: (e) => {
      const err = isApiError(e) ? e : new ApiError('server_error')
      if (err.code === 'validation') setErrors(err.fieldErrors as FieldErrors<FieldName>)
      else setFormError(err.message)
      setAttempt((n) => n + 1)
    },
  })

  const linkInvalid =
    !token || (isApiError(reset.error) && reset.error.code === 'reset_link_invalid')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      setErrors(toFieldErrors<FieldName>(parsed.error))
      setAttempt((n) => n + 1)
      return
    }
    setErrors({})
    reset.mutate()
  }

  let content
  if (reset.isSuccess) {
    content = (
      <Notice
        icon={CircleCheck}
        title="Password updated"
        text="You can now log in with your new password."
        action={
          <ButtonLink to="/login" size="lg" fullWidth>
            Log in
          </ButtonLink>
        }
      />
    )
  } else if (linkInvalid) {
    content = (
      <Notice
        icon={LinkIcon}
        title="This reset link doesn’t work"
        text="It may have expired or already been used. Request a new link to reset your password."
        action={
          <ButtonLink to="/forgot-password" size="lg" fullWidth>
            Request a new link
          </ButtonLink>
        }
      />
    )
  } else {
    const summary = [
      ...(formError ? [{ message: formError }] : []),
      ...(['password', 'confirmPassword'] as const)
        .filter((k) => errors[k])
        .map((k) => ({ fieldId: ID[k], message: errors[k] })),
    ]
    content = (
      <>
        <AuthHeading
          title="Choose a new password"
          intro="Use at least 8 characters, with an uppercase letter and a number or symbol."
        />
        <Card>
          <form
            onSubmit={onSubmit}
            noValidate
            aria-label="Choose a new password"
            className="flex flex-col gap-space-lg"
          >
            <ErrorSummary errors={summary} focusKey={attempt} />
            <Field id={ID.password} label="New password" error={errors.password} required>
              {(control) => (
                <PasswordInput
                  {...control}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            <Field
              id={ID.confirmPassword}
              label="Confirm new password"
              error={errors.confirmPassword}
              required
            >
              {(control) => (
                <PasswordInput
                  {...control}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" size="lg" fullWidth loading={reset.isPending}>
              {reset.isPending ? 'Saving…' : 'Save new password'}
            </Button>
          </form>
        </Card>
      </>
    )
  }

  return (
    <div className="flex justify-center px-margin-mobile py-space-xl md:px-margin">
      <div className="w-full max-w-lg">{content}</div>
    </div>
  )
}

function Notice({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof CircleCheck
  title: string
  text: string
  action: ReactNode
}) {
  return (
    <Card className="text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary-container/50 text-secondary">
        <Icon aria-hidden className="size-7" />
      </span>
      <h1 className="mt-space-md text-headline-lg font-headline-lg">{title}</h1>
      <p role="status" className="mt-space-sm text-body-lg text-on-surface-variant">
        {text}
      </p>
      <div className="mt-space-lg">{action}</div>
    </Card>
  )
}
