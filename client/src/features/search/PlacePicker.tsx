import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { Field, Input } from '../../components/ui/Field'
import { useApi } from '../../lib/api/apiContext'
import type { Place } from '../../lib/api/types'

/** The part of a place a form needs to keep. */
export type PlaceRef = Pick<Place, 'id' | 'label'>
import { cn } from '../../lib/cn'

const MIN_CHARS = 2
const DEBOUNCE_MS = 250

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/**
 * Location combobox (ARIA 1.2 pattern). A place only counts once it is
 * picked from the list (BR3); typing again clears the selection.
 */
export function PlacePicker({
  label,
  value,
  onChange,
  error,
  placeholder,
  className,
}: {
  label: string
  value: PlaceRef | null
  onChange: (place: Place | null) => void
  error?: string
  placeholder?: string
  className?: string
}) {
  const api = useApi()
  const listId = useId()
  const [text, setText] = useState(value?.label ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  // Keep the text in step when the value is set from outside (e.g. swap).
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (value) setText(value.label)
  }

  const term = useDebounced(text.trim(), DEBOUNCE_MS)
  const searching = open && !value && term.length >= MIN_CHARS
  const {
    data: places = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['places', term],
    queryFn: () => api.searchPlaces(term),
    enabled: searching,
    staleTime: 5 * 60_000,
  })

  const showList = searching && term === text.trim()
  const optionId = (i: number) => `${listId}-opt-${i}`

  function select(place: Place) {
    onChange(place)
    setText(place.label)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!showList || places.length === 0) return
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + places.length) % places.length)
    } else if (e.key === 'Enter' && showList && active >= 0 && places[active]) {
      e.preventDefault()
      select(places[active])
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
      setActive(-1)
    }
  }

  let status: string | null = null
  if (showList) {
    if (isError) status = "We couldn't load places. Try again."
    else if (isFetching && places.length === 0) status = 'Searching…'
    else if (places.length === 0) status = 'No matching places. Try a suburb, rank or landmark.'
  }

  return (
    <Field label={label} error={error} required className={className}>
      {(control) => (
        <div className="relative">
          <MapPin
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface-variant"
          />
          <Input
            {...control}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
            placeholder={placeholder}
            value={text}
            className="pl-9"
            onChange={(e) => {
              setText(e.target.value)
              setOpen(true)
              setActive(-1)
              if (value) onChange(null)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
          <ul
            id={listId}
            role="listbox"
            aria-label={`${label} suggestions`}
            hidden={!showList || places.length === 0}
            className="absolute z-20 mt-space-xs max-h-72 w-full overflow-auto rounded-xl border border-border-default bg-surface-container-lowest py-space-xs shadow-raised"
          >
            {places.map((p, i) => (
              <li
                key={p.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: runs before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(p)
                }}
                className={cn(
                  'flex min-h-11 cursor-pointer flex-col justify-center px-space-md py-space-xs',
                  i === active ? 'bg-surface-container' : 'hover:bg-surface-container-low',
                )}
              >
                <span className="text-body-lg text-on-surface">{p.label}</span>
                <span className="text-body-sm text-on-surface-variant">{p.area}</span>
              </li>
            ))}
          </ul>
          <p
            role="status"
            className={status ? 'mt-space-xs text-body-sm text-on-surface-variant' : 'sr-only'}
          >
            {status ??
              (showList && places.length > 0 ? `${places.length} suggestions available` : '')}
          </p>
        </div>
      )}
    </Field>
  )
}
