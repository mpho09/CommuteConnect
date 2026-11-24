import { ArrowDownUp, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { sastToday } from '../../lib/time'
import { PlacePicker, type PlaceRef } from './PlacePicker'
import { toSearchUrl, type SearchQuery } from './searchQuery'
import { validateSearch, type SearchErrors } from './validateSearch'

const FREQUENCIES: Array<{ value: SearchQuery['frequency']; label: string }> = [
  { value: 'once_off', label: 'Once-off trip' },
  { value: 'recurring', label: 'Recurring commute' },
]

/**
 * Journey search form (PRD §8.3, used on S1 and S6). Submitting goes to
 * Search Results with the criteria in the URL.
 */
export function SearchForm({
  initial,
  now = () => new Date(),
  className,
}: {
  initial?: Partial<SearchQuery>
  now?: () => Date
  className?: string
}) {
  const navigate = useNavigate()
  const [origin, setOrigin] = useState<PlaceRef | null>(initial?.origin ?? null)
  const [destination, setDestination] = useState<PlaceRef | null>(initial?.destination ?? null)
  const [date, setDate] = useState(initial?.date ?? sastToday(now()))
  const [time, setTime] = useState(initial?.time ?? '')
  const [frequency, setFrequency] = useState<SearchQuery['frequency']>(
    initial?.frequency ?? 'once_off',
  )
  const [errors, setErrors] = useState<SearchErrors>({})

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validateSearch({ origin, destination, date, time }, now())
    setErrors(found)
    if (Object.keys(found).length > 0 || !origin || !destination) return
    void navigate(
      toSearchUrl({
        origin,
        destination,
        date,
        time: time || undefined,
        frequency,
      }),
    )
  }

  function swap() {
    setOrigin(destination)
    setDestination(origin)
    setErrors((prev) => ({ ...prev, origin: undefined, destination: undefined }))
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Search for transport" className={className}>
      <fieldset className="mb-space-md">
        <legend className="sr-only">Trip type</legend>
        <div className="inline-flex rounded-lg bg-surface-container p-space-xs">
          {FREQUENCIES.map((f) => (
            <label
              key={f.value}
              className={cn(
                'flex min-h-11 cursor-pointer items-center rounded-md px-space-md text-label-lg',
                'has-focus-visible:ring-3 has-focus-visible:ring-secondary/30',
                frequency === f.value
                  ? 'bg-surface-container-lowest text-primary-container shadow-card'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <input
                type="radio"
                name="frequency"
                value={f.value}
                checked={frequency === f.value}
                onChange={() => setFrequency(f.value)}
                className="sr-only"
              />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-space-md md:grid-cols-[1fr_auto_1fr] md:items-start">
        <PlacePicker
          label="Pickup area"
          placeholder="e.g. Tembisa"
          value={origin}
          onChange={setOrigin}
          error={errors.origin}
        />
        <Button
          variant="ghost"
          onClick={swap}
          aria-label="Swap pickup and destination"
          className="-my-space-md justify-self-end md:my-0 md:mt-7 md:justify-self-center"
        >
          <ArrowDownUp aria-hidden className="size-4 md:rotate-90" />
        </Button>
        <PlacePicker
          label="Destination"
          placeholder="e.g. Midrand Gautrain"
          value={destination}
          onChange={setDestination}
          error={errors.destination}
        />
      </div>

      <div className="mt-space-md grid gap-space-md sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto] md:items-start">
        <Field
          label={frequency === 'recurring' ? 'Starting from' : 'Date'}
          error={errors.date}
          required
        >
          {(control) => (
            <Input
              {...control}
              type="date"
              min={sastToday(now())}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Departure time (SAST)"
          hint="Leave empty for any time."
          error={errors.time}
          optional
        >
          {(control) => (
            <Input
              {...control}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" size="lg" className="md:mt-7">
          <Search aria-hidden className="size-4" />
          Search transport
        </Button>
      </div>
    </form>
  )
}
