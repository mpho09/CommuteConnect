import { describe, expect, it } from 'vitest'
import { addDays, sastToIso, sastToday } from '../../time'
import { ApiError } from '../errors'
import type { JourneyInput } from '../types'
import { createMockApi } from './mockApi'
import { SAMPLE_PASSWORD } from './seed'

// Fixed clock: Tuesday 24 Nov 2026, 10:00 SAST.
const NOW = new Date('2026-11-24T08:00:00Z')
const TODAY = sastToday(NOW)

function api(userId: string | null = 'u-thandi') {
  return createMockApi({ userId, now: () => NOW, config: { latencyMs: 0 } })
}

async function errorOf(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p
  } catch (e) {
    if (e instanceof ApiError) return e
    throw e
  }
  throw new Error('Expected the call to fail')
}

const onceOff = (over: Partial<JourneyInput> = {}): JourneyInput => ({
  originId: 'tembisa-plaza',
  destinationId: 'midrand-gautrain',
  journeyType: 'once_off',
  departureAt: sastToIso(addDays(TODAY, 1), '07:00'),
  schedule: null,
  seatsAvailable: 2,
  vehicleCapacity: 3,
  costSharingCents: null,
  notes: '',
  ...over,
})

describe('auth and session', () => {
  it('signs in with sample credentials and hides the password', async () => {
    const a = api(null)
    expect((await a.getSession()).user).toBeNull()
    const me = await a.signIn('Thandi.Sample@example.com', SAMPLE_PASSWORD)
    expect(me.fullName).toBe('Thandi Ndlovu')
    expect(me).not.toHaveProperty('password')
    expect((await a.getSession()).user?.id).toBe('u-thandi')
  })

  it('rejects wrong passwords without saying which part was wrong', async () => {
    const e = await errorOf(api(null).signIn('thandi.sample@example.com', 'nope'))
    expect(e.code).toBe('invalid_credentials')
  })

  it('requires terms acceptance on sign up and starts unverified (BR1, BR18)', async () => {
    const a = api(null)
    const e = await errorOf(
      a.signUp({
        fullName: 'Test User',
        email: 'new@example.com',
        password: 'long-enough',
        roles: ['commuter'],
        acceptedTerms: false,
      }),
    )
    expect(e.fieldErrors.acceptedTerms).toBeDefined()
    const me = await a.signUp({
      fullName: 'Test User',
      email: 'new@example.com',
      password: 'long-enough',
      roles: ['commuter'],
      acceptedTerms: true,
    })
    expect(me.emailVerified).toBe(false)
  })

  it('persists the persona through storage', async () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
    createMockApi({ storage, config: { latencyMs: 0 } }).switchUser('u-admin')
    const reloaded = createMockApi({ storage, config: { latencyMs: 0 } })
    expect((await reloaded.getSession()).user?.roles).toEqual(['admin'])
  })
})

describe('privacy (BR3, BR12)', () => {
  it('shows publishers as first name + initial and journeys as zones only', async () => {
    const j = await api().getJourney('j-kabelo-weekdays')
    expect(j.publisher.displayName).toBe('Kabelo M.')
    expect(j.originZone).toBe('Tembisa Plaza area')
    expect(j).not.toHaveProperty('originId')
    expect(JSON.stringify(j)).not.toContain('example.com')
  })
})

describe('search', () => {
  it('returns operator routes and shared journeys separately', async () => {
    const r = await api().search({ originId: 'tembisa-plaza', destinationId: 'midrand-gautrain' })
    expect(r.routes.map((x) => x.id)).toEqual(
      expect.arrayContaining(['r-shuttle-tembisa-midrand', 'r-taxi-tembisa-midrand']),
    )
    expect(r.journeys.map((x) => x.id)).toContain('j-kabelo-weekdays')
  })

  it('never returns suspended operators, full or cancelled journeys', async () => {
    const a = api()
    const pta = await a.search({ originId: 'pretoria-station', destinationId: 'park-station' })
    expect(pta.routes).toHaveLength(0)
    const kp = await a.search({ originId: 'kempton-park', destinationId: 'waterfall-city' })
    expect(kp.journeys).toHaveLength(0) // j-kabelo-full
  })

  it('flags stale listings as needing confirmation (BR11)', async () => {
    const r = await api().search({ originId: 'kempton-park', destinationId: 'sandton-gautrain' })
    const stale = r.routes.find((x) => x.id === 'r-taxi-kempton-sandton')!
    expect(stale.needsConfirmation).toBe(true)
    expect(stale.fareCents).toBeNull()
  })

  it('filters journeys by day and time window', async () => {
    const a = api()
    const saturday = addDays(TODAY, 4) // Tue + 4 = Sat
    const sat = await a.search({
      originId: 'tembisa-plaza',
      destinationId: 'midrand-gautrain',
      date: saturday,
    })
    expect(sat.journeys).toHaveLength(0)
    const late = await a.search({
      originId: 'tembisa-plaza',
      destinationId: 'midrand-gautrain',
      time: '12:00',
      windowMinutes: 30,
    })
    expect(late.journeys).toHaveLength(0)
  })

  it('rejects past dates (BR4)', async () => {
    const e = await errorOf(
      api().search({
        originId: 'tembisa-plaza',
        destinationId: 'midrand-gautrain',
        date: addDays(TODAY, -1),
      }),
    )
    expect(e.fieldErrors.date).toBeDefined()
  })
})

describe('matching (F4)', () => {
  it('suggests Kabelo’s journey to Thandi with plain-language reasons', async () => {
    const [top] = await api().listMatches()
    expect(top.journey.id).toBe('j-kabelo-weekdays')
    expect(top.reasons).toContain('Departs 15 min before your usual time')
    expect(top.reasons).toContain('Runs on 5 of your 5 travel days')
  })

  it('never suggests your own journeys', async () => {
    const matches = await api('u-kabelo').listMatches({
      originId: 'tembisa-plaza',
      destinationId: 'midrand-gautrain',
      time: '06:45',
    })
    expect(matches.map((m) => m.journey.publisher.id)).not.toContain('u-kabelo')
  })
})

describe('publishing journeys', () => {
  it('requires a verified email (BR1)', async () => {
    expect((await errorOf(api('u-naledi').createJourney(onceOff()))).code).toBe(
      'email_not_verified',
    )
  })

  it('rejects past departures and too many seats (BR4, BR6)', async () => {
    const e = await errorOf(
      api().createJourney(onceOff({ departureAt: sastToIso(TODAY, '07:00'), seatsAvailable: 5 })),
    )
    expect(e.code).toBe('validation')
    expect(Object.keys(e.fieldErrors)).toEqual(
      expect.arrayContaining(['departureAt', 'seatsAvailable']),
    )
  })

  it('requires at least one day for recurring journeys (BR5)', async () => {
    const e = await errorOf(
      api().createJourney(
        onceOff({
          journeyType: 'recurring',
          departureAt: null,
          schedule: { daysOfWeek: [], departureTime: '06:30', validFrom: TODAY, validUntil: null },
        }),
      ),
    )
    expect(e.fieldErrors.daysOfWeek).toBeDefined()
  })

  it('creates a valid journey', async () => {
    const a = api()
    const j = await a.createJourney(onceOff())
    expect(j.status).toBe('open')
    expect((await a.listMyJourneys()).map((x) => x.id)).toContain(j.id)
  })
})

describe('join requests (F7)', () => {
  it('blocks requests to your own journey and duplicates (BR7)', async () => {
    expect(
      (await errorOf(api('u-kabelo').requestToJoin('j-kabelo-weekdays', { message: '' }))).code,
    ).toBe('forbidden')
    expect(
      (await errorOf(api('u-thandi').requestToJoin('j-kabelo-weekdays', { message: '' }))).code,
    ).toBe('duplicate_request')
  })

  it('only lets the publisher accept, and never overbooks (BR7, BR8)', async () => {
    const a = api('u-kabelo')
    // Lerato's journey has 1 seat; two commuters ask for it.
    a.switchUser('u-kabelo')
    const r1 = await a.requestToJoin('j-lerato-mwf', { message: 'One' })
    a.switchUser('u-sipho')
    const r2 = await a.requestToJoin('j-lerato-mwf', { message: 'Two' })

    expect((await errorOf(a.updateRequest(r1.id, { action: 'accept' }))).code).toBe('forbidden')

    a.switchUser('u-lerato')
    await a.updateRequest(r1.id, { action: 'accept' })
    expect((await a.getJourney('j-lerato-mwf')).status).toBe('full')
    expect((await errorOf(a.updateRequest(r2.id, { action: 'accept' }))).code).toBe(
      'seat_unavailable',
    )
  })

  it('needs a reason to cancel an accepted request, and frees the seat (BR14)', async () => {
    const a = api('u-thandi')
    const before = (await a.getJourney('j-lerato-mwf')).seatsAvailable
    const e = await errorOf(a.updateRequest('req-thandi-lerato', { action: 'cancel' }))
    expect(e.fieldErrors.reason).toBeDefined()

    await a.updateRequest('req-thandi-lerato', { action: 'cancel', reason: 'Changed jobs' })
    expect((await a.getJourney('j-lerato-mwf')).seatsAvailable).toBe(before + 1)

    a.switchUser('u-lerato')
    const notes = await a.listNotifications()
    expect(notes[0].body).toContain('Changed jobs')
  })

  it('notifies requesters when a journey is cancelled', async () => {
    const a = api('u-kabelo')
    await a.updateJourney('j-kabelo-weekdays', { status: 'cancelled' })
    a.switchUser('u-thandi')
    const { sent } = await a.listMyRequests()
    expect(sent.find((r) => r.id === 'req-thandi-kabelo')?.status).toBe('cancelled')
    expect((await a.listNotifications())[0].type).toBe('journey_changed')
  })
})

describe('operators (F5, F6)', () => {
  it('lets pending operators upload documents but not publish routes (BR9)', async () => {
    const a = api('u-lerato')
    const op = (await a.getMyOperator())!
    const file = new File(['%PDF'], 'licence.pdf', { type: 'application/pdf' })
    await a.uploadOperatorDocument(op.id, 'operating_licence', file)

    const e = await errorOf(
      a.createRoute({
        routeName: 'New route',
        transportType: 'shuttle',
        originId: 'tembisa-plaza',
        destinationId: 'midrand-cbd',
        stopIds: [],
        fareCents: 2000,
        fareType: 'fixed',
        scheduleDescription: 'Weekdays',
      }),
    )
    expect(e.code).toBe('verification_pending')
  })

  it('rejects unsupported upload types', async () => {
    const a = api('u-lerato')
    const op = (await a.getMyOperator())!
    const e = await errorOf(
      a.uploadOperatorDocument(
        op.id,
        'operating_licence',
        new File(['x'], 'a.exe', { type: 'application/x-msdownload' }),
      ),
    )
    expect(e.code).toBe('upload_failed')
  })

  it('requires a fare or "contact for fare" (BR10)', async () => {
    const e = await errorOf(
      api('u-sipho').createRoute({
        routeName: 'New route',
        transportType: 'minibus_taxi',
        originId: 'tembisa-rank',
        destinationId: 'midrand-cbd',
        stopIds: [],
        fareCents: null,
        fareType: 'fixed',
        scheduleDescription: 'Daily',
      }),
    )
    expect(e.fieldErrors.fareCents).toBeDefined()
  })

  it('reconfirming a stale route clears "needs confirmation" (BR11)', async () => {
    const r = await api('u-sipho').reconfirmRoute('r-taxi-kempton-sandton')
    expect(r.needsConfirmation).toBe(false)
  })
})

describe('admin (F9, F10)', () => {
  it('is admin-only', async () => {
    expect((await errorOf(api('u-thandi').listReports())).code).toBe('forbidden')
  })

  it('requires a reason to reject, logs the decision and notifies the operator (BR9)', async () => {
    const a = api('u-admin')
    const e = await errorOf(a.decideVerification('op-midrand', { status: 'rejected' }))
    expect(e.fieldErrors.reason).toBeDefined()

    const op = await a.decideVerification('op-midrand', { status: 'verified' })
    expect(op.verifiedAt).not.toBeNull()
    expect(a.db.audit.at(-1)).toMatchObject({ actorId: 'u-admin', action: 'operator.verified' })

    a.switchUser('u-lerato')
    expect((await a.listNotifications())[0].type).toBe('verification_decision')
  })

  it('suspends a reported route and logs who did it (BR15)', async () => {
    const a = api('u-admin')
    await a.decideReport('rep-1', {
      status: 'actioned',
      resolutionNote: 'Schedule confirmed wrong; suspended until updated.',
      suspendTarget: true,
    })
    expect(a.db.routes.find((r) => r.id === 'r-taxi-kempton-sandton')?.status).toBe('suspended')
    expect(a.db.audit.at(-1)).toMatchObject({
      actorId: 'u-admin',
      targetId: 'r-taxi-kempton-sandton',
    })
  })

  it('shows reporter identity to admins only', async () => {
    const reports = await api('u-admin').listReports()
    expect(reports.find((r) => r.id === 'rep-1')?.reporter.displayName).toBe('Thandi N.')
  })
})

describe('simulated network', () => {
  it('fails every call when failureRate is 1', async () => {
    const a = createMockApi({ userId: 'u-thandi', config: { latencyMs: 0, failureRate: 1 } })
    expect((await errorOf(a.getMe())).code).toBe('server_error')
  })

  it('returns copies so callers can’t mutate the store', async () => {
    const a = api()
    const j = await a.getJourney('j-kabelo-weekdays')
    j.seatsAvailable = 99
    expect((await a.getJourney('j-kabelo-weekdays')).seatsAvailable).toBe(2)
  })
})
