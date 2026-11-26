import { useMutation } from '@tanstack/react-query'
import { Bus, CarFront, ExternalLink, LogOut, MailCheck, MailWarning, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { DayPicker } from '../../components/DayPicker'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Checkbox, Field, Input } from '../../components/ui/Field'
import { LoadingList } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast/toastContext'
import { useApi } from '../../lib/api/apiContext'
import { isApiError } from '../../lib/api/errors'
import type { Me, MeUpdate } from '../../lib/api/types'
import { useSession, useSignOut } from '../../lib/session/session'
import { toFieldErrors } from '../auth/schemas'
import { useSetSessionUser } from '../auth/useSetSessionUser'
import { PlacePicker, type PlaceRef } from '../search/PlacePicker'
import { usePlaceRef } from '../search/usePlaceRef'
import { personalSchema, preferencesSchema } from '../setup/schemas'
import { DeleteAccountModal } from './DeleteAccountModal'

type Errors = Record<string, string | undefined>

/** S20 Profile & Settings (PRD US3, §12.4). */
export function SettingsPage() {
  const { user } = useSession()
  const origin = usePlaceRef(user?.preferences.usualOriginId ?? null)
  const destination = usePlaceRef(user?.preferences.usualDestinationId ?? null)

  return (
    <div className="mx-auto max-w-3xl px-margin-mobile py-space-xl md:px-margin">
      <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
        Profile and settings
      </h1>
      <p className="mt-space-xs text-body-lg text-on-surface-variant">
        Manage your details, preferences and account.
      </p>
      <div className="mt-space-lg flex flex-col gap-space-lg">
        {!user || origin.isLoading || destination.isLoading ? (
          <LoadingList count={3} label="Loading your settings…" />
        ) : (
          <Sections user={user} origin={origin.place} destination={destination.place} />
        )}
      </div>
    </div>
  )
}

/** Saves a partial profile update, refreshing the session on success. */
function useSaveMe(onFieldErrors: (e: Errors) => void) {
  const api = useApi()
  const toast = useToast()
  const setSessionUser = useSetSessionUser()
  return useMutation({
    mutationFn: (update: MeUpdate) => api.updateMe(update),
    onSuccess: (me) => {
      setSessionUser(me)
      toast.success('Changes saved')
    },
    onError: (e) => {
      if (isApiError(e) && Object.keys(e.fieldErrors).length) onFieldErrors(e.fieldErrors)
      else toast.error('Changes not saved', isApiError(e) ? e.message : 'Try again.')
    },
  })
}

function Sections({
  user,
  origin,
  destination,
}: {
  user: Me
  origin: PlaceRef | null
  destination: PlaceRef | null
}) {
  const signOut = useSignOut()
  const [deleting, setDeleting] = useState(false)
  return (
    <>
      <PersonalDetails user={user} />
      {user.roles.includes('commuter') && (
        <Commute user={user} origin={origin} destination={destination} />
      )}
      <Notifications user={user} />

      <Section title="Account">
        <dl className="grid gap-space-md sm:grid-cols-2">
          <div>
            <dt className="text-body-sm text-on-surface-variant">Account type</dt>
            <dd className="mt-space-xs flex flex-wrap gap-space-sm">
              {user.roles.includes('commuter') && (
                <span className="inline-flex items-center gap-space-xs text-body-lg">
                  <CarFront aria-hidden className="size-4 text-secondary" /> Commuter
                </span>
              )}
              {user.roles.includes('operator') && (
                <span className="inline-flex items-center gap-space-xs text-body-lg">
                  <Bus aria-hidden className="size-4 text-secondary" /> Transport operator
                </span>
              )}
              {user.roles.includes('admin') && <span className="text-body-lg">Admin</span>}
            </dd>
          </div>
        </dl>
        {!user.roles.includes('operator') && !user.roles.includes('admin') && (
          <p className="mt-space-md text-body-md text-on-surface-variant">
            Run a transport service?{' '}
            <Link to="/operator/setup" className="font-label-lg text-secondary hover:underline">
              Set up an operator profile
            </Link>
          </p>
        )}
        <ul className="mt-space-md flex flex-wrap gap-x-space-lg gap-y-space-sm text-body-md">
          <li>
            <Link
              to="/terms"
              className="inline-flex items-center gap-space-xs text-secondary hover:underline"
            >
              Terms of Service <ExternalLink aria-hidden className="size-3.5" />
            </Link>
          </li>
          <li>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-space-xs text-secondary hover:underline"
            >
              Privacy Notice <ExternalLink aria-hidden className="size-3.5" />
            </Link>
          </li>
        </ul>
        <Button variant="outline" className="mt-space-md" onClick={signOut}>
          <LogOut aria-hidden className="size-4" />
          Log out
        </Button>
      </Section>

      <section
        aria-labelledby="danger-zone"
        className="rounded-2xl border border-error/30 bg-error/5 p-space-md md:p-space-lg"
      >
        <h2 id="danger-zone" className="text-headline-sm font-headline-sm text-error">
          Delete account
        </h2>
        <p className="mt-space-xs text-body-md">
          Permanently delete your account and personal details. Some anonymised records are kept
          where the law or other people’s safety requires it.
        </p>
        <Button variant="destructive" className="mt-space-md" onClick={() => setDeleting(true)}>
          <Trash2 aria-hidden className="size-4" />
          Delete my account
        </Button>
      </section>
      <DeleteAccountModal user={user} open={deleting} onClose={() => setDeleting(false)} />
    </>
  )
}

function Section({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: ReactNode
}) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <Card>
      <section aria-labelledby={id}>
        <h2 id={id} className="text-headline-sm font-headline-sm">
          {title}
        </h2>
        {intro && <p className="mt-space-xs text-body-md text-on-surface-variant">{intro}</p>}
        <div className="mt-space-md">{children}</div>
      </section>
    </Card>
  )
}

function SaveRow({ saving, dirty }: { saving: boolean; dirty: boolean }) {
  return (
    <div className="mt-space-md flex justify-end">
      <Button type="submit" loading={saving} disabled={!dirty}>
        Save
      </Button>
    </div>
  )
}

function PersonalDetails({ user }: { user: Me }) {
  const [values, setValues] = useState({ fullName: user.fullName, phone: user.phone ?? '' })
  const [errors, setErrors] = useState<Errors>({})
  const save = useSaveMe(setErrors)
  const dirty = values.fullName !== user.fullName || values.phone !== (user.phone ?? '')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = personalSchema.safeParse(values)
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error))
    setErrors({})
    save.mutate({ fullName: parsed.data.fullName, phone: parsed.data.phone || null })
  }

  return (
    <Section title="Personal details">
      <form onSubmit={onSubmit} noValidate aria-label="Personal details">
        <div className="grid gap-space-md sm:grid-cols-2">
          <Field
            label="Full name"
            hint="Others see your first name and initial."
            error={errors.fullName}
            required
          >
            {(c) => (
              <Input
                {...c}
                autoComplete="name"
                value={values.fullName}
                onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
              />
            )}
          </Field>
          <Field label="Phone number" optional hint="Never shown publicly." error={errors.phone}>
            {(c) => (
              <Input
                {...c}
                type="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              />
            )}
          </Field>
        </div>
        <div className="mt-space-md">
          <p className="text-body-sm text-on-surface-variant">Email</p>
          <p className="flex flex-wrap items-center gap-space-sm text-body-lg">
            {user.email}
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-space-xs text-body-sm text-success">
                <MailCheck aria-hidden className="size-4" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-space-xs text-body-sm text-warning">
                <MailWarning aria-hidden className="size-4" /> Not verified: check your inbox
              </span>
            )}
          </p>
        </div>
        <SaveRow saving={save.isPending} dirty={dirty} />
      </form>
    </Section>
  )
}

function Commute({
  user,
  origin,
  destination,
}: {
  user: Me
  origin: PlaceRef | null
  destination: PlaceRef | null
}) {
  const initial = {
    origin,
    destination,
    departureTime: user.preferences.usualDepartureTime ?? '',
    travelDays: user.preferences.travelDays,
  }
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const save = useSaveMe(setErrors)
  const dirty =
    values.origin?.id !== initial.origin?.id ||
    values.destination?.id !== initial.destination?.id ||
    values.departureTime !== initial.departureTime ||
    values.travelDays.join() !== initial.travelDays.join()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = preferencesSchema.safeParse({
      ...values,
      notifyByEmail: user.preferences.notifyByEmail,
    })
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error))
    setErrors({})
    save.mutate({
      preferences: {
        ...user.preferences,
        usualOriginId: values.origin?.id ?? null,
        usualDestinationId: values.destination?.id ?? null,
        usualDepartureTime: values.departureTime || null,
        travelDays: values.travelDays,
      },
    })
  }

  return (
    <Section
      title="Usual commute"
      intro="Used to prefill searches and suggest possible matches. Choose public areas, not your home address."
    >
      <form
        onSubmit={onSubmit}
        noValidate
        aria-label="Usual commute"
        className="flex flex-col gap-space-md"
      >
        <div className="grid gap-space-md md:grid-cols-2">
          <PlacePicker
            label="Usual pickup area"
            value={values.origin}
            onChange={(p) =>
              setValues((v) => ({ ...v, origin: p && { id: p.id, label: p.label } }))
            }
            error={errors.origin}
          />
          <PlacePicker
            label="Usual destination"
            value={values.destination}
            onChange={(p) =>
              setValues((v) => ({ ...v, destination: p && { id: p.id, label: p.label } }))
            }
            error={errors.destination}
          />
        </div>
        <Field label="Usual departure time (SAST)" optional className="md:max-w-xs">
          {(c) => (
            <Input
              {...c}
              type="time"
              value={values.departureTime}
              onChange={(e) => setValues((v) => ({ ...v, departureTime: e.target.value }))}
            />
          )}
        </Field>
        <DayPicker
          legend="Travel days"
          value={values.travelDays}
          onChange={(travelDays) => setValues((v) => ({ ...v, travelDays }))}
        />
        <SaveRow saving={save.isPending} dirty={dirty} />
      </form>
    </Section>
  )
}

function Notifications({ user }: { user: Me }) {
  const save = useSaveMe(() => {})
  return (
    <Section title="Notifications" intro="You’ll always see notifications in the app.">
      <Checkbox
        label="Email me about my requests, journeys and listings"
        description="Request decisions, enquiry replies, journey changes and verification updates."
        checked={user.preferences.notifyByEmail}
        disabled={save.isPending}
        onChange={(e) =>
          save.mutate({ preferences: { ...user.preferences, notifyByEmail: e.target.checked } })
        }
      />
    </Section>
  )
}
