import { EyeOff, MapPinned, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

const POINTS = [
  {
    icon: ShieldCheck,
    text: 'Operators are labelled “Verified” only after an admin checks their documents.',
  },
  { icon: EyeOff, text: 'Your exact home address and phone number are never shown publicly.' },
  { icon: MapPinned, text: 'Built for Gauteng commuters. Times are shown in SAST.' },
]

/**
 * Two-column auth layout from the S2/S3 designs: a brand panel on large
 * screens, and just the form on mobile.
 */
export function AuthLayout({
  panelTitle,
  panelText,
  children,
}: {
  panelTitle: string
  panelText: string
  children: ReactNode
}) {
  return (
    <div className="lg:grid lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[5fr_7fr]">
      <aside
        aria-hidden
        className="hidden bg-gradient-to-b from-primary-container to-[#06192a] px-margin py-space-xl text-on-primary lg:flex lg:flex-col lg:justify-center"
      >
        <div className="max-w-md">
          <p className="text-display-lg font-display-lg">{panelTitle}</p>
          <p className="mt-space-md text-body-lg text-inverse-primary">{panelText}</p>
          <ul className="mt-space-xl flex flex-col gap-space-md">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-space-sm text-body-md">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4 text-secondary-fixed" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="flex justify-center px-margin-mobile py-space-xl md:px-margin">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </div>
  )
}

export function AuthHeading({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string
  title: string
  intro?: ReactNode
}) {
  return (
    <header className="mb-space-lg">
      {eyebrow && (
        <p className="text-label-md font-label-md uppercase tracking-wider text-secondary">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-space-xs text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
        {title}
      </h1>
      {intro && <p className="mt-space-sm text-body-lg text-on-surface-variant">{intro}</p>}
    </header>
  )
}
