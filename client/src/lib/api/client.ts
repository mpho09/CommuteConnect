import type {
  AdminMetrics,
  AppNotification,
  Enquiry,
  Journey,
  JourneyInput,
  JourneyOccurrence,
  JourneyRequest,
  JourneyUpdate,
  MatchSuggestion,
  Me,
  MeUpdate,
  Operator,
  OperatorApplication,
  OperatorDocument,
  OperatorRoute,
  Place,
  Report,
  ReportDecision,
  ReportInput,
  RequestAction,
  RouteInput,
  SearchParams,
  SearchResults,
  Session,
  SignUpInput,
  DocumentType,
  VerificationDecision,
} from './types'

/**
 * Everything the UI can ask of the backend. Screens depend only on this
 * interface (via useApi), so the in-memory mock and the real HTTP client are
 * interchangeable. Comments give the matching endpoint from PRD §11.2.
 *
 * Methods reject with ApiError.
 */
export interface ApiClient {
  // Auth (Supabase Auth in production)
  getSession(): Promise<Session>
  signIn(email: string, password: string): Promise<Me>
  signUp(input: SignUpInput): Promise<Me>
  signOut(): Promise<void>
  /** Always resolves, so it never reveals whether the email has an account. */
  requestPasswordReset(email: string): Promise<void>
  /** Sets a new password using the token from the reset email. */
  resetPassword(token: string, password: string): Promise<void>

  // Profile
  /** GET /api/me */
  getMe(): Promise<Me>
  /** PATCH /api/me */
  updateMe(update: MeUpdate): Promise<Me>
  deleteAccount(): Promise<void>

  // Places (geocoding provider behind the API)
  searchPlaces(query: string): Promise<Place[]>
  /** GET /api/places/:id (e.g. to show a saved usual place) */
  getPlace(id: string): Promise<Place>

  // Search & matching
  /** GET /api/search */
  search(params: SearchParams): Promise<SearchResults>
  /** Suggestions for the signed-in commuter, from params or their saved preferences. */
  listMatches(params?: SearchParams): Promise<MatchSuggestion[]>

  // Journeys
  /** GET /api/journeys/:id */
  getJourney(id: string): Promise<Journey>
  listJourneyOccurrences(journeyId: string): Promise<JourneyOccurrence[]>
  /** Journeys published by the signed-in user. */
  listMyJourneys(): Promise<Journey[]>
  /** POST /api/journeys */
  createJourney(input: JourneyInput): Promise<Journey>
  /** PATCH /api/journeys/:id */
  updateJourney(id: string, update: JourneyUpdate): Promise<Journey>
  cancelOccurrence(occurrenceId: string, reason?: string): Promise<JourneyOccurrence>

  // Join requests
  /** POST /api/journeys/:id/requests */
  requestToJoin(
    journeyId: string,
    input: { message: string; occurrenceId?: string },
  ): Promise<JourneyRequest>
  /** Requests sent by me, and received on journeys I publish. */
  listMyRequests(): Promise<{ sent: JourneyRequest[]; received: JourneyRequest[] }>
  /** PATCH /api/requests/:id */
  updateRequest(id: string, action: RequestAction): Promise<JourneyRequest>

  // Operators & routes
  /** GET /api/routes/:id */
  getRoute(id: string): Promise<OperatorRoute>
  /** The signed-in user's operator profile, or null. */
  getMyOperator(): Promise<Operator | null>
  /** POST /api/operators */
  applyAsOperator(input: OperatorApplication): Promise<Operator>
  /** POST /api/operators/:id/documents */
  uploadOperatorDocument(
    operatorId: string,
    documentType: DocumentType,
    file: File,
  ): Promise<OperatorDocument>
  /** DELETE /api/operators/:id/documents/:documentId (not once under review or verified) */
  removeOperatorDocument(operatorId: string, documentId: string): Promise<void>
  listMyRoutes(): Promise<OperatorRoute[]>
  /** POST /api/operators/:id/routes */
  createRoute(input: RouteInput): Promise<OperatorRoute>
  updateRoute(
    id: string,
    input: Partial<RouteInput> & { status?: 'active' | 'inactive' },
  ): Promise<OperatorRoute>
  /** Marks the route as still accurate (BR11). */
  reconfirmRoute(id: string): Promise<OperatorRoute>

  // Enquiries
  /** POST /api/routes/:id/enquiries */
  sendEnquiry(routeId: string, message: string): Promise<Enquiry>
  /** Enquiries I sent (commuter) or received (operator). */
  listMyEnquiries(): Promise<{ sent: Enquiry[]; received: Enquiry[] }>
  respondToEnquiry(id: string, response: string): Promise<Enquiry>

  // Notifications
  /** GET /api/notifications */
  listNotifications(): Promise<AppNotification[]>
  markNotificationRead(id: string): Promise<void>
  markAllNotificationsRead(): Promise<void>

  // Reports
  /** POST /api/reports */
  createReport(input: ReportInput): Promise<void>

  // Admin
  /** GET /api/admin/verifications */
  listVerificationQueue(): Promise<Operator[]>
  /** PATCH /api/admin/operators/:id/verification */
  decideVerification(operatorId: string, decision: VerificationDecision): Promise<Operator>
  /** GET /api/admin/reports */
  listReports(): Promise<Report[]>
  decideReport(id: string, decision: ReportDecision): Promise<Report>
  getAdminMetrics(): Promise<AdminMetrics>
}
