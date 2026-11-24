/**
 * SAMPLE / DEMO data for the in-memory mock (PRD §8.4, §10.6).
 * Everyone and everything here is fictional. Contact details use the
 * reserved example.com domain; no real documents, licences or phone numbers.
 *
 * Dates are generated relative to "now" so journeys are always upcoming.
 */
import { addDays, sastToIso, sastToday, weekdayOf } from '../../time'
import type {
  AppNotification,
  JourneyOccurrence,
  JourneyStatus,
  JourneyType,
  Me,
  Operator,
  RecurringSchedule,
  ReportInput,
  ReportStatus,
  RequestStatus,
  EnquiryStatus,
  FareType,
  RouteStatus,
  TransportType,
} from '../types'

// ---------------------------------------------------------------- record shapes

export interface UserRecord extends Me {
  password: string
}

export interface RouteRecord {
  id: string
  operatorId: string
  routeName: string
  transportType: TransportType
  originId: string
  destinationId: string
  stops: { placeId: string; estimatedTime: string | null }[]
  fareCents: number | null
  fareType: FareType
  scheduleDescription: string
  status: RouteStatus
  lastConfirmedAt: string
  createdAt: string
}

export interface JourneyRecord {
  id: string
  publisherId: string
  originId: string
  destinationId: string
  journeyType: JourneyType
  departureAt: string | null
  schedule: RecurringSchedule | null
  seatsAvailable: number
  vehicleCapacity: number
  costSharingCents: number | null
  notes: string
  status: JourneyStatus
  createdAt: string
}

export interface RequestRecord {
  id: string
  journeyId: string
  occurrenceId: string | null
  commuterId: string
  message: string
  status: RequestStatus
  cancelReason: string | null
  createdAt: string
  respondedAt: string | null
}

export interface EnquiryRecord {
  id: string
  routeId: string
  commuterId: string
  message: string
  response: string | null
  status: EnquiryStatus
  createdAt: string
  respondedAt: string | null
}

export interface NotificationRecord extends AppNotification {
  recipientId: string
}

export interface ReportRecord extends ReportInput {
  id: string
  reporterId: string
  status: ReportStatus
  resolutionNote: string | null
  createdAt: string
}

export interface AuditRecord {
  id: string
  actorId: string
  action: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface MockDb {
  users: UserRecord[]
  operators: Operator[]
  routes: RouteRecord[]
  journeys: JourneyRecord[]
  occurrences: JourneyOccurrence[]
  requests: RequestRecord[]
  enquiries: EnquiryRecord[]
  notifications: NotificationRecord[]
  reports: ReportRecord[]
  audit: AuditRecord[]
  /** Outstanding password-reset tokens (single use, expire after RESET_TOKEN_MINUTES). */
  resetTokens: Array<{ token: string; userId: string; expiresAt: string }>
  counters: { searches: number; searchesWithResults: number }
}

// ---------------------------------------------------------------- personas

/** Password for every sample account. Mock only. */
export const SAMPLE_PASSWORD = 'sample-pass'

export interface Persona {
  userId: string
  label: string
  description: string
}

export const PERSONAS: Persona[] = [
  {
    userId: 'u-thandi',
    label: 'Thandi Ndlovu',
    description: 'Commuter · Tembisa → Midrand, weekdays ~07:00',
  },
  {
    userId: 'u-kabelo',
    label: 'Kabelo Maseko',
    description: 'Commuter · publishes a recurring shared journey',
  },
  { userId: 'u-naledi', label: 'Naledi Khumalo', description: 'Commuter · email not verified yet' },
  {
    userId: 'u-lerato',
    label: 'Lerato Mokoena',
    description: 'Operator · Midrand Shuttle Demo (pending)',
  },
  {
    userId: 'u-sipho',
    label: 'Sipho Dlamini',
    description: 'Operator · Gauteng Commuter Services Demo (verified)',
  },
  {
    userId: 'u-admin',
    label: 'Admin (test only)',
    description: 'Admin · reviews operators and reports',
  },
]

// ---------------------------------------------------------------- builder

const WEEKDAYS = [1, 2, 3, 4, 5]

export function createSeed(now: Date = new Date()): MockDb {
  const today = sastToday(now)
  const daysAgo = (n: number, time = '09:00') => sastToIso(addDays(today, -n), time)
  const inDays = (n: number, time: string) => sastToIso(addDays(today, n), time)

  const prefsNone = {
    usualOriginId: null,
    usualDestinationId: null,
    usualDepartureTime: null,
    travelDays: [],
    notifyByEmail: true,
  }

  const user = (
    u: Partial<UserRecord> & Pick<UserRecord, 'id' | 'fullName' | 'email' | 'roles'>,
  ): UserRecord => ({
    emailVerified: true,
    phone: null,
    accountStatus: 'active',
    preferences: prefsNone,
    profileComplete: true,
    createdAt: daysAgo(60),
    password: SAMPLE_PASSWORD,
    ...u,
  })

  const users: UserRecord[] = [
    user({
      id: 'u-thandi',
      fullName: 'Thandi Ndlovu',
      email: 'thandi.sample@example.com',
      roles: ['commuter'],
      preferences: {
        usualOriginId: 'tembisa-plaza',
        usualDestinationId: 'midrand-gautrain',
        usualDepartureTime: '07:00',
        travelDays: WEEKDAYS,
        notifyByEmail: true,
      },
    }),
    user({
      id: 'u-kabelo',
      fullName: 'Kabelo Maseko',
      email: 'kabelo.sample@example.com',
      roles: ['commuter'],
    }),
    user({
      id: 'u-naledi',
      fullName: 'Naledi Khumalo',
      email: 'naledi.sample@example.com',
      roles: ['commuter'],
      emailVerified: false,
      profileComplete: false,
      createdAt: daysAgo(1),
    }),
    user({
      id: 'u-lerato',
      fullName: 'Lerato Mokoena',
      email: 'lerato.demo@example.com',
      roles: ['commuter', 'operator'],
    }),
    user({
      id: 'u-sipho',
      fullName: 'Sipho Dlamini',
      email: 'sipho.demo@example.com',
      roles: ['operator'],
    }),
    user({
      id: 'u-admin',
      fullName: 'Admin Demo',
      email: 'admin.test@example.com',
      roles: ['admin'],
    }),
    // Owners of operators that can't be signed into (rejected / suspended examples)
    user({
      id: 'u-owner3',
      fullName: 'Pieter van Wyk',
      email: 'owner3.demo@example.com',
      roles: ['operator'],
    }),
    user({
      id: 'u-owner4',
      fullName: 'Ayanda Zulu',
      email: 'owner4.demo@example.com',
      roles: ['operator'],
    }),
  ]

  const operators: Operator[] = [
    {
      id: 'op-midrand',
      ownerId: 'u-lerato',
      businessName: 'Midrand Shuttle Demo',
      description: 'DEMO · Small shuttle service between Tembisa and Midrand Gautrain.',
      contactEmail: 'bookings.demo@example.com',
      serviceArea: 'Tembisa, Midrand',
      verificationStatus: 'pending',
      verifiedAt: null,
      rejectionReason: null,
      createdAt: daysAgo(4),
      documents: [
        {
          id: 'doc-1',
          documentType: 'operating_licence',
          fileName: 'SAMPLE-operating-licence.pdf',
          status: 'submitted',
          submittedAt: daysAgo(3),
          rejectionReason: null,
        },
        {
          id: 'doc-2',
          documentType: 'business_registration',
          fileName: 'SAMPLE-business-registration.pdf',
          status: 'submitted',
          submittedAt: daysAgo(3),
          rejectionReason: null,
        },
      ],
    },
    {
      id: 'op-gcs',
      ownerId: 'u-sipho',
      businessName: 'Gauteng Commuter Services Demo',
      description: 'DEMO · Minibus taxi and bus routes across Ekurhuleni and Johannesburg North.',
      contactEmail: 'gcs.demo@example.com',
      serviceArea: 'Tembisa, Kempton Park, Midrand, Sandton',
      verificationStatus: 'verified',
      verifiedAt: daysAgo(40),
      rejectionReason: null,
      createdAt: daysAgo(55),
      documents: [],
    },
    {
      id: 'op-northside',
      ownerId: 'u-owner3',
      businessName: 'Northside Lifts Demo',
      description: 'DEMO · Rejected application example.',
      contactEmail: 'northside.demo@example.com',
      serviceArea: 'Centurion',
      verificationStatus: 'rejected',
      verifiedAt: null,
      rejectionReason: 'Operating licence document was unreadable. Please upload a clear copy.',
      createdAt: daysAgo(20),
      documents: [],
    },
    {
      id: 'op-metro',
      ownerId: 'u-owner4',
      businessName: 'Metro Coaches Demo',
      description: 'DEMO · Suspended operator example.',
      contactEmail: 'metro.demo@example.com',
      serviceArea: 'Pretoria, Johannesburg',
      verificationStatus: 'suspended',
      verifiedAt: daysAgo(90),
      rejectionReason: 'Suspended while a safety report is investigated.',
      createdAt: daysAgo(120),
      documents: [],
    },
  ]

  const route = (
    r: Omit<RouteRecord, 'status' | 'createdAt' | 'stops'> & Partial<RouteRecord>,
  ): RouteRecord => ({
    status: 'active',
    createdAt: daysAgo(30),
    stops: [],
    ...r,
  })

  const routes: RouteRecord[] = [
    route({
      id: 'r-shuttle-tembisa-midrand',
      operatorId: 'op-midrand',
      routeName: 'Tembisa – Midrand Gautrain shuttle (DEMO)',
      transportType: 'shuttle',
      originId: 'tembisa-plaza',
      destinationId: 'midrand-gautrain',
      fareCents: 2500,
      fareType: 'fixed',
      scheduleDescription: 'Weekdays · 06:00, 06:45, 07:30',
      lastConfirmedAt: daysAgo(2),
    }),
    route({
      id: 'r-taxi-tembisa-midrand',
      operatorId: 'op-gcs',
      routeName: 'Tembisa Rank – Midrand CBD (DEMO)',
      transportType: 'minibus_taxi',
      originId: 'tembisa-rank',
      destinationId: 'midrand-cbd',
      stops: [
        { placeId: 'ivory-park', estimatedTime: null },
        { placeId: 'midrand-gautrain', estimatedTime: null },
      ],
      fareCents: 1800,
      fareType: 'fixed',
      scheduleDescription: 'Daily · every 20 min, 05:00–19:00',
      lastConfirmedAt: daysAgo(5),
    }),
    route({
      id: 'r-taxi-kempton-sandton',
      operatorId: 'op-gcs',
      routeName: 'Kempton Park – Sandton Gautrain (DEMO)',
      transportType: 'minibus_taxi',
      originId: 'kempton-park',
      destinationId: 'sandton-gautrain',
      fareCents: null,
      fareType: 'contact',
      scheduleDescription: 'Weekdays · peak hours 06:00–09:00',
      lastConfirmedAt: daysAgo(75), // stale -> "Needs confirmation"
    }),
    route({
      id: 'r-bus-tembisa-rosebank',
      operatorId: 'op-gcs',
      routeName: 'Tembisa – Rosebank express bus (DEMO)',
      transportType: 'bus',
      originId: 'tembisa-plaza',
      destinationId: 'rosebank',
      stops: [{ placeId: 'sandton-gautrain', estimatedTime: '07:05' }],
      fareCents: 3500,
      fareType: 'from',
      scheduleDescription: 'Weekdays · 06:15, 07:15',
      lastConfirmedAt: daysAgo(10),
    }),
    route({
      id: 'r-coach-pta-jhb',
      operatorId: 'op-metro',
      routeName: 'Pretoria – Park Station coach (DEMO)',
      transportType: 'coach',
      originId: 'pretoria-station',
      destinationId: 'park-station',
      fareCents: 6000,
      fareType: 'fixed',
      scheduleDescription: 'Daily · 06:00, 12:00, 17:00',
      status: 'suspended',
      lastConfirmedAt: daysAgo(15),
    }),
  ]

  const journey = (
    j: Omit<JourneyRecord, 'createdAt' | 'notes' | 'costSharingCents' | 'status'> &
      Partial<JourneyRecord>,
  ): JourneyRecord => ({
    createdAt: daysAgo(7),
    notes: '',
    costSharingCents: null,
    status: 'open',
    ...j,
  })

  const journeys: JourneyRecord[] = [
    journey({
      id: 'j-kabelo-weekdays',
      publisherId: 'u-kabelo',
      originId: 'tembisa-plaza',
      destinationId: 'midrand-gautrain',
      journeyType: 'recurring',
      departureAt: null,
      schedule: {
        daysOfWeek: WEEKDAYS,
        departureTime: '06:45',
        validFrom: addDays(today, -14),
        validUntil: null,
      },
      seatsAvailable: 2,
      vehicleCapacity: 3,
      costSharingCents: 2000,
      notes: 'SAMPLE · Leaving from the Tembisa Plaza area. Happy to share fuel costs.',
    }),
    journey({
      id: 'j-kabelo-full',
      publisherId: 'u-kabelo',
      originId: 'kempton-park',
      destinationId: 'waterfall-city',
      journeyType: 'once_off',
      departureAt: inDays(3, '07:00'),
      schedule: null,
      seatsAvailable: 0,
      vehicleCapacity: 2,
      status: 'full',
      notes: 'SAMPLE · Full listing example.',
    }),
    journey({
      id: 'j-kabelo-cancelled',
      publisherId: 'u-kabelo',
      originId: 'tembisa-plaza',
      destinationId: 'waterfall-city',
      journeyType: 'once_off',
      departureAt: inDays(2, '08:00'),
      schedule: null,
      seatsAvailable: 3,
      vehicleCapacity: 3,
      status: 'cancelled',
      notes: 'SAMPLE · Cancelled listing example.',
    }),
    journey({
      id: 'j-lerato-mwf',
      publisherId: 'u-lerato',
      originId: 'ivory-park',
      destinationId: 'midrand-cbd',
      journeyType: 'recurring',
      departureAt: null,
      schedule: {
        daysOfWeek: [1, 3, 5],
        departureTime: '07:15',
        validFrom: addDays(today, -30),
        validUntil: addDays(today, 60),
      },
      seatsAvailable: 1,
      vehicleCapacity: 3,
      notes: 'SAMPLE · Mon/Wed/Fri lift club.',
    }),
    journey({
      id: 'j-thandi-evening',
      publisherId: 'u-thandi',
      originId: 'sandton-gautrain',
      destinationId: 'tembisa-plaza',
      journeyType: 'once_off',
      departureAt: inDays(5, '17:30'),
      schedule: null,
      seatsAvailable: 3,
      vehicleCapacity: 3,
      notes: 'SAMPLE · Heading home after work.',
    }),
  ]

  // Next 10 occurrences of each recurring journey; the 2nd of Kabelo's is cancelled.
  const occurrences: JourneyOccurrence[] = []
  for (const j of journeys) {
    if (!j.schedule) continue
    let date = today
    let n = 0
    while (n < 10) {
      date = addDays(date, 1)
      if (!j.schedule.daysOfWeek.includes(weekdayOf(date))) continue
      occurrences.push({
        id: `${j.id}-${date}`,
        journeyId: j.id,
        departureAt: sastToIso(date, j.schedule.departureTime),
        status: j.id === 'j-kabelo-weekdays' && n === 1 ? 'cancelled' : 'scheduled',
        seatsAvailable: j.seatsAvailable,
      })
      n++
    }
  }

  const request = (
    r: Omit<RequestRecord, 'occurrenceId' | 'cancelReason' | 'respondedAt'> &
      Partial<RequestRecord>,
  ): RequestRecord => ({
    occurrenceId: null,
    cancelReason: null,
    respondedAt: null,
    ...r,
  })

  const requests: RequestRecord[] = [
    request({
      id: 'req-thandi-kabelo',
      journeyId: 'j-kabelo-weekdays',
      commuterId: 'u-thandi',
      message: 'Hi Kabelo, I work near the Gautrain and travel weekdays. Could I join?',
      status: 'pending',
      createdAt: daysAgo(1, '18:20'),
    }),
    request({
      id: 'req-thandi-lerato',
      journeyId: 'j-lerato-mwf',
      commuterId: 'u-thandi',
      message: 'Mon/Wed/Fri works for me.',
      status: 'accepted',
      createdAt: daysAgo(6),
      respondedAt: daysAgo(5),
    }),
    request({
      id: 'req-lerato-kabelo',
      journeyId: 'j-kabelo-weekdays',
      commuterId: 'u-lerato',
      message: 'Is there space on Tuesdays?',
      status: 'rejected',
      createdAt: daysAgo(8),
      respondedAt: daysAgo(7),
    }),
    request({
      id: 'req-thandi-cancelled',
      journeyId: 'j-kabelo-cancelled',
      commuterId: 'u-thandi',
      message: 'Could I join for this one?',
      status: 'cancelled',
      cancelReason: 'Journey cancelled by publisher',
      createdAt: daysAgo(3),
      respondedAt: daysAgo(2),
    }),
    request({
      id: 'req-kabelo-thandi',
      journeyId: 'j-thandi-evening',
      commuterId: 'u-kabelo',
      message: 'I finish at 17:00 in Sandton, would love a lift.',
      status: 'pending',
      createdAt: daysAgo(0, '08:10'),
    }),
  ]

  const enquiries: EnquiryRecord[] = [
    {
      id: 'enq-1',
      routeId: 'r-shuttle-tembisa-midrand',
      commuterId: 'u-thandi',
      message: 'Do you have space for a weekly booking from Monday?',
      response: null,
      status: 'new',
      createdAt: daysAgo(1, '12:00'),
      respondedAt: null,
    },
    {
      id: 'enq-2',
      routeId: 'r-taxi-tembisa-midrand',
      commuterId: 'u-thandi',
      message: 'Does the 06:20 taxi stop at Midrand Gautrain?',
      response: 'Yes, all morning taxis stop at Midrand Gautrain on request.',
      status: 'responded',
      createdAt: daysAgo(9),
      respondedAt: daysAgo(8),
    },
  ]

  let nid = 0
  const notify = (
    recipientId: string,
    n: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'> & Partial<AppNotification>,
  ): NotificationRecord => ({
    id: `n-seed-${++nid}`,
    recipientId,
    isRead: false,
    createdAt: daysAgo(0, '08:00'),
    ...n,
  })

  const notifications: NotificationRecord[] = [
    notify('u-thandi', {
      type: 'request_accepted',
      title: 'Request accepted',
      body: 'Your request was accepted. Review the journey details and coordinate with the publisher.',
      linkTarget: '/requests',
      createdAt: daysAgo(5),
    }),
    notify('u-thandi', {
      type: 'enquiry_responded',
      title: 'Operator replied',
      body: 'The operator has responded to your enquiry.',
      linkTarget: '/requests',
      isRead: true,
      createdAt: daysAgo(8),
    }),
    notify('u-thandi', {
      type: 'journey_changed',
      title: 'Journey cancelled',
      body: 'A journey you requested has changed or been cancelled.',
      linkTarget: '/requests',
      isRead: true,
      createdAt: daysAgo(2),
    }),
    notify('u-thandi', {
      type: 'request_received',
      title: 'New request to join',
      body: 'You have a new request to join your journey.',
      linkTarget: '/commuter/journeys',
      createdAt: daysAgo(0, '08:10'),
    }),
    notify('u-kabelo', {
      type: 'request_received',
      title: 'New request to join',
      body: 'You have a new request to join your journey.',
      linkTarget: '/commuter/journeys',
      createdAt: daysAgo(1, '18:20'),
    }),
    notify('u-lerato', {
      type: 'enquiry_received',
      title: 'New enquiry',
      body: 'A commuter has enquired about your route.',
      linkTarget: '/operator',
      createdAt: daysAgo(1, '12:00'),
    }),
    notify('u-admin', {
      type: 'verification_submitted',
      title: 'Operator ready for review',
      body: 'An operator application is ready for review.',
      linkTarget: '/admin',
      createdAt: daysAgo(3),
    }),
    notify('u-admin', {
      type: 'report_received',
      title: 'New report',
      body: 'A new report requires review.',
      linkTarget: '/admin/reports',
      createdAt: daysAgo(1),
    }),
  ]

  const reports: ReportRecord[] = [
    {
      id: 'rep-1',
      reporterId: 'u-thandi',
      targetType: 'route',
      targetId: 'r-taxi-kempton-sandton',
      reason: 'inaccurate',
      description: 'SAMPLE · The 06:00 departure no longer runs.',
      status: 'open',
      resolutionNote: null,
      createdAt: daysAgo(1),
    },
    {
      id: 'rep-2',
      reporterId: 'u-kabelo',
      targetType: 'operator',
      targetId: 'op-metro',
      reason: 'safety',
      description: 'SAMPLE · Driver was speeding on the N1.',
      status: 'investigating',
      resolutionNote: null,
      createdAt: daysAgo(6),
    },
  ]

  return {
    users,
    operators,
    routes,
    journeys,
    occurrences,
    requests,
    enquiries,
    notifications,
    reports,
    audit: [],
    resetTokens: [],
    counters: { searches: 128, searchesWithResults: 97 },
  }
}
