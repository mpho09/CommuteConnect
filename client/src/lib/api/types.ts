/**
 * API response/request shapes (camelCase DTOs), mirroring PRD §10 and the
 * endpoints in §11.2. These are what the browser sees, so private fields
 * (exact pickup points, phone numbers, documents) are never on public types.
 *
 * Conventions: timestamps are ISO-8601 UTC strings; money is integer ZAR cents.
 */

export type Role = 'commuter' | 'operator' | 'admin'
export type AccountStatus = 'active' | 'restricted' | 'suspended' | 'deleted'

/** The signed-in user (GET /api/me). Only ever returned to that user. */
export interface Me {
  id: string
  fullName: string
  email: string
  emailVerified: boolean
  phone: string | null
  roles: Role[]
  accountStatus: AccountStatus
  preferences: TravelPreferences
  /** Has finished S4 profile setup. */
  profileComplete: boolean
  createdAt: string
}

export interface TravelPreferences {
  usualOriginId: string | null
  usualDestinationId: string | null
  /** "HH:mm" in SAST */
  usualDepartureTime: string | null
  /** 1 = Monday … 7 = Sunday (ISO weekday) */
  travelDays: number[]
  notifyByEmail: boolean
}

export type MeUpdate = Partial<Pick<Me, 'fullName' | 'phone' | 'preferences' | 'profileComplete'>>

/** Another user as shown publicly: first name + initial only (BR12). */
export interface PublicUser {
  id: string
  displayName: string
}

// ---------------------------------------------------------------- places

/**
 * A selectable place. Public places (ranks, stations, malls) can be exact;
 * private pickup points are only ever exposed as a neighbourhood zone (BR3).
 */
export interface Place {
  id: string
  label: string
  /** e.g. "Tembisa, Ekurhuleni" */
  area: string
  lat: number
  lng: number
}

// ---------------------------------------------------------------- operators

export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended'

export interface OperatorSummary {
  id: string
  businessName: string
  verificationStatus: VerificationStatus
  verifiedAt: string | null
}

/** Operator's own view of their business profile. */
export interface Operator extends OperatorSummary {
  ownerId: string
  description: string
  contactEmail: string
  serviceArea: string
  rejectionReason: string | null
  documents: OperatorDocument[]
  createdAt: string
}

export type DocumentType =
  'operating_licence' | 'business_registration' | 'proof_of_address' | 'vehicle_roadworthy'

export interface OperatorDocument {
  id: string
  documentType: DocumentType
  fileName: string
  status: 'submitted' | 'accepted' | 'rejected'
  submittedAt: string
  rejectionReason: string | null
}

export interface OperatorApplication {
  businessName: string
  description: string
  contactEmail: string
  serviceArea: string
}

// ---------------------------------------------------------------- routes

export type TransportType = 'minibus_taxi' | 'shuttle' | 'bus' | 'coach'
export type FareType = 'fixed' | 'from' | 'contact'
export type RouteStatus = 'draft' | 'active' | 'inactive' | 'suspended'

export interface RouteStop {
  place: Place
  /** "HH:mm" SAST, optional */
  estimatedTime: string | null
}

export interface OperatorRoute {
  id: string
  operator: OperatorSummary
  routeName: string
  transportType: TransportType
  origin: Place
  destination: Place
  stops: RouteStop[]
  /** null when fareType is 'contact' (BR10) */
  fareCents: number | null
  fareType: FareType
  /** Human-readable, e.g. "Weekdays · every 20 min, 05:00–19:00" */
  scheduleDescription: string
  status: RouteStatus
  lastConfirmedAt: string
  /** Not reconfirmed within the freshness window (BR11). Computed by the server. */
  needsConfirmation: boolean
}

export interface RouteInput {
  routeName: string
  transportType: TransportType
  originId: string
  destinationId: string
  stopIds: string[]
  fareCents: number | null
  fareType: FareType
  scheduleDescription: string
}

// ---------------------------------------------------------------- journeys

export type JourneyType = 'once_off' | 'recurring'
export type JourneyStatus = 'draft' | 'open' | 'full' | 'paused' | 'cancelled' | 'completed'

export interface RecurringSchedule {
  /** ISO weekdays, 1 = Monday */
  daysOfWeek: number[]
  /** "HH:mm" SAST */
  departureTime: string
  /** "YYYY-MM-DD" */
  validFrom: string
  validUntil: string | null
}

export interface Journey {
  id: string
  publisher: PublicUser
  /** Approximate zone label, never an exact address (BR3, BR12). */
  originZone: string
  destinationZone: string
  /** Zone centre points for matching/map previews; deliberately coarse. */
  originApprox: { lat: number; lng: number }
  destinationApprox: { lat: number; lng: number }
  journeyType: JourneyType
  /** Once-off departure; null for recurring (see schedule). */
  departureAt: string | null
  schedule: RecurringSchedule | null
  seatsAvailable: number
  vehicleCapacity: number
  /** Optional cost-sharing contribution, ZAR cents (BR16). */
  costSharingCents: number | null
  notes: string
  status: JourneyStatus
  createdAt: string
}

export interface JourneyInput {
  originId: string
  destinationId: string
  journeyType: JourneyType
  departureAt: string | null
  schedule: RecurringSchedule | null
  seatsAvailable: number
  vehicleCapacity: number
  costSharingCents: number | null
  notes: string
}

export type JourneyUpdate = Partial<Pick<Journey, 'seatsAvailable' | 'notes' | 'status'>> & {
  /** With status 'cancelled': shared with affected riders (M2). */
  cancelReason?: string
}

export type OccurrenceStatus = 'scheduled' | 'cancelled' | 'completed'

export interface JourneyOccurrence {
  id: string
  journeyId: string
  departureAt: string
  status: OccurrenceStatus
  seatsAvailable: number
}

// ---------------------------------------------------------------- requests & enquiries

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface JourneyRequest {
  id: string
  journeyId: string
  occurrenceId: string | null
  commuter: PublicUser
  message: string
  status: RequestStatus
  cancelReason: string | null
  createdAt: string
  respondedAt: string | null
}

export type RequestAction =
  { action: 'accept' } | { action: 'reject' } | { action: 'cancel'; reason?: string }

export type EnquiryStatus = 'new' | 'responded' | 'closed'

export interface Enquiry {
  id: string
  routeId: string
  routeName: string
  commuter: PublicUser
  message: string
  response: string | null
  status: EnquiryStatus
  createdAt: string
  respondedAt: string | null
}

// ---------------------------------------------------------------- search & matching

export type Frequency = 'once_off' | 'recurring' | 'any'

export interface SearchParams {
  originId: string
  destinationId: string
  /** "YYYY-MM-DD" (SAST). Optional for recurring searches. */
  date?: string
  /** "HH:mm" SAST; results within ±windowMinutes */
  time?: string
  windowMinutes?: number
  frequency?: Frequency
  transportType?: TransportType | 'shared'
}

export interface SearchResults {
  routes: OperatorRoute[]
  journeys: Journey[]
}

export interface MatchSuggestion {
  journey: Journey
  /** 0–100; for ordering only, not shown as a guarantee (BR13). */
  score: number
  /** Plain-language reasons, e.g. "Starts about 1.2 km from your origin". */
  reasons: string[]
}

// ---------------------------------------------------------------- notifications

export type NotificationType =
  | 'request_received'
  | 'request_accepted'
  | 'request_rejected'
  | 'request_cancelled'
  | 'enquiry_received'
  | 'enquiry_responded'
  | 'verification_submitted'
  | 'verification_decision'
  | 'journey_changed'
  | 'report_received'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  /** In-app path to open, e.g. "/requests" */
  linkTarget: string
  isRead: boolean
  createdAt: string
}

// ---------------------------------------------------------------- reports & admin

export type ReportTargetType = 'journey' | 'route' | 'user' | 'operator'
export type ReportStatus = 'open' | 'investigating' | 'actioned' | 'dismissed' | 'closed'

export interface ReportInput {
  targetType: ReportTargetType
  targetId: string
  reason: string
  description: string
}

/** Admin view of a report. Reporter identity is visible to admins only. */
export interface Report extends ReportInput {
  id: string
  reporter: PublicUser
  targetLabel: string
  status: ReportStatus
  resolutionNote: string | null
  createdAt: string
}

export type ReportDecision = {
  status: Exclude<ReportStatus, 'open'>
  resolutionNote: string
  /** Suspend the reported target (BR15). Requires a note. */
  suspendTarget?: boolean
}

export interface VerificationDecision {
  status: 'under_review' | 'verified' | 'rejected' | 'suspended'
  reason?: string
}

export interface AdminMetrics {
  searches: number
  searchesWithResults: number
  enquiries: number
  joinRequests: number
  acceptedRequests: number
  repeatUsers: number
  pendingVerifications: number
  openReports: number
}

// ---------------------------------------------------------------- auth

export interface SignUpInput {
  fullName: string
  email: string
  password: string
  roles: Array<Exclude<Role, 'admin'>>
  acceptedTerms: boolean
}

export interface Session {
  user: Me | null
}
