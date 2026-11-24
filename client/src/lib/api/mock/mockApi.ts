/**
 * In-memory implementation of ApiClient for building screens before the
 * backend exists. It enforces the main PRD business rules so screens can
 * exercise real error paths. Data resets on page reload.
 */
import { isoToSastDate, isoToSastTime, minutesOf, sastToday, weekdayOf } from '../../time'
import type { ApiClient } from '../client'
import { ApiError } from '../errors'
import type {
  AppNotification,
  Enquiry,
  Journey,
  JourneyRequest,
  MatchSuggestion,
  Me,
  NotificationType,
  Operator,
  OperatorRoute,
  Place,
  PublicUser,
  Report,
  Role,
  SearchParams,
} from '../types'
import { approximate, distanceKm, PLACES, placeById } from './places'
import {
  createSeed,
  PERSONAS,
  type JourneyRecord,
  type MockDb,
  type RouteRecord,
  type UserRecord,
} from './seed'

export interface MockConfig {
  /** Simulated network delay in ms: fixed, or [min, max]. */
  latencyMs: number | [number, number]
  /** 0–1 chance that any call fails with server_error. */
  failureRate: number
}

export interface MockApi extends ApiClient {
  getConfig(): MockConfig
  setConfig(config: Partial<MockConfig>): void
  /** Dev role switcher: sign in as a persona (or null for guest) without a password. */
  switchUser(userId: string | null): void
  readonly personas: typeof PERSONAS
  /** Direct access for tests. */
  readonly db: MockDb
}

export interface MockOptions {
  config?: Partial<MockConfig>
  /** Signed-in user at start (persona id). Overrides storage. */
  userId?: string | null
  /** Persists the signed-in persona across reloads (e.g. localStorage). */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  now?: () => Date
}

const SESSION_KEY = 'cc.mock.userId'
/** Lifetime of a password-reset link (US2). */
export const RESET_TOKEN_MINUTES = 60
/** Listings not reconfirmed within this many days "need confirmation" (BR11). */
export const FRESHNESS_DAYS = 60
const SEARCH_RADIUS_KM = 3
const MATCH_RADIUS_KM = 5
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export function createMockApi(options: MockOptions = {}): MockApi {
  const now = options.now ?? (() => new Date())
  const db = createSeed(now())
  const config: MockConfig = { latencyMs: [150, 500], failureRate: 0, ...options.config }
  let currentUserId: string | null =
    options.userId !== undefined ? options.userId : (options.storage?.getItem(SESSION_KEY) ?? null)
  let seq = 0
  const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`
  const nowIso = () => now().toISOString()

  function setCurrentUser(id: string | null) {
    currentUserId = id
    if (id) options.storage?.setItem(SESSION_KEY, id)
    else options.storage?.removeItem(SESSION_KEY)
  }

  /** Simulates the network, then runs `fn` and returns a deep copy. */
  async function run<T>(fn: () => T): Promise<T> {
    const { latencyMs, failureRate } = config
    const ms = Array.isArray(latencyMs)
      ? latencyMs[0] + Math.random() * (latencyMs[1] - latencyMs[0])
      : latencyMs
    if (ms > 0) await new Promise((r) => setTimeout(r, ms))
    if (failureRate > 0 && Math.random() < failureRate) throw new ApiError('server_error')
    return structuredClone(fn())
  }

  // -------------------------------------------------------------- guards

  function currentUser(): UserRecord | null {
    const u = db.users.find((x) => x.id === currentUserId)
    return u && u.accountStatus !== 'deleted' ? u : null
  }

  function requireUser(): UserRecord {
    const u = currentUser()
    if (!u) throw new ApiError('unauthenticated')
    if (u.accountStatus === 'suspended') throw new ApiError('forbidden')
    return u
  }

  function requireVerified(): UserRecord {
    const u = requireUser()
    if (!u.emailVerified) throw new ApiError('email_not_verified')
    return u
  }

  function requireRole(role: Role): UserRecord {
    const u = requireUser()
    if (!u.roles.includes(role)) throw new ApiError('forbidden')
    return u
  }

  function fail(fieldErrors: Record<string, string>): never {
    throw new ApiError('validation', { fieldErrors })
  }

  function validate(checks: Array<[boolean, string, string]>) {
    const errors: Record<string, string> = {}
    for (const [bad, field, message] of checks) if (bad && !errors[field]) errors[field] = message
    if (Object.keys(errors).length) fail(errors)
  }

  // -------------------------------------------------------------- mappers

  function toMe(u: UserRecord): Me {
    const { password: _password, ...me } = u
    return me
  }

  function toPublicUser(id: string): PublicUser {
    const u = db.users.find((x) => x.id === id)
    if (!u) return { id, displayName: 'Former member' }
    const [first, ...rest] = u.fullName.split(' ')
    const last = rest.at(-1)
    return { id, displayName: last ? `${first} ${last[0]}.` : first }
  }

  function place(id: string): Place {
    const p = placeById(id)
    if (!p) throw new ApiError('not_found')
    return p
  }

  function operatorOf(id: string): Operator {
    const op = db.operators.find((o) => o.id === id)
    if (!op) throw new ApiError('not_found')
    return op
  }

  function isStale(lastConfirmedAt: string) {
    return now().getTime() - Date.parse(lastConfirmedAt) > FRESHNESS_DAYS * 86_400_000
  }

  function toRoute(r: RouteRecord): OperatorRoute {
    const op = operatorOf(r.operatorId)
    return {
      id: r.id,
      operator: {
        id: op.id,
        businessName: op.businessName,
        verificationStatus: op.verificationStatus,
        verifiedAt: op.verifiedAt,
      },
      routeName: r.routeName,
      transportType: r.transportType,
      origin: place(r.originId),
      destination: place(r.destinationId),
      stops: r.stops.map((s) => ({ place: place(s.placeId), estimatedTime: s.estimatedTime })),
      fareCents: r.fareCents,
      fareType: r.fareType,
      scheduleDescription: r.scheduleDescription,
      status: r.status,
      lastConfirmedAt: r.lastConfirmedAt,
      needsConfirmation: isStale(r.lastConfirmedAt),
    }
  }

  function toJourney(j: JourneyRecord): Journey {
    const o = place(j.originId)
    const d = place(j.destinationId)
    return {
      id: j.id,
      publisher: toPublicUser(j.publisherId),
      originZone: `${o.label} area`,
      destinationZone: `${d.label} area`,
      originApprox: approximate(o),
      destinationApprox: approximate(d),
      journeyType: j.journeyType,
      departureAt: j.departureAt,
      schedule: j.schedule,
      seatsAvailable: j.seatsAvailable,
      vehicleCapacity: j.vehicleCapacity,
      costSharingCents: j.costSharingCents,
      notes: j.notes,
      status: j.status,
      createdAt: j.createdAt,
    }
  }

  function toRequest(r: MockDb['requests'][number]): JourneyRequest {
    return {
      id: r.id,
      journeyId: r.journeyId,
      occurrenceId: r.occurrenceId,
      commuter: toPublicUser(r.commuterId),
      message: r.message,
      status: r.status,
      cancelReason: r.cancelReason,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
    }
  }

  function toEnquiry(e: MockDb['enquiries'][number]): Enquiry {
    const r = db.routes.find((x) => x.id === e.routeId)
    return {
      id: e.id,
      routeId: e.routeId,
      routeName: r?.routeName ?? 'Removed route',
      commuter: toPublicUser(e.commuterId),
      message: e.message,
      response: e.response,
      status: e.status,
      createdAt: e.createdAt,
      respondedAt: e.respondedAt,
    }
  }

  function targetLabel(type: string, id: string): string {
    if (type === 'route') return db.routes.find((r) => r.id === id)?.routeName ?? id
    if (type === 'operator') return db.operators.find((o) => o.id === id)?.businessName ?? id
    if (type === 'user') return toPublicUser(id).displayName
    if (type === 'journey') {
      const j = db.journeys.find((x) => x.id === id)
      return j ? `${place(j.originId).label} → ${place(j.destinationId).label}` : id
    }
    return id
  }

  function toReport(r: MockDb['reports'][number]): Report {
    const { reporterId, ...rest } = r
    return {
      ...rest,
      reporter: toPublicUser(reporterId),
      targetLabel: targetLabel(r.targetType, r.targetId),
    }
  }

  // -------------------------------------------------------------- lookups & rules

  function findJourney(id: string): JourneyRecord {
    const j = db.journeys.find((x) => x.id === id)
    if (!j) throw new ApiError('not_found')
    return j
  }

  function findOwnedJourney(id: string, user: UserRecord): JourneyRecord {
    const j = findJourney(id)
    if (j.publisherId !== user.id) throw new ApiError('forbidden')
    return j
  }

  function ownOperator(user: UserRecord): Operator | undefined {
    return db.operators.find((o) => o.ownerId === user.id)
  }

  function ownedRoute(id: string, user: UserRecord): RouteRecord {
    const r = db.routes.find((x) => x.id === id)
    if (!r) throw new ApiError('not_found')
    if (ownOperator(user)?.id !== r.operatorId) throw new ApiError('forbidden')
    return r
  }

  function isPublicRoute(r: RouteRecord) {
    const status = operatorOf(r.operatorId).verificationStatus
    return (
      r.status === 'active' &&
      (status === 'verified' || status === 'pending' || status === 'under_review')
    )
  }

  function journeyTime(j: JourneyRecord): string {
    return j.departureAt ? isoToSastTime(j.departureAt) : j.schedule!.departureTime
  }

  function isPast(j: JourneyRecord) {
    return (
      j.journeyType === 'once_off' &&
      j.departureAt !== null &&
      Date.parse(j.departureAt) <= now().getTime()
    )
  }

  function runsOn(j: JourneyRecord, date: string): boolean {
    if (j.journeyType === 'once_off')
      return j.departureAt !== null && isoToSastDate(j.departureAt) === date
    const s = j.schedule!
    if (!s.daysOfWeek.includes(weekdayOf(date))) return false
    if (date < s.validFrom || (s.validUntil && date > s.validUntil)) return false
    const occ = db.occurrences.find(
      (o) => o.journeyId === j.id && isoToSastDate(o.departureAt) === date,
    )
    return occ?.status !== 'cancelled'
  }

  function journeyDays(j: JourneyRecord): number[] {
    return j.schedule
      ? j.schedule.daysOfWeek
      : j.departureAt
        ? [weekdayOf(isoToSastDate(j.departureAt))]
        : []
  }

  function bookable(j: JourneyRecord) {
    return j.status === 'open' && j.seatsAvailable > 0 && !isPast(j)
  }

  function notify(
    recipientId: string,
    type: NotificationType,
    title: string,
    body: string,
    linkTarget: string,
  ) {
    const n: AppNotification & { recipientId: string } = {
      id: newId('n'),
      recipientId,
      type,
      title,
      body,
      linkTarget,
      isRead: false,
      createdAt: nowIso(),
    }
    db.notifications.push(n)
  }

  function notifyAdmins(type: NotificationType, title: string, body: string, link: string) {
    for (const a of db.users.filter((u) => u.roles.includes('admin')))
      notify(a.id, type, title, body, link)
  }

  function audit(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata = {},
  ) {
    db.audit.push({
      id: newId('audit'),
      actorId,
      action,
      targetType,
      targetId,
      metadata,
      createdAt: nowIso(),
    })
  }

  function setJourneyStatusAfterSeatChange(j: JourneyRecord) {
    if (j.seatsAvailable <= 0 && j.status === 'open') j.status = 'full'
    else if (j.seatsAvailable > 0 && j.status === 'full') j.status = 'open'
  }

  // -------------------------------------------------------------- API

  const api: MockApi = {
    personas: PERSONAS,
    db,
    getConfig: () => ({ ...config }),
    setConfig: (c) => Object.assign(config, c),
    switchUser: (id) => setCurrentUser(id),

    // ---- auth
    getSession: () =>
      run(() => {
        const u = currentUser()
        return { user: u ? toMe(u) : null }
      }),

    signIn: (email, password) =>
      run(() => {
        const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
        if (!u || u.password !== password || u.accountStatus === 'deleted') {
          throw new ApiError('invalid_credentials')
        }
        setCurrentUser(u.id)
        return toMe(u)
      }),

    signUp: (input) =>
      run(() => {
        const email = input.email.trim().toLowerCase()
        validate([
          [input.fullName.trim().length < 2, 'fullName', 'Enter your full name.'],
          [input.fullName.trim().length > 80, 'fullName', 'Use 80 characters or fewer.'],
          [!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 'email', 'Enter a valid email address.'],
          [input.password.length < 8, 'password', 'Use at least 8 characters.'],
          [input.roles.length === 0, 'roles', 'Choose how you’ll use CommuteConnect.'],
          [
            !input.acceptedTerms,
            'acceptedTerms',
            'You need to accept the Terms and Privacy Notice.',
          ],
        ])
        if (db.users.some((u) => u.email.toLowerCase() === email)) throw new ApiError('email_taken')
        const u: UserRecord = {
          id: newId('u'),
          fullName: input.fullName.trim(),
          email,
          emailVerified: false, // BR1: verification email sent
          phone: null,
          roles: [...input.roles],
          accountStatus: 'active',
          preferences: {
            usualOriginId: null,
            usualDestinationId: null,
            usualDepartureTime: null,
            travelDays: [],
            notifyByEmail: true,
          },
          profileComplete: false,
          createdAt: nowIso(),
          password: input.password,
        }
        db.users.push(u)
        setCurrentUser(u.id)
        return toMe(u)
      }),

    signOut: () => run(() => setCurrentUser(null)),

    // Always succeeds so it doesn't reveal which emails have accounts.
    requestPasswordReset: (email) =>
      run(() => {
        const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
        if (!u || u.accountStatus === 'deleted') return
        const token = newId('reset')
        db.resetTokens.push({
          token,
          userId: u.id,
          expiresAt: new Date(now().getTime() + RESET_TOKEN_MINUTES * 60_000).toISOString(),
        })
        // No email in mock mode: the reset link goes to the console instead.
        if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
          console.info(`[mock] Password reset link: /reset-password?token=${token}`)
        }
      }),

    resetPassword: (token, password) =>
      run(() => {
        const i = db.resetTokens.findIndex((t) => t.token === token)
        const entry = db.resetTokens[i]
        if (!entry || entry.expiresAt <= nowIso()) throw new ApiError('reset_link_invalid')
        validate([[password.length < 8, 'password', 'Use at least 8 characters.']])
        const u = db.users.find((x) => x.id === entry.userId)
        if (!u) throw new ApiError('reset_link_invalid')
        u.password = password
        // Single use: drop this and any other outstanding links for the user.
        db.resetTokens = db.resetTokens.filter((t) => t.userId !== u.id)
      }),

    // ---- profile
    getMe: () => run(() => toMe(requireUser())),

    updateMe: (update) =>
      run(() => {
        const u = requireUser()
        if (update.fullName !== undefined) {
          validate([
            [
              update.fullName.trim().length < 2 || update.fullName.length > 80,
              'fullName',
              'Enter your full name (2–80 characters).',
            ],
          ])
          u.fullName = update.fullName.trim()
        }
        if (update.phone !== undefined) {
          validate([
            [
              update.phone !== null && !/^\+?[0-9 ]{9,20}$/.test(update.phone),
              'phone',
              'Enter a valid phone number.',
            ],
          ])
          u.phone = update.phone
        }
        if (update.preferences) u.preferences = { ...u.preferences, ...update.preferences }
        if (update.profileComplete !== undefined) u.profileComplete = update.profileComplete
        return toMe(u)
      }),

    deleteAccount: () =>
      run(() => {
        const u = requireUser()
        // Anonymise: keep records others depend on, drop personal details (PRD §12.4).
        u.accountStatus = 'deleted'
        u.fullName = 'Former member'
        u.email = `deleted-${u.id}@invalid`
        u.phone = null
        for (const j of db.journeys)
          if (j.publisherId === u.id && j.status !== 'completed') j.status = 'cancelled'
        for (const r of db.requests)
          if (r.commuterId === u.id && r.status === 'pending') r.status = 'cancelled'
        setCurrentUser(null)
      }),

    // ---- places
    searchPlaces: (query) =>
      run(() => {
        const q = query.trim().toLowerCase()
        if (q.length < 2) return []
        return PLACES.filter((p) => `${p.label} ${p.area}`.toLowerCase().includes(q)).slice(0, 8)
      }),

    getPlace: (id) => run(() => place(id)),

    // ---- search & matching
    search: (params) =>
      run(() => {
        const origin = place(params.originId)
        const dest = place(params.destinationId)
        validate([[origin.id === dest.id, 'destinationId', 'Choose a different destination.']])
        if (params.date && params.date < sastToday(now()))
          fail({ date: 'Choose today or a future date.' })

        const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
          distanceKm(a, b) <= SEARCH_RADIUS_KM
        const type = params.transportType
        const frequency = params.frequency ?? 'any'
        const window = params.windowMinutes ?? 60

        const routes =
          type === 'shared'
            ? []
            : db.routes
                .filter(isPublicRoute)
                .filter((r) => !type || r.transportType === type)
                .filter((r) => {
                  const points = [
                    r.originId,
                    ...r.stops.map((s) => s.placeId),
                    r.destinationId,
                  ].map(place)
                  const i = points.findIndex((p) => near(p, origin))
                  return i !== -1 && points.slice(i + 1).some((p) => near(p, dest))
                })
                .map(toRoute)
                .sort(
                  (a, b) =>
                    Number(a.needsConfirmation) - Number(b.needsConfirmation) ||
                    Number(b.operator.verificationStatus === 'verified') -
                      Number(a.operator.verificationStatus === 'verified'),
                )

        const journeys =
          type && type !== 'shared'
            ? []
            : db.journeys
                .filter(bookable)
                .filter((j) => frequency === 'any' || j.journeyType === frequency)
                .filter(
                  (j) => near(place(j.originId), origin) && near(place(j.destinationId), dest),
                )
                .filter((j) => !params.date || runsOn(j, params.date))
                .filter(
                  (j) =>
                    !params.time ||
                    Math.abs(minutesOf(journeyTime(j)) - minutesOf(params.time)) <= window,
                )
                .sort((a, b) => journeyTime(a).localeCompare(journeyTime(b)))
                .map(toJourney)

        db.counters.searches++
        if (routes.length || journeys.length) db.counters.searchesWithResults++
        return { routes, journeys }
      }),

    listMatches: (params?: SearchParams) =>
      run(() => {
        const u = requireUser()
        const originId = params?.originId ?? u.preferences.usualOriginId
        const destId = params?.destinationId ?? u.preferences.usualDestinationId
        if (!originId || !destId) return []
        const origin = place(originId)
        const dest = place(destId)
        const time = params?.time ?? u.preferences.usualDepartureTime
        const days = params?.date ? [weekdayOf(params.date)] : u.preferences.travelDays

        const suggestions: MatchSuggestion[] = []
        for (const j of db.journeys) {
          if (!bookable(j) || j.publisherId === u.id) continue
          const oKm = distanceKm(place(j.originId), origin)
          const dKm = distanceKm(place(j.destinationId), dest)
          if (oKm > MATCH_RADIUS_KM || dKm > MATCH_RADIUS_KM) continue
          const shared = days.length
            ? journeyDays(j).filter((d) => days.includes(d))
            : journeyDays(j)
          if (shared.length === 0) continue
          const diff = time ? minutesOf(journeyTime(j)) - minutesOf(time) : 0
          if (Math.abs(diff) > 45) continue

          const reasons = [
            oKm < 0.5
              ? 'Starts near your origin'
              : `Starts about ${oKm.toFixed(1)} km from your origin`,
            dKm < 0.5
              ? 'Ends near your destination'
              : `Ends about ${dKm.toFixed(1)} km from your destination`,
          ]
          if (time) {
            reasons.push(
              diff === 0
                ? 'Departs at your usual time'
                : `Departs ${Math.abs(diff)} min ${diff < 0 ? 'before' : 'after'} your usual time`,
            )
          }
          if (days.length > 1)
            reasons.push(`Runs on ${shared.length} of your ${days.length} travel days`)

          const score = Math.max(
            0,
            Math.round(
              100 - oKm * 8 - dKm * 8 - Math.abs(diff) * 0.5 - (days.length - shared.length) * 5,
            ),
          )
          suggestions.push({ journey: toJourney(j), score, reasons })
        }
        return suggestions.sort((a, b) => b.score - a.score)
      }),

    // ---- journeys
    getJourney: (id) =>
      run(() => {
        const j = findJourney(id)
        if (j.status === 'draft' && j.publisherId !== currentUserId) throw new ApiError('not_found')
        return toJourney(j)
      }),

    listJourneyOccurrences: (journeyId) =>
      run(() => {
        findJourney(journeyId)
        return db.occurrences
          .filter((o) => o.journeyId === journeyId)
          .sort((a, b) => a.departureAt.localeCompare(b.departureAt))
      }),

    listMyJourneys: () =>
      run(() => {
        const u = requireUser()
        return db.journeys
          .filter((j) => j.publisherId === u.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(toJourney)
      }),

    createJourney: (input) =>
      run(() => {
        const u = requireVerified() // BR1
        const s = input.schedule
        validate([
          [!placeById(input.originId), 'originId', 'Choose a starting point from the list.'],
          [!placeById(input.destinationId), 'destinationId', 'Choose a destination from the list.'],
          [
            input.originId === input.destinationId,
            'destinationId',
            'Choose a different destination.',
          ],
          // BR4
          [
            input.journeyType === 'once_off' &&
              (!input.departureAt || Date.parse(input.departureAt) <= now().getTime()),
            'departureAt',
            'Choose a departure time in the future.',
          ],
          // BR5
          [
            input.journeyType === 'recurring' && (!s || s.daysOfWeek.length === 0),
            'daysOfWeek',
            'Choose at least one day.',
          ],
          [
            input.journeyType === 'recurring' && !!s && !/^\d{2}:\d{2}$/.test(s.departureTime),
            'departureTime',
            'Choose a departure time.',
          ],
          [
            input.journeyType === 'recurring' && !!s && !s.validFrom,
            'validFrom',
            'Choose a start date.',
          ],
          [
            input.journeyType === 'recurring' && !!s?.validUntil && s.validUntil < s.validFrom,
            'validUntil',
            'End date must be after the start date.',
          ],
          // BR6
          [
            !Number.isInteger(input.vehicleCapacity) ||
              input.vehicleCapacity < 1 ||
              input.vehicleCapacity > 15,
            'vehicleCapacity',
            'Enter the number of passenger seats (1–15).',
          ],
          [
            !Number.isInteger(input.seatsAvailable) || input.seatsAvailable < 1,
            'seatsAvailable',
            'Offer at least one seat.',
          ],
          [
            input.seatsAvailable > input.vehicleCapacity,
            'seatsAvailable',
            'Seats offered can’t exceed your vehicle’s passenger seats.',
          ],
          [
            input.costSharingCents !== null && input.costSharingCents < 0,
            'costSharingCents',
            'Contribution can’t be negative.',
          ],
        ])
        const j: JourneyRecord = {
          id: newId('j'),
          publisherId: u.id,
          originId: input.originId,
          destinationId: input.destinationId,
          journeyType: input.journeyType,
          departureAt: input.journeyType === 'once_off' ? input.departureAt : null,
          schedule: input.journeyType === 'recurring' ? input.schedule : null,
          seatsAvailable: input.seatsAvailable,
          vehicleCapacity: input.vehicleCapacity,
          costSharingCents: input.costSharingCents,
          notes: input.notes.trim(),
          status: 'open',
          createdAt: nowIso(),
        }
        db.journeys.push(j)
        return toJourney(j)
      }),

    updateJourney: (id, update) =>
      run(() => {
        const u = requireUser()
        const j = findOwnedJourney(id, u)
        if (j.status === 'cancelled' || j.status === 'completed')
          throw new ApiError('forbidden', { message: 'This journey can no longer be changed.' })
        if (update.seatsAvailable !== undefined) {
          validate([
            [
              !Number.isInteger(update.seatsAvailable) || update.seatsAvailable < 0,
              'seatsAvailable',
              'Enter a valid number of seats.',
            ],
            [
              update.seatsAvailable > j.vehicleCapacity,
              'seatsAvailable',
              'Seats offered can’t exceed your vehicle’s passenger seats.',
            ],
          ])
          j.seatsAvailable = update.seatsAvailable
          setJourneyStatusAfterSeatChange(j)
        }
        if (update.notes !== undefined) j.notes = update.notes.trim()
        if (update.status !== undefined) {
          const allowed: Record<string, string[]> = {
            open: ['paused', 'cancelled'],
            full: ['paused', 'cancelled'],
            paused: ['open', 'cancelled'],
          }
          if (!allowed[j.status]?.includes(update.status))
            throw new ApiError('validation', {
              message: `Can’t change a ${j.status} journey to ${update.status}.`,
            })
          j.status = update.status === 'open' && j.seatsAvailable === 0 ? 'full' : update.status
          if (update.status === 'cancelled') {
            for (const r of db.requests.filter(
              (x) => x.journeyId === j.id && (x.status === 'pending' || x.status === 'accepted'),
            )) {
              r.status = 'cancelled'
              const reason = update.cancelReason?.trim()
              r.cancelReason = reason || 'Journey cancelled by publisher'
              r.respondedAt = nowIso()
              notify(
                r.commuterId,
                'journey_changed',
                'Journey cancelled',
                `A journey you requested has been cancelled${reason ? `: ${reason}` : '.'}`,
                '/requests',
              )
            }
          }
        }
        return toJourney(j)
      }),

    cancelOccurrence: (occurrenceId, reason) =>
      run(() => {
        const u = requireUser()
        const occ = db.occurrences.find((o) => o.id === occurrenceId)
        if (!occ) throw new ApiError('not_found')
        findOwnedJourney(occ.journeyId, u)
        occ.status = 'cancelled'
        for (const r of db.requests.filter(
          (x) => x.journeyId === occ.journeyId && x.status === 'accepted',
        )) {
          notify(
            r.commuterId,
            'journey_changed',
            'Trip cancelled',
            `A journey you requested has changed or been cancelled${reason ? `: ${reason}` : '.'}`,
            '/requests',
          )
        }
        return occ
      }),

    // ---- requests
    requestToJoin: (journeyId, input) =>
      run(() => {
        const u = requireVerified() // BR1
        const j = findJourney(journeyId)
        if (j.publisherId === u.id)
          throw new ApiError('forbidden', {
            message: 'You can’t request to join your own journey.',
          }) // BR7
        if (isPast(j))
          throw new ApiError('validation', { message: 'This journey has already departed.' }) // BR4
        if (j.status !== 'open' || j.seatsAvailable <= 0) throw new ApiError('seat_unavailable')
        const active = db.requests.some(
          (r) =>
            r.journeyId === j.id &&
            r.commuterId === u.id &&
            (r.status === 'pending' || r.status === 'accepted'),
        )
        if (active) throw new ApiError('duplicate_request') // BR7
        validate([[input.message.length > 500, 'message', 'Use 500 characters or fewer.']])
        const r = {
          id: newId('req'),
          journeyId: j.id,
          occurrenceId: input.occurrenceId ?? null,
          commuterId: u.id,
          message: input.message.trim(),
          status: 'pending' as const,
          cancelReason: null,
          createdAt: nowIso(),
          respondedAt: null,
        }
        db.requests.push(r)
        notify(
          j.publisherId,
          'request_received',
          'New request to join',
          'You have a new request to join your journey.',
          '/commuter/journeys',
        )
        return toRequest(r)
      }),

    listMyRequests: () =>
      run(() => {
        const u = requireUser()
        const mine = new Set(db.journeys.filter((j) => j.publisherId === u.id).map((j) => j.id))
        const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
          b.createdAt.localeCompare(a.createdAt)
        return {
          sent: db.requests
            .filter((r) => r.commuterId === u.id)
            .sort(byNewest)
            .map(toRequest),
          received: db.requests
            .filter((r) => mine.has(r.journeyId))
            .sort(byNewest)
            .map(toRequest),
        }
      }),

    updateRequest: (id, change) =>
      run(() => {
        const u = requireUser()
        const r = db.requests.find((x) => x.id === id)
        if (!r) throw new ApiError('not_found')
        const j = findJourney(r.journeyId)

        if (change.action === 'accept' || change.action === 'reject') {
          if (j.publisherId !== u.id) throw new ApiError('forbidden') // BR7: only the owner
          if (r.status !== 'pending')
            throw new ApiError('validation', { message: 'This request has already been answered.' })
          if (change.action === 'accept') {
            // BR8: check and decrement in one step (the API does this in a transaction).
            if (j.seatsAvailable <= 0) throw new ApiError('seat_unavailable')
            j.seatsAvailable--
            setJourneyStatusAfterSeatChange(j)
            r.status = 'accepted'
            notify(
              r.commuterId,
              'request_accepted',
              'Request accepted',
              'Your request was accepted. Review the journey details and coordinate with the publisher.',
              '/requests',
            )
          } else {
            r.status = 'rejected'
            notify(
              r.commuterId,
              'request_rejected',
              'Request not accepted',
              'Your request was not accepted.',
              '/requests',
            )
          }
          r.respondedAt = nowIso()
          return toRequest(r)
        }

        // cancel (BR14)
        if (r.commuterId !== u.id) throw new ApiError('forbidden')
        if (r.status !== 'pending' && r.status !== 'accepted')
          throw new ApiError('validation', { message: 'This request can no longer be cancelled.' })
        const reason = change.reason?.trim() ?? ''
        if (r.status === 'accepted') {
          validate([[reason.length === 0, 'reason', 'Tell the publisher why you’re cancelling.']])
          j.seatsAvailable = Math.min(j.vehicleCapacity, j.seatsAvailable + 1)
          setJourneyStatusAfterSeatChange(j)
          notify(
            j.publisherId,
            'request_cancelled',
            'Rider cancelled',
            `${toPublicUser(u.id).displayName} cancelled: ${reason}`,
            '/commuter/journeys',
          )
        }
        r.status = 'cancelled'
        r.cancelReason = reason || null
        r.respondedAt = nowIso()
        return toRequest(r)
      }),

    // ---- operators & routes
    getRoute: (id) =>
      run(() => {
        const r = db.routes.find((x) => x.id === id)
        const u = currentUser()
        const canSee =
          r &&
          (isPublicRoute(r) ||
            (u && (ownOperator(u)?.id === r.operatorId || u.roles.includes('admin'))))
        if (!r || !canSee) throw new ApiError('not_found')
        return toRoute(r)
      }),

    getMyOperator: () => run(() => ownOperator(requireUser()) ?? null),

    applyAsOperator: (input) =>
      run(() => {
        const u = requireVerified()
        if (ownOperator(u))
          throw new ApiError('validation', { message: 'You already have an operator profile.' })
        validate([
          [input.businessName.trim().length < 2, 'businessName', 'Enter your business name.'],
          [
            !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.contactEmail),
            'contactEmail',
            'Enter a valid email address.',
          ],
          [input.serviceArea.trim().length < 2, 'serviceArea', 'Describe where you operate.'],
        ])
        const op: Operator = {
          id: newId('op'),
          ownerId: u.id,
          businessName: input.businessName.trim(),
          description: input.description.trim(),
          contactEmail: input.contactEmail.trim(),
          serviceArea: input.serviceArea.trim(),
          verificationStatus: 'pending',
          verifiedAt: null,
          rejectionReason: null,
          documents: [],
          createdAt: nowIso(),
        }
        db.operators.push(op)
        if (!u.roles.includes('operator')) u.roles.push('operator')
        notifyAdmins(
          'verification_submitted',
          'Operator ready for review',
          'An operator application is ready for review.',
          '/admin',
        )
        return op
      }),

    uploadOperatorDocument: (operatorId, documentType, file) =>
      run(() => {
        const u = requireUser()
        const op = operatorOf(operatorId)
        if (op.ownerId !== u.id) throw new ApiError('forbidden')
        if (!UPLOAD_TYPES.includes(file.type))
          throw new ApiError('upload_failed', { message: 'Upload a PDF, JPG or PNG file.' })
        if (file.size > MAX_UPLOAD_BYTES)
          throw new ApiError('upload_failed', { message: 'Files must be 5 MB or smaller.' })
        const doc = {
          id: newId('doc'),
          documentType,
          fileName: file.name,
          status: 'submitted' as const,
          submittedAt: nowIso(),
          rejectionReason: null,
        }
        op.documents = [...op.documents.filter((d) => d.documentType !== documentType), doc]
        if (op.verificationStatus === 'rejected') {
          op.verificationStatus = 'pending'
          op.rejectionReason = null
        }
        return doc
      }),

    listMyRoutes: () =>
      run(() => {
        const op = ownOperator(requireUser())
        return op ? db.routes.filter((r) => r.operatorId === op.id).map(toRoute) : []
      }),

    createRoute: (input) =>
      run(() => {
        const u = requireUser()
        const op = ownOperator(u)
        if (!op) throw new ApiError('forbidden')
        if (op.verificationStatus !== 'verified') throw new ApiError('verification_pending') // BR9
        validateRoute(input)
        const r: RouteRecord = {
          id: newId('r'),
          operatorId: op.id,
          routeName: input.routeName.trim(),
          transportType: input.transportType,
          originId: input.originId,
          destinationId: input.destinationId,
          stops: input.stopIds.map((placeId) => ({ placeId, estimatedTime: null })),
          fareCents: input.fareType === 'contact' ? null : input.fareCents,
          fareType: input.fareType,
          scheduleDescription: input.scheduleDescription.trim(),
          status: 'active',
          lastConfirmedAt: nowIso(),
          createdAt: nowIso(),
        }
        db.routes.push(r)
        return toRoute(r)
      }),

    updateRoute: (id, input) =>
      run(() => {
        const r = ownedRoute(id, requireUser())
        if (r.status === 'suspended')
          throw new ApiError('forbidden', { message: 'This route is suspended. Contact support.' })
        const merged = {
          routeName: input.routeName ?? r.routeName,
          transportType: input.transportType ?? r.transportType,
          originId: input.originId ?? r.originId,
          destinationId: input.destinationId ?? r.destinationId,
          stopIds: input.stopIds ?? r.stops.map((s) => s.placeId),
          fareCents: input.fareCents !== undefined ? input.fareCents : r.fareCents,
          fareType: input.fareType ?? r.fareType,
          scheduleDescription: input.scheduleDescription ?? r.scheduleDescription,
        }
        validateRoute(merged)
        Object.assign(r, {
          routeName: merged.routeName.trim(),
          transportType: merged.transportType,
          originId: merged.originId,
          destinationId: merged.destinationId,
          stops: merged.stopIds.map(
            (placeId) =>
              r.stops.find((s) => s.placeId === placeId) ?? { placeId, estimatedTime: null },
          ),
          fareCents: merged.fareType === 'contact' ? null : merged.fareCents,
          fareType: merged.fareType,
          scheduleDescription: merged.scheduleDescription.trim(),
          lastConfirmedAt: nowIso(), // editing counts as confirming
        })
        if (input.status) r.status = input.status
        return toRoute(r)
      }),

    reconfirmRoute: (id) =>
      run(() => {
        const r = ownedRoute(id, requireUser())
        r.lastConfirmedAt = nowIso()
        return toRoute(r)
      }),

    // ---- enquiries
    sendEnquiry: (routeId, message) =>
      run(() => {
        const u = requireVerified() // BR1
        const r = db.routes.find((x) => x.id === routeId)
        if (!r || !isPublicRoute(r)) throw new ApiError('not_found')
        validate([
          [message.trim().length === 0, 'message', 'Write your question.'],
          [message.length > 1000, 'message', 'Use 1000 characters or fewer.'],
        ])
        const e = {
          id: newId('enq'),
          routeId,
          commuterId: u.id,
          message: message.trim(),
          response: null,
          status: 'new' as const,
          createdAt: nowIso(),
          respondedAt: null,
        }
        db.enquiries.push(e)
        notify(
          operatorOf(r.operatorId).ownerId,
          'enquiry_received',
          'New enquiry',
          'A commuter has enquired about your route.',
          '/operator',
        )
        return toEnquiry(e)
      }),

    listMyEnquiries: () =>
      run(() => {
        const u = requireUser()
        const op = ownOperator(u)
        const myRoutes = new Set(
          op ? db.routes.filter((r) => r.operatorId === op.id).map((r) => r.id) : [],
        )
        const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
          b.createdAt.localeCompare(a.createdAt)
        return {
          sent: db.enquiries
            .filter((e) => e.commuterId === u.id)
            .sort(byNewest)
            .map(toEnquiry),
          received: db.enquiries
            .filter((e) => myRoutes.has(e.routeId))
            .sort(byNewest)
            .map(toEnquiry),
        }
      }),

    respondToEnquiry: (id, response) =>
      run(() => {
        const u = requireUser()
        const e = db.enquiries.find((x) => x.id === id)
        if (!e) throw new ApiError('not_found')
        ownedRoute(e.routeId, u)
        validate([[response.trim().length === 0, 'response', 'Write a reply.']])
        e.response = response.trim()
        e.status = 'responded'
        e.respondedAt = nowIso()
        notify(
          e.commuterId,
          'enquiry_responded',
          'Operator replied',
          'The operator has responded to your enquiry.',
          '/requests',
        )
        return toEnquiry(e)
      }),

    // ---- notifications
    listNotifications: () =>
      run(() => {
        const u = requireUser()
        return db.notifications
          .filter((n) => n.recipientId === u.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(({ recipientId: _r, ...n }) => n)
      }),

    markNotificationRead: (id) =>
      run(() => {
        const u = requireUser()
        const n = db.notifications.find((x) => x.id === id && x.recipientId === u.id)
        if (!n) throw new ApiError('not_found')
        n.isRead = true
      }),

    markAllNotificationsRead: () =>
      run(() => {
        const u = requireUser()
        for (const n of db.notifications) if (n.recipientId === u.id) n.isRead = true
      }),

    // ---- reports
    createReport: (input) =>
      run(() => {
        const u = requireUser()
        validate([
          [!input.reason, 'reason', 'Choose a reason.'],
          [input.description.length > 1000, 'description', 'Use 1000 characters or fewer.'],
        ])
        db.reports.push({
          ...input,
          id: newId('rep'),
          reporterId: u.id,
          status: 'open',
          resolutionNote: null,
          createdAt: nowIso(),
        })
        notifyAdmins(
          'report_received',
          'New report',
          'A new report requires review.',
          '/admin/reports',
        )
      }),

    // ---- admin
    listVerificationQueue: () =>
      run(() => {
        requireRole('admin')
        return db.operators
          .filter(
            (o) => o.verificationStatus === 'pending' || o.verificationStatus === 'under_review',
          )
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      }),

    decideVerification: (operatorId, decision) =>
      run(() => {
        const admin = requireRole('admin')
        const op = operatorOf(operatorId)
        const reason = decision.reason?.trim() ?? ''
        validate([
          [
            (decision.status === 'rejected' || decision.status === 'suspended') && !reason,
            'reason',
            'Give a reason. The operator will see it.',
          ],
        ])
        op.verificationStatus = decision.status
        op.verifiedAt = decision.status === 'verified' ? nowIso() : op.verifiedAt
        op.rejectionReason = reason || null
        audit(admin.id, `operator.${decision.status}`, 'operator', op.id, { reason })
        notify(
          op.ownerId,
          'verification_decision',
          'Verification update',
          'Your operator profile status has changed.',
          '/operator/verification',
        )
        return op
      }),

    listReports: () =>
      run(() => {
        requireRole('admin')
        return [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toReport)
      }),

    decideReport: (id, decision) =>
      run(() => {
        const admin = requireRole('admin')
        const r = db.reports.find((x) => x.id === id)
        if (!r) throw new ApiError('not_found')
        validate([
          [
            decision.resolutionNote.trim().length === 0,
            'resolutionNote',
            'Record what was decided and why.',
          ],
        ])
        r.status = decision.status
        r.resolutionNote = decision.resolutionNote.trim()
        if (decision.suspendTarget) {
          // BR15: suspend while investigating; reason and actor are logged.
          if (r.targetType === 'route') {
            const route = db.routes.find((x) => x.id === r.targetId)
            if (route) route.status = 'suspended'
          } else if (r.targetType === 'journey') {
            const j = db.journeys.find((x) => x.id === r.targetId)
            if (j && j.status !== 'cancelled' && j.status !== 'completed') j.status = 'paused'
          } else if (r.targetType === 'operator') {
            const op = db.operators.find((x) => x.id === r.targetId)
            if (op) op.verificationStatus = 'suspended'
          } else if (r.targetType === 'user') {
            const target = db.users.find((x) => x.id === r.targetId)
            if (target) target.accountStatus = 'suspended'
          }
        }
        audit(admin.id, `report.${decision.status}`, r.targetType, r.targetId, {
          reportId: r.id,
          suspended: !!decision.suspendTarget,
          note: r.resolutionNote,
        })
        return toReport(r)
      }),

    getAdminMetrics: () =>
      run(() => {
        requireRole('admin')
        const requesters = new Map<string, number>()
        for (const r of db.requests)
          requesters.set(r.commuterId, (requesters.get(r.commuterId) ?? 0) + 1)
        return {
          searches: db.counters.searches,
          searchesWithResults: db.counters.searchesWithResults,
          enquiries: db.enquiries.length,
          joinRequests: db.requests.length,
          acceptedRequests: db.requests.filter((r) => r.status === 'accepted').length,
          repeatUsers: [...requesters.values()].filter((n) => n > 1).length,
          pendingVerifications: db.operators.filter(
            (o) => o.verificationStatus === 'pending' || o.verificationStatus === 'under_review',
          ).length,
          openReports: db.reports.filter((r) => r.status === 'open' || r.status === 'investigating')
            .length,
        }
      }),
  }

  function validateRoute(input: {
    routeName: string
    originId: string
    destinationId: string
    fareCents: number | null
    fareType: string
    scheduleDescription: string
  }) {
    // BR10
    validate([
      [input.routeName.trim().length < 3, 'routeName', 'Give the route a name.'],
      [!placeById(input.originId), 'originId', 'Choose a starting point from the list.'],
      [!placeById(input.destinationId), 'destinationId', 'Choose a destination from the list.'],
      [input.originId === input.destinationId, 'destinationId', 'Choose a different destination.'],
      [
        input.fareType !== 'contact' &&
          (input.fareCents === null || !Number.isInteger(input.fareCents)),
        'fareCents',
        'Enter a fare, or choose “Contact for fare”.',
      ],
      [input.fareCents !== null && input.fareCents < 0, 'fareCents', 'Fare can’t be negative.'],
      [
        input.scheduleDescription.trim().length === 0,
        'scheduleDescription',
        'Describe when this service runs.',
      ],
    ])
  }

  return api
}
