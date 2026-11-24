import {
  ArrowRight,
  Banknote,
  Bus,
  Flag,
  Handshake,
  MapPinned,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip, VerificationChip } from '../../components/ui/Chip'
import { useSession } from '../../lib/session/session'
import { SearchForm } from '../search/SearchForm'
import { useListServiceLink } from './useListServiceLink'

/** S1 Landing (PRD §8.1): product explanation, search entry, operator CTA, trust and safety. */
export function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <TwoWaysToTravel />
      <OperatorCta />
      <TrustAndSafety />
      <ClosingCta />
    </>
  )
}

const container = 'mx-auto max-w-7xl px-margin-mobile md:px-margin'

function SectionHeading({
  eyebrow,
  title,
  intro,
  id,
}: {
  eyebrow: string
  title: string
  intro?: string
  id: string
}) {
  return (
    <div className="mx-auto mb-space-xl max-w-2xl text-center">
      <p className="text-label-sm font-label-sm uppercase text-secondary">{eyebrow}</p>
      <h2
        id={id}
        className="mt-space-sm text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl"
      >
        {title}
      </h2>
      {intro && <p className="mt-space-sm text-body-lg text-on-surface-variant">{intro}</p>}
    </div>
  )
}

// ---------------------------------------------------------------- hero

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-gradient-to-b from-surface-container-low to-background pt-space-xl pb-space-xl md:pt-16"
    >
      <div className={container}>
        <div className="mx-auto max-w-3xl text-center">
          <Chip tone="info" icon={MapPinned}>
            Commuter transport across Gauteng
          </Chip>
          <h1
            id="hero-title"
            className="mt-space-md text-display-lg-mobile font-display-lg-mobile text-primary-container md:text-display-lg md:font-display-lg"
          >
            Your journey. More options. Less hassle.
          </h1>
          <p className="mt-space-md text-body-lg text-on-surface-variant">
            Find transport operators and people travelling the same way. Compare routes, check
            verification status and send a request, all in one place.
          </p>
          <ul className="mt-space-md flex flex-wrap justify-center gap-x-space-lg gap-y-space-sm text-body-md text-on-surface-variant">
            <HeroPoint icon={ShieldCheck}>Verification status on every operator</HeroPoint>
            <HeroPoint icon={Banknote}>Fares in ZAR, or “Contact for fare”</HeroPoint>
            <HeroPoint icon={MapPinned}>Exact pickup points kept private</HeroPoint>
          </ul>
        </div>

        <Card className="mx-auto mt-space-xl max-w-5xl shadow-raised">
          <SearchForm />
          <p className="mt-space-md text-body-sm text-on-surface-variant">
            All times are South African Standard Time (SAST).
          </p>
        </Card>
      </div>
    </section>
  )
}

function HeroPoint({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-center gap-space-xs">
      <Icon aria-hidden className="size-4 text-secondary" />
      {children}
    </li>
  )
}

// ---------------------------------------------------------------- how it works

const STEPS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Search,
    title: 'Search your journey',
    body: 'Enter your pickup area, destination and when you travel. Once-off trip or a regular commute.',
  },
  {
    icon: Bus,
    title: 'Compare your options',
    body: 'See transport operators and shared journeys in separate lists, with schedules, fares, verification status and when each listing was last updated.',
  },
  {
    icon: Handshake,
    title: 'Enquire or request to join',
    body: 'Send an enquiry to an operator or a request to join a shared journey. You’ll be notified when they respond.',
  },
]

function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="py-16">
      <div className={container}>
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="How CommuteConnect works"
          intro="Three steps from planning a trip to travelling with confidence."
        />
        <ol className="grid gap-space-lg md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <div className="flex items-start justify-between">
                  <span
                    aria-hidden
                    className="text-headline-xl font-headline-xl text-outline-variant"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <s.icon aria-hidden className="size-6 text-secondary" />
                </div>
                <h3 className="mt-space-md text-headline-sm font-headline-sm">{s.title}</h3>
                <p className="mt-space-sm text-body-md text-on-surface-variant">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- two ways

function TwoWaysToTravel() {
  return (
    <section aria-labelledby="ways-title" className="bg-surface-container-low py-16">
      <div className={container}>
        <SectionHeading
          id="ways-title"
          eyebrow="Your options"
          title="Two ways to travel"
          intro="Operator services and shared journeys are always listed separately, so you know exactly what you’re looking at."
        />
        <div className="grid gap-space-lg md:grid-cols-2">
          <WayCard
            icon={Bus}
            title="Transport operators"
            chip={<VerificationChip status="verified" />}
            points={[
              'Minibus taxis, shuttles, buses and coaches with set routes and schedules.',
              'Each operator shows its verification status. “Verified” appears only after our team reviews their documents.',
              'Fares in ZAR, or “Contact for fare” when the operator hasn’t listed one.',
              'Every route shows when it was last confirmed.',
            ]}
            action={
              <ButtonLink to="/search" fullWidth>
                Find an operator
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            }
          />
          <WayCard
            icon={Users}
            title="Shared journeys"
            chip={<Chip tone="info">Possible match</Chip>}
            points={[
              'Commuters travelling a similar route at a similar time can share a journey.',
              'Listings show approximate pickup areas, never home addresses.',
              'You send a request to join; the person who published the journey decides whether to accept.',
              'A match is a suggestion, not a booking or a safety guarantee.',
            ]}
            action={
              <ButtonLink to="/commuter/journeys/new" variant="secondary" fullWidth>
                Publish a journey
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            }
          />
        </div>
      </div>
    </section>
  )
}

function WayCard({
  icon: Icon,
  title,
  chip,
  points,
  action,
}: {
  icon: LucideIcon
  title: string
  chip: ReactNode
  points: string[]
  action: ReactNode
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h3 className="flex items-center gap-space-sm text-headline-sm font-headline-sm">
          <Icon aria-hidden className="size-6 text-secondary" />
          {title}
        </h3>
        {chip}
      </div>
      <ul className="mt-space-md flex flex-1 list-disc flex-col gap-space-sm pl-space-lg text-body-md text-on-surface-variant marker:text-secondary">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="mt-space-lg">{action}</div>
    </Card>
  )
}

// ---------------------------------------------------------------- operator CTA

function OperatorCta() {
  const to = useListServiceLink()
  return (
    <section aria-labelledby="operator-title" className="py-16">
      <div className={container}>
        <div className="rounded-2xl bg-primary-container p-space-lg text-on-primary md:flex md:items-center md:justify-between md:gap-space-xl md:p-space-xl">
          <div className="max-w-2xl">
            <p className="text-label-sm font-label-sm uppercase text-tertiary-fixed-dim">
              For transport operators
            </p>
            <h2
              id="operator-title"
              className="mt-space-sm text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl"
            >
              Run a transport service?
            </h2>
            <p className="mt-space-sm text-body-lg text-primary-fixed">
              List your routes, schedules and fares so commuters on your corridor can find you and
              send enquiries. Your listing shows “Verification pending” until our team has reviewed
              your documents.
            </p>
          </div>
          <div className="mt-space-lg flex shrink-0 flex-col gap-space-sm md:mt-0">
            <Link
              to={to}
              className="inline-flex min-h-12 items-center justify-center gap-space-sm rounded-lg bg-accent px-space-lg text-label-lg font-label-lg text-on-tertiary-fixed hover:bg-tertiary-fixed-dim focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/50"
            >
              List your service
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              to="/help"
              className="inline-flex min-h-11 items-center justify-center text-label-lg font-label-lg text-primary-fixed underline-offset-4 hover:underline"
            >
              How verification works
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- trust & safety

const TRUST: Array<{ icon: LucideIcon; title: string; body: ReactNode }> = [
  {
    icon: ShieldCheck,
    title: 'Verification you can check',
    body: (
      <>
        <span className="mb-space-sm flex flex-wrap gap-space-xs">
          <VerificationChip status="verified" />
          <VerificationChip status="pending" />
        </span>
        “Verified” appears only after an admin has reviewed an operator’s documents. Until then
        you’ll see “Verification pending”, along with the date of any decision.
      </>
    ),
  },
  {
    icon: Sparkles,
    title: 'Matches are suggestions',
    body: '“Possible match” means routes and times line up. It isn’t a booking or a safety guarantee. You decide whether to send a request.',
  },
  {
    icon: MapPinned,
    title: 'Your location stays approximate',
    body: 'Listings show pickup areas, not home addresses. Contact details are shared only through the requests and enquiries you choose to send.',
  },
  {
    icon: Flag,
    title: 'Report a problem',
    body: 'Report any listing or user from its page. Reports are private and reviewed by our team, who can suspend listings while they investigate.',
  },
]

function TrustAndSafety() {
  return (
    <section aria-labelledby="trust-title" className="bg-surface-container-low py-16">
      <div className={container}>
        <SectionHeading
          id="trust-title"
          eyebrow="Trust and safety"
          title="Trust and safety, stated plainly"
          intro="We tell you what we’ve checked and what we haven’t, so you can decide for yourself."
        />
        <ul className="grid gap-space-lg sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <li key={t.title}>
              <Card className="h-full">
                <t.icon aria-hidden className="size-6 text-secondary" />
                <h3 className="mt-space-md text-title-md font-title-md">{t.title}</h3>
                <div className="mt-space-sm text-body-md text-on-surface-variant">{t.body}</div>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-space-lg text-center">
          <Link
            to="/help"
            className="inline-flex min-h-11 items-center gap-space-xs text-label-lg font-label-lg text-secondary underline-offset-4 hover:underline"
          >
            Read our safety guidance
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- closing CTA

function ClosingCta() {
  const { user } = useSession()
  const listService = useListServiceLink()
  return (
    <section aria-labelledby="closing-title" className="py-16">
      <div className={`${container} text-center`}>
        <h2
          id="closing-title"
          className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl"
        >
          Ready to find your commute?
        </h2>
        <p className="mx-auto mt-space-sm max-w-xl text-body-lg text-on-surface-variant">
          You don’t need an account to search. Sign up when you’re ready to send a request.
        </p>
        <div className="mt-space-lg flex flex-col justify-center gap-space-sm sm:flex-row">
          <ButtonLink to="/search" size="lg">
            Find transport
          </ButtonLink>
          {user ? (
            <ButtonLink to={listService} size="lg" variant="outline">
              List your service
            </ButtonLink>
          ) : (
            <ButtonLink to="/signup" size="lg" variant="outline">
              Create an account
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  )
}
