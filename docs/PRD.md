**PRODUCT REQUIREMENTS
DOCUMENT**

**CommuteConnect**

Minimum Viable Product (MVP)

*Better journeys. Shared costs. Connected communities.*

A web-based transport discovery and coordination platform
for commuters and transport providers in South Africa.

23 November 2026  ·  v0.1 Draft  ·  [Your name]

# Document purpose and details

This PRD defines the first controlled MVP of CommuteConnect. It describes a responsive web platform where commuters can discover transport options, publish or request eligible shared journeys, and contact transport operators. It follows the structure and depth of the supplied PRD reference while adapting the requirements to a two-sided commuting marketplace.

| Field | Answer |
| --- | --- |
| Product name | CommuteConnect (MVP) |
| Author(s) | [Your name] |
| Course code and cohort | [Course code and cohort] |
| Facilitator / reviewer | [Facilitator name] |
| Link to original app idea | [Add concept document / repository path] |
| GitHub repository | [Add repository URL] |
| Version | v0.1 |
| Status | Draft — open questions and legal review outstanding |
| Target platform | Responsive web application; mobile browser first-class |

## Change log

| Version | Date | Section(s) changed | What changed | Regenerated? |
| --- | --- | --- | --- | --- |
| v0.1 | 23 Nov 2026 | All | Initial PRD based on CommuteConnect concept and selected product decisions | N/A |

## Contents

- 1. Product overview

- 2. Users, personas and roles

- 3. Goals, success metrics and non-goals

- 4. Features, business rules and notifications

- 5. User stories and acceptance criteria

- 6. Edge cases

- 7. User flows and navigation map

- 8. Screens

- 9. Design direction

- 10. Data model

- 11. Tech stack and architecture

- 12. Quality, errors, security and privacy

- 13. Assumptions, risks, open questions and milestones

- 14. AI prompts / implementation prompts

- 15. Checklist sign-off

- 16. Glossary

# 1. Product overview

1.1 Product name: CommuteConnect (MVP)

1.2 One-line pitch: CommuteConnect helps commuters discover transport options, connect with compatible shared journeys and contact transport providers travelling along their routes.

1.3 Problem statement: Commuters often rely on disconnected channels to find transport. They may ask friends or WhatsApp groups for lifts, contact several shuttle operators to compare fares, or travel to a pickup point without knowing whether a suitable service is available. Information about routes, schedules, available seats and prices is fragmented. People who travel similar routes may not know about one another, while smaller transport operators may struggle to reach potential customers. CommuteConnect aims to make transport options easier to discover and coordinate in one place.

1.4 Solution:

- Commuters create an account and search by origin, destination, date, departure time and journey frequency.

- Search results show relevant operator services and eligible shared-journey listings separately.

- Commuters can send an enquiry to an operator or request to join a shared journey.

- Users can publish recurring or once-off journey availability, subject to platform eligibility and applicable legal requirements.

- Transport operators create profiles, submit verification information, publish routes and schedules, and manage enquiries.

- Administrators review operator submissions, moderate listings and respond to safety reports.

1.5 Platform: Responsive web application built and tested on desktop and mobile browsers. The initial experience is web-first; native Android and iOS apps are future possibilities.

1.6 Vision: Make everyday commuting easier to plan by creating a trusted, useful network of commuters and transport providers, starting with validated local routes in Gauteng and expanding only when route-level demand is demonstrated.

1.7 Product principles:

- Local usefulness before national scale.

- Trust and user safety before marketplace growth.

- Transparent listings: fares, schedules and verification status must be clear.

- No misleading guarantee that a route match means a ride is available or safe.

- Mobile-friendly, low-friction use on South African mobile data.

## 1.8 Key terms

| Term | Exact meaning in this product |
| --- | --- |
| Commuter | A registered person searching for transport or requesting to join a shared journey. |
| Journey listing | A once-off or recurring journey published by an eligible user offering available seats or seeking coordination. |
| Operator | A transport business or provider that has created a profile and submitted required verification information. |
| Operator route | A service listing published by an operator with origin, destination, stops, schedule, fare and availability details. |
| Match | A system-generated suggestion based on route proximity, time compatibility and travel days. It is not a confirmed booking. |
| Enquiry | A message/request sent by a commuter to an operator about a route or service. |
| Join request | A commuter's request to join a specific shared-journey listing. |
| Verification status | The administrative state of an operator or listing: pending, under review, verified, rejected or suspended. |
| Recurring schedule | A repeating journey pattern, such as weekdays at approximately 07:00. |
| Confirmed connection | A journey request or enquiry accepted by the relevant provider or journey publisher. It is not proof that the trip was completed. |

# 2. Users, personas and roles

2.1 Primary users: Adults who commute for work, education, appointments, shopping or other regular and occasional activities. The product is designed for a broad market, but the first pilot should concentrate on one validated route corridor to create enough local supply and demand.

2.2 Secondary users: Private journey publishers, transport operators, shuttle providers and platform administrators.

## 2.3 Personas

| Field | Persona 1 — Daily commuter | Persona 2 — Transport operator | Persona 3 — Occasional commuter |
| --- | --- | --- | --- |
| Name and situation | Thandi, 29; works in Midrand and travels from Tembisa on weekdays. | Sipho, 38; manages a small shuttle business serving several Gauteng routes. | Naledi, 23; travels to unfamiliar locations for appointments and events. |
| Device / connectivity | Android phone, prepaid mobile data. | Laptop and smartphone; business internet and mobile data. | Smartphone; mobile data. |
| Tech comfort | Medium | Medium | High |
| Goal | Find dependable options and know costs before leaving home. | Reach more customers and manage route enquiries in one place. | Find transport for a specific date and time. |
| Current frustration | Information is spread across contacts and groups; changes are hard to confirm. | Customers ask the same questions through multiple channels; online visibility is limited. | Does not know which operators serve the route or whether seats are available. |
| How product helps | Searches routes, compares listings and sends requests. | Publishes routes, fares and schedules and responds to enquiries. | Searches a once-off trip and contacts relevant providers. |
| Quote | “I want to know what options I have before I leave.” | “I need people travelling my routes to find my service.” | “I don't want to phone ten places just to find transport.” |

## 2.4 Roles and permissions

| Role | How someone gets this role | Can do | Cannot do |
| --- | --- | --- | --- |
| Guest | Visits public website without signing in. | View public product information and limited public operator listings; start a search where permitted. | Send enquiries, publish journeys, see private contact details or manage listings. |
| Commuter | Registers and verifies email/phone as required by the release policy. | Manage profile; search; view listing details; send enquiries; create eligible join requests; publish an eligible shared journey if enabled; report content. | Approve own requests; change another user's listing; see private documents or contact details before permitted disclosure. |
| Journey publisher / driver | A commuter account that passes required eligibility and checks for publishing a shared journey. | Create and manage own eligible journey listings; set seats, times and recurring days; respond to join requests. | Claim platform verification without approval; publish prohibited or unlawful paid passenger services. |
| Operator | Registers as an operator and submits business and transport information. | Manage own business profile, routes, schedules, fares, availability and enquiries; upload verification documents. | Mark itself verified; access another operator's records; view commuter private data beyond an enquiry. |
| Admin | Authorised platform staff account with strong authentication. | Review operator applications; approve/reject/suspend listings; handle reports; view operational metadata; record decisions. | Use admin access for personal curiosity; disclose private documents or data without a defined purpose. |

2.5 Admin: An admin-only web area is included in the MVP. Sensitive verification documents must be stored privately and exposed only to authorised reviewers through time-limited access. Admin actions are recorded in an immutable or append-only audit log.

# 3. Goals, success metrics and non-goals

| ID | Goal | Metric | Initial target | How checked |
| --- | --- | --- | --- | --- |
| G1 | Validate real commuter demand. | Number of genuine journey searches and enquiries in pilot corridor. | 50 pilot registrations/enquiries and 30 real journey requests during initial pilot. | Analytics events and database records. |
| G2 | Create useful local liquidity. | Share of searches returning at least one relevant result or match. | At least 60% in the chosen pilot corridor after sufficient listings are onboarded. | Search result logs; weekly corridor review. |
| G3 | Facilitate connections. | Number of accepted join requests or operator enquiries receiving a response. | 10 facilitated connections during initial validation pilot. | Request/enquiry status history. |
| G4 | Build repeat usage. | Share of active pilot commuters returning within 30 days. | At least 25% of activated pilot commuters, to be reviewed after cohort matures. | Cohort analytics. |
| G5 | Establish provider supply. | Number of operators completing onboarding and maintaining accurate listings. | At least 5 pilot operators, subject to validation and legal eligibility. | Operator records and listing updates. |
| G6 | Protect users and information. | Unauthorised disclosure incidents and unresolved high-severity reports. | Zero known unauthorised disclosures; all high-severity reports triaged within 24 hours. | Audit logs and admin report queue. |

Targets are provisional experiment thresholds, not market forecasts. Adjust them after the first interviews and manual pilot.

## Non-goals for MVP

- Not a transport operator, taxi association, fleet owner or employer of drivers.

- No guarantee that any suggested match will result in a ride.

- No automatic real-time GPS tracking or live vehicle telemetry.

- No route navigation engine or traffic prediction system.

- No in-platform wallet, escrow, fare collection, refunds or booking commission in the initial controlled pilot.

- No nationwide launch before route-level liquidity is demonstrated.

- No automated identity or operating-licence verification unless a suitable compliant provider and process are approved.

- No ratings/reviews in the first release unless moderation, fraud and defamation handling are defined.

- No native Android or iOS application in v1.

- No public display of exact home addresses, personal phone numbers or private journey patterns.

# 4. Features, business rules and notifications

## 4.1 Features

| ID | Feature | What the user can do | Priority | Goal | Stories | Screens |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Account and profile | Register, verify email, log in, reset password, select account type, manage profile and delete account. | Must | G1,G6 | US1–US3 | S1–S5, S22 |
| F2 | Journey search | Search by origin, destination, date, departure window, journey frequency and transport type. | Must | G1,G2 | US4 | S6–S8 |
| F3 | Journey listings | Create, edit, view, deactivate once-off and recurring shared-journey listings, subject to eligibility. | Must* | G2,G3 | US5,US6 | S9–S11 |
| F4 | Matching | Show suggestions based on origin/destination proximity, time, travel days and seats. | Must | G2,G3 | US7 | S7,S8,S12 |
| F5 | Operator directory and routes | View operator profiles, routes, stops, schedules, fares and availability. | Must | G1,G2 | US8 | S8,S13,S14 |
| F6 | Operator onboarding and verification | Create operator profile, submit required information/documents and view status. | Must | G6 | US9 | S15,S16 |
| F7 | Join requests and enquiries | Send, accept, reject, cancel and manage requests or operator enquiries. | Must | G3,G4 | US10,US11 | S10,S17,S18 |
| F8 | Notifications | Receive in-app and email notifications for important request and listing events. | Should | G3,G4 | US12 | S19 |
| F9 | Safety reporting and moderation | Report a user/listing; admins review and take action. | Must | G6 | US13 | S20,S21 |
| F10 | Admin dashboard | Review operators, listings, reports and key activity. | Must | G6 | US14 | S21 |
| F11 | Basic analytics | Track searches, results, enquiries, matches and repeat use. | Should | G1–G5 | Admin use | S21 |

*F3 private ride publishing must remain disabled or restricted until legal review confirms the permitted operating model, user eligibility and safeguards.

## 4.2 MVP definition

A commuter can register, search for a route and date, view eligible operator listings and shared-journey suggestions, and send an enquiry or join request. An operator can submit an application, receive administrative review, publish routes after approval and respond to enquiries. An administrator can review verification submissions and safety reports. The MVP does not process payments or claim to guarantee transport.

## 4.3 Future features

- Native Android and iOS applications.

- Secure in-platform payments, booking fees and refunds after legal, payment-provider and operational review.

- Live vehicle tracking and trip progress sharing with explicit consent.

- Route optimisation and richer geographic matching using PostGIS and routing services.

- Operator subscription billing and promoted listings after willingness-to-pay validation.

- Employer and university commuting programmes.

- Ratings and reviews with moderation and dispute processes.

- Multilingual interfaces and low-data/offline enhancements.

- Demand insights and operator analytics.

- Saved commute alerts and recurring commute reminders.

## 4.4 Business rules

| ID | Rule | Used by |
| --- | --- | --- |
| BR1 | Account email must be verified before a user can publish a journey, send a join request or operator enquiry. Authentication credentials are handled by the auth provider, not stored in application tables. | F1,F3,F6,F7 |
| BR2 | A user must select a role: commuter, operator or both. A user may have both capabilities, but operator functions require a separate operator profile and approval. | F1,F6 |
| BR3 | Origin and destination must be valid selected locations. Store a human-readable label and geocoded coordinates when available. Do not expose exact private pickup coordinates publicly. | F2,F3,F4,F5 |
| BR4 | Once-off journeys require a future local departure date/time. Past journeys cannot be published or requested. | F2,F3 |
| BR5 | Recurring schedules require at least one selected day of week, a start date, a departure time/window and an optional end date. Individual occurrences may be skipped or cancelled without deleting the schedule. | F3,F4 |
| BR6 | A journey listing must have an origin, destination, departure details, journey type, available seats and status. Available seats must be a positive integer and cannot exceed the declared vehicle capacity where applicable. | F3 |
| BR7 | A join request is unique per commuter and journey. A commuter cannot request to join their own listing. Only the listing owner can accept or reject it. | F7 |
| BR8 | Accepting a request must atomically check and decrement available seats. Concurrent requests must not cause overbooking. When no seats remain, the journey becomes full. | F3,F7 |
| BR9 | Operator listings may only be labelled “Verified” after an authorised admin has reviewed the required documents and recorded a decision. Verification status and date must be visible to users. | F5,F6,F10 |
| BR10 | An operator route must include origin, destination, service details and at least one schedule or availability description. Fare must be a non-negative ZAR amount or clearly labelled “Contact for fare”. | F5 |
| BR11 | Operator route information must show when it was last updated. Listings not reconfirmed within a configurable period may be marked “Needs confirmation” or hidden from prominent results. | F5,F10 |
| BR12 | Exact home addresses, private phone numbers, identity documents and verification files are never public. Contact information is shared only through the approved enquiry/request flow and privacy notice. | F1,F6,F7 |
| BR13 | A match is a suggestion, not a booking or safety guarantee. Display a clear notice and require user action before a request is sent. | F4,F7 |
| BR14 | A user can cancel their own pending request. Accepted requests can be cancelled with a reason; the other party is notified. Cancellation and status changes are logged. | F7,F8 |
| BR15 | Admins can suspend a listing or account while investigating a credible safety or fraud report. The reason and actor must be logged. | F9,F10 |
| BR16 | Private shared rides must not be used to facilitate unlawful paid passenger transport. Before enabling paid or public ride offers, platform rules and applicable South African transport-law requirements must be reviewed by qualified counsel. | F3,F9 |
| BR17 | All timestamps are stored in UTC and displayed in Africa/Johannesburg local time. Currency defaults to ZAR. | All |
| BR18 | Users must accept the Terms and Privacy Notice. Location collection and sharing require clear notice and an appropriate lawful basis/consent where required. | F1,F2,F7 |

## 4.5 Notifications

| Event | Recipient | Channel | Message / action |
| --- | --- | --- | --- |
| Join request received | Journey publisher | In-app + email | “You have a new request to join your journey.” Open request details. |
| Join request accepted | Commuter | In-app + email | “Your request was accepted. Review the journey details and coordinate with the publisher.” |
| Join request rejected | Commuter | In-app + email | “Your request was not accepted.” |
| Operator enquiry received | Operator | In-app + email | “A commuter has enquired about your route.” |
| Operator enquiry response | Commuter | In-app + email | “The operator has responded to your enquiry.” |
| Verification submitted | Admin | In-app/admin queue | “An operator application is ready for review.” |
| Verification decision | Operator | In-app + email | “Your operator profile status has changed.” |
| Listing cancelled or changed | Affected request participants | In-app + email | “A journey you requested has changed or been cancelled.” |
| Safety report received | Admin | Admin queue | “A new report requires review.” |

# 5. User stories and acceptance criteria

## US1 (F1): Register

As a commuter, I want to create an account so that I can save searches and contact providers.

- Acceptance: Given I enter a valid name, email and password and accept the Terms and Privacy Notice, when I submit registration, then an account is created and I am asked to verify my email.

- Acceptance: Given I enter an email already registered, when I submit, then I see a clear message and a sign-in/recovery option.

- Acceptance: Given I do not accept the required terms, when I submit, then registration is blocked and the missing consent is explained.

## US2 (F1): Log in and recover account

As a registered user, I want to log in and reset my password so that I can regain access.

- Acceptance: Given valid credentials, when I log in, then I reach the correct dashboard for my permissions.

- Acceptance: Given invalid credentials, when I submit, then I see a generic error that does not reveal whether the email exists.

- Acceptance: Given I request a password reset, then a secure reset email is sent and the reset token expires after its configured lifetime.

## US3 (F1): Manage profile

As a user, I want to manage my name, phone and preferences so that my details are current.

- Acceptance: Given I update allowed profile fields, when I save, then the new values appear on my profile.

- Acceptance: Given I attempt to change a protected role or verification status through the client, then the API rejects the change.

- Acceptance: Given I request account deletion, then I see the consequences and must confirm before deletion begins.

## US4 (F2): Search for transport

As a commuter, I want to search by origin, destination and departure details so that I can discover suitable options.

- Acceptance: Given I select valid origin, destination and a future date/time, when I search, then relevant operator routes and eligible journey listings appear in separate result groups.

- Acceptance: Given the origin and destination are the same, then I see validation and cannot submit.

- Acceptance: Given no results match, then I see a useful empty state and can broaden the time or location.

## US5 (F3): Publish once-off journey

As an eligible journey publisher, I want to publish a one-time journey so that compatible commuters can request to join.

- Acceptance: Given I complete required route, time, seat and eligibility fields, when I publish, then the listing appears as Open.

- Acceptance: Given the departure time is in the past or seats are zero, then publishing is blocked.

- Acceptance: Given the user is not eligible under current legal/platform rules, then publishing is unavailable with an explanation.

## US6 (F3): Publish recurring journey

As an eligible publisher, I want to publish a repeating schedule so that commuters can find regular travel patterns.

- Acceptance: Given I select one or more weekdays and a valid date range, when I save, then the recurring schedule is created.

- Acceptance: Given no weekday is selected or the end date precedes the start date, then validation is shown.

- Acceptance: Given I skip one occurrence, then other scheduled occurrences remain active.

## US7 (F4): View compatible matches

As a commuter, I want to see compatible journey suggestions so that I can identify options worth contacting.

- Acceptance: Given search criteria overlap with active listings, then results are ranked using route proximity, destination proximity, time compatibility, travel days and seats.

- Acceptance: Given a result is a match suggestion, then the UI labels it as a suggestion and does not imply a confirmed ride.

- Acceptance: Given location precision is low or data is incomplete, then the UI avoids displaying a misleading exact match score.

## US8 (F5): Discover operator

As a commuter, I want to view an operator profile and route details so that I can decide whether to enquire.

- Acceptance: Given an operator route is active, then the listing shows business name, verification status, route, schedule, fare information and last-updated date.

- Acceptance: Given an operator is pending or suspended, then the profile is not labelled verified and restricted listings are hidden according to policy.

- Acceptance: Given the fare is unknown, then the UI displays “Contact for fare” rather than a fabricated price.

## US9 (F6): Apply as operator

As a transport operator, I want to submit my business details so that the platform can review my listing eligibility.

- Acceptance: Given I submit required business and supporting information, then my application status becomes Pending.

- Acceptance: Given a required document is missing or an unsupported file is uploaded, then I see field-level validation.

- Acceptance: Given the admin approves or rejects the application, then I receive the decision and any permitted reason.

## US10 (F7): Request to join

As a commuter, I want to request a seat on a journey so that the publisher can decide whether to accept me.

- Acceptance: Given the journey is open, has capacity and is not my own listing, when I request to join, then a pending request is created.

- Acceptance: Given I already have a pending or accepted request for the journey, then a duplicate request is prevented.

- Acceptance: Given the journey becomes full before acceptance, then the request cannot be accepted and the user is informed.

## US11 (F7): Enquire with operator

As a commuter, I want to send an enquiry so that I can confirm service details with an operator.

- Acceptance: Given I submit a valid message, then the enquiry is stored and the operator is notified.

- Acceptance: Given the route is inactive or the operator is suspended, then the enquiry is blocked.

- Acceptance: Given I am rate-limited for repeated spam, then I see a clear retry message.

## US12 (F8): Receive notifications

As a user, I want to receive updates about my requests so that I do not miss important responses.

- Acceptance: Given a request changes status, then an in-app notification is created for the affected user.

- Acceptance: Given email delivery fails, then the in-app notification remains available and the failure is logged for retry.

- Acceptance: Given I mark a notification as read, then its unread state updates only for my account.

## US13 (F9): Report unsafe content

As a user, I want to report a suspicious user or listing so that the platform can investigate.

- Acceptance: Given I select a report reason and submit, then a report is created and confirmation is shown.

- Acceptance: Given I report the same target repeatedly, then duplicate or abusive reports are rate-limited without hiding legitimate concerns.

- Acceptance: Given an admin resolves the report, then the action and outcome are recorded in the audit log.

## US14 (F10): Review operator and reports

As an admin, I want to review applications and reports so that unsafe or inaccurate content can be controlled.

- Acceptance: Given an operator is pending, then the admin can inspect permitted submitted information and approve, reject or request changes.

- Acceptance: Given an admin changes verification status, then actor, timestamp, decision and reason are recorded.

- Acceptance: Given a report is high severity, then it is prioritised in the queue and can trigger temporary listing suspension.

# 6. Edge cases

| Situation | What the user sees | What the app does |
| --- | --- | --- |
| No internet during search | “You’re offline. Check your connection and try again.” | Show cached public shell if available; do not claim live availability. |
| Search returns no results | “No options found for these details.” | Suggest widening time window or nearby areas; do not fabricate results. |
| Origin/destination cannot be geocoded | “We couldn't identify that location. Choose a suggested area.” | Require a selected known location or save an explicitly approximate area. |
| Journey publisher edits a listing with pending requests | “Changing this journey may affect people who requested to join.” | Notify affected commuters and require confirmation for material changes. |
| Two commuters request the final seat simultaneously | One request remains pending/accepted; the other sees “No seats are available.” | Use transaction/locking to prevent overbooking. |
| Operator verification expires or is suspended | Listing shows restricted status or is hidden. | Prevent new enquiries where policy requires; preserve audit history. |
| Operator does not update route details | “Last confirmed [date]” or “Needs confirmation.” | Flag stale listing after configured period; optionally reduce ranking or hide. |
| User tries to request their own journey | “You cannot request to join your own journey.” | Reject request at API and database level. |
| Recurring journey has one cancelled date | “This occurrence is cancelled.” | Keep the recurring schedule and other occurrences active. |
| User deletes account with open requests | “Your open requests will be cancelled and profile details removed.” | Cancel open requests, notify counterparties as appropriate, anonymise retained records where legally required. |
| A safety report is submitted | “Thank you. Our team will review this report.” | Create report and route to admin; do not reveal reporter identity to reported user. |
| Verification document upload fails | “Upload failed. Check the file and connection.” | Keep form values; do not mark application submitted until required files are stored. |
| Email notification fails | No false success message; notification remains in app. | Retry delivery and record delivery status. |
| User's session expires while submitting | “Please sign in again.” | Preserve non-sensitive draft fields locally where safe; never cache private documents or tokens insecurely. |

# 7. User flows and navigation map

## Flow 1: Guest searches and sends an enquiry (F1,F2,F5,F7)

- Starts when a commuter visits the CommuteConnect landing page.

- 1. S1 Landing → enters origin, destination, date and departure window in S6 Search.

- 2. S7 Results shows operator routes and shared-journey suggestions in separate sections.

- 3. User opens S8 Listing Details and reviews fare, schedule, verification and last-updated information.

- 4. User taps “Enquire” or “Request to join”. If logged out, S2 Sign Up / S3 Log In appears.

- 5. After authentication, user completes S17 Enquiry or Join Request.

- 6. Confirmation appears; the request is visible in S18 My Requests.

Ends when the enquiry or join request has been created and the recipient has been notified.

## Flow 2: Operator onboarding and route publishing (F1,F6,F5)

- Starts when a transport provider selects “List your service” on S1.

- 1. S2 Sign Up → selects Operator or Both.

- 2. S15 Operator Setup: enters business identity, contact and service details.

- 3. S16 Verification: uploads required documents and submits application.

- 4. Admin reviews in S21 Admin Dashboard; status becomes Approved, Rejected or Changes Required.

- 5. Approved operator opens S13 Operator Dashboard and creates a route in S14 Route Editor.

- 6. Route becomes visible to commuters once required fields and publication rules pass.

Ends when an eligible route is searchable.

## Flow 3: Publish and coordinate a shared journey (F3,F4,F7)

- Starts when an eligible commuter opens S9 Create Journey.

- 1. User chooses Once-off or Recurring.

- 2. User selects approximate pickup area, destination area, departure time, travel days and seats.

- 3. System validates eligibility and required information, then publishes the listing.

- 4. Compatible commuters discover the listing in S7 Results or S12 Matches.

- 5. Commuter sends a join request; publisher reviews it in S18 Requests.

- 6. Publisher accepts or rejects; available seats are updated safely and both parties are notified.

Ends when a request is accepted or declined. The platform does not represent this as a completed trip.

## Flow 4: Admin handles a safety report (F9,F10)

- Starts when a user submits a report from S8 or S10.

- 1. Report enters the admin queue in S21.

- 2. Admin reviews target, reason and relevant listing metadata.

- 3. Admin may dismiss, request more information, restrict a listing or suspend an account.

- 4. Admin records the outcome and reason.

- 5. Reporter receives a status update where appropriate, without exposing confidential investigation details.

## Navigation map

flowchart TD
  S1[Landing] --> S6[Search]
  S1 --> S2[Sign Up]
  S1 --> S3[Log In]
  S6 --> S7[Search Results]
  S7 --> S8[Listing Details]
  S8 --> S17[Enquiry / Join Request]
  S7 --> S12[Matches]
  S1 --> S15[Operator Setup]
  S15 --> S16[Verification]
  S16 --> S21[Admin Review]
  S21 --> S13[Operator Dashboard]
  S13 --> S14[Route Editor]
  S2 --> S4[Profile Setup]
  S4 --> S5[Commuter Dashboard]
  S5 --> S9[Create Journey]
  S5 --> S18[My Requests]
  S5 --> S19[Notifications]
  S5 --> S20[Profile & Settings]
  S21 --> S22[Reports & Moderation]

# 8. Screens

## 8.1 Screen inventory

| ID | Screen name | Type | Who can open it | Purpose | Navigation / stories |
| --- | --- | --- | --- | --- | --- |
| S1 | Landing | Public page | Guest / all users | Product explanation, search entry, operator CTA, trust and safety information. | F1,F2 |
| S2 | Sign Up | Full page | Guest | Create commuter or operator-capable account; terms and privacy consent. | US1 |
| S3 | Log In | Full page | Guest | Authenticate and return to intended destination. | US2 |
| S4 | Profile Setup | Full page | New user | Name, optional phone, account type and preferences. | US3 |
| S5 | Commuter Dashboard | Authenticated | Commuter | Saved searches, active requests, upcoming journeys and quick search. | US3,US12 |
| S6 | Search | Full page / panel | Guest and commuter | Origin, destination, date, time window, frequency and transport preference. | US4 |
| S7 | Search Results | Results page | Guest and commuter | Separate operator services and shared-journey suggestions; filters and sort. | US4,US7,US8 |
| S8 | Listing Details | Detail page | Guest and commuter | Route, schedule, fare, operator/publisher details, verification, updated date and CTA. | US8,US10,US11 |
| S9 | Create Journey | Form | Eligible publisher | Create once-off or recurring journey listing. | US5,US6 |
| S10 | Journey Management | Dashboard page | Journey publisher | Edit, pause, cancel listing and review requests. | US5,US10 |
| S11 | Journey Details / Occurrence | Detail page | Permitted users | View one scheduled occurrence and its current state. | US6,US10 |
| S12 | Match Suggestions | Results page | Commuter | Show compatible suggestions with match explanation and caveat. | US7 |
| S13 | Operator Dashboard | Dashboard page | Approved operator | Manage profile, routes, schedules, enquiries and listing freshness. | US8,US9 |
| S14 | Route Editor | Form | Approved operator | Add/edit route, stops, schedule, fare and availability. | US8 |
| S15 | Operator Setup | Onboarding | Operator applicant | Business profile and service details. | US9 |
| S16 | Verification Submission | Form | Operator applicant | Upload documents and track verification status. | US9 |
| S17 | Enquiry / Join Request | Form / modal | Authenticated commuter | Send structured enquiry or request to join. | US10,US11 |
| S18 | My Requests | Dashboard page | Commuter / publisher / operator | View sent and received requests, status, response and cancellation actions. | US10,US11 |
| S19 | Notifications | List page | Authenticated user | View, open and mark notifications read. | US12 |
| S20 | Profile & Settings | Settings page | Authenticated user | Update details, privacy preferences, terms, logout and delete account. | US3 |
| S21 | Admin Dashboard | Admin page | Admin | Review operators, pending routes, reports and key metrics. | US9,US14 |
| S22 | Reports & Moderation | Admin page | Admin | Investigate reports, record actions and suspend content/accounts. | US13,US14 |
| M1 | Cancel Request | Modal | Request owner | Confirm cancellation and optional reason. | US10,US11 |
| M2 | Cancel Journey | Modal | Journey publisher | Confirm cancellation and notify affected users. | US5,US6 |
| M3 | Suspend Listing / Account | Admin modal | Admin | Confirm moderation action and require reason. | US13,US14 |
| M4 | Delete Account | Modal | Authenticated user | Confirm account deletion and explain retained/anonymised records. | US3 |

## 8.2 Screen specification: S7 Search Results

Purpose: Present useful transport options for the selected journey without mixing operator services with private shared-journey listings.

Who can open it: Guest or signed-in commuter.

Comes from / goes to: S6 Search → S7 Results → S8 Listing Details, S12 Match Suggestions, S17 Enquiry / Join Request.

Layout (top to bottom):

- Header with CommuteConnect wordmark, search summary and account actions.

- Search summary card showing origin, destination, date, departure window and once-off/recurring selection; edit action returns to S6.

- Filter row: transport type, departure window, fare availability and verified operator status.

- Section A: “Transport operators” with cards showing operator name, verification label, route, schedule, fare or “Contact for fare”, last-updated date and view action.

- Section B: “Shared journeys” with cards showing approximate pickup/destination areas, departure time, travel days, seats and publisher status.

- Optional “Possible matches” panel explaining why the result may be relevant.

- Empty, loading, error and offline states.

- Pagination or “Load more” for result sets.

Fields: no new fields on results screen; search criteria are inherited from S6.

Buttons and actions:

- Edit search → S6 with existing values.

- Operator card → S8 details.

- Shared journey card → S8 details.

- Enquire → S17, requires authentication.

- Request to join → S17, requires authentication.

- Filter change → refresh results with updated criteria.

States:

- Normal: grouped results with clear result counts and update timestamps.

- Empty: “No options found for this journey yet.” Offer broader time/location suggestions.

- Loading: skeleton cards; avoid indefinite spinner.

- Error: “We couldn't load results. Try again.”

- Offline: show “You're offline. Results may be out of date.” Do not show cached results as live availability.

- Unverified provider: label “Not verified” or “Verification pending”; never imply approval.

- Stale listing: show “Last confirmed [date]” and reduce prominence or hide according to BR11.

## 8.3 Shared components

| Component | Used on | What it contains | Behaviour |
| --- | --- | --- | --- |
| Top navigation | S1–S22 public/auth pages | Wordmark, Search, List your service, Help, account menu. | Responsive; collapses to mobile menu. |
| Search form | S1,S6 | Origin, destination, date, time, frequency and type. | Validates fields; remembers recent search only with appropriate notice. |
| Transport result card | S7,S8 | Provider, route, fare, schedule, status, updated date. | Opens detail; status never inferred. |
| Journey card | S7,S10,S12 | Approximate route, time, days, seats, publisher. | Opens detail; hides private pickup coordinates. |
| Verification chip | S8,S13,S16,S21 | Pending, under review, verified, rejected, suspended. | Colour plus text; never colour alone. |
| Status chip | S10,S18,S19 | Pending, accepted, rejected, cancelled, closed. | Reflects server status. |
| Toast | Authenticated pages | Short success/error feedback. | Accessible announcement; disappears after a reasonable interval. |
| Empty state | S5,S7,S10,S13,S18 | Plain explanation and next action. | No fabricated records. |
| Report action | S8,S10 | Report listing/user and choose reason. | Creates private report; reporter identity not public. |

## 8.4 Sample data set

- Commuter A: Thandi Ndlovu, searches Tembisa to Midrand, weekdays, around 07:00. Use synthetic contact details.

- Commuter B: Kabelo Maseko, publishes a sample eligible recurring journey on a similar corridor for matching demonstrations. Mark all data as SAMPLE and do not imply legal approval.

- Operator A: Midrand Shuttle Demo, pending verification; sample routes and fares clearly marked DEMO.

- Operator B: Gauteng Commuter Services Demo, verified only in a test environment; never use real licence or identity documents in seed data.

- Admin: a test-only account with two-factor authentication enabled.

# 9. Design direction

| Item | Choice |
| --- | --- |
| Look and feel | Trustworthy, clear, modern and practical. Prioritise route information and legibility over decorative visuals. |
| Primary colour | Deep navy #173B57 for navigation, primary actions and strong text. |
| Secondary colour | Teal #176B78 for links, selected states and helpful highlights. |
| Accent colour | Warm amber #E3A33B for attention states and pending notices; do not use as small text on white. |
| Background / text | Off-white #F7F9FA / near-black #202A33. |
| Secondary text | Slate #5B6872. |
| Success / error / warning | Green #26734D / red #B3261E / amber #8A5A00. |
| Dark mode | Not required in v1; design tokens should not prevent future support. |
| Font | Inter or system sans-serif; clear numerals for fares and times. |
| Text sizes | Page title 28–32px desktop / 24px mobile; section 18–20px; body 16px; helper 14px. |
| Spacing | 4px base; common gaps 8, 16, 24 and 32px. |
| Screen margins | 24px desktop; 16px mobile. |
| Cards | Subtle borders, light shadow, clear separation between provider listings and shared journeys. |
| Buttons | Minimum 44–48px height, clear labels, visible focus state. |
| Icons | Lucide outline icons; always pair unfamiliar icons with labels. |
| Maps | Use map previews only where they clarify approximate route geography; provide equivalent text route details. |
| Images | Avoid generic stock-photo-heavy layouts; use authentic transport context only where appropriate. |
| Reference products | Google Maps for location clarity; marketplace search patterns for filtering; banking apps for clear trust/status presentation. |

Accessibility: meet WCAG 2.2 AA where practical. Ensure keyboard navigation, visible focus, accessible labels, contrast, scalable text and screen-reader announcements. Never communicate verification or safety status by colour alone.

Tone: plain, helpful and honest. Examples: “Request to join” rather than “Book now” where no booking exists; “Possible match” rather than “Perfect match”; “Verification pending” rather than “Trusted driver” before review.

Responsive target: design from 360px mobile width upwards, with desktop layouts for operator and admin dashboards.

# 10. Data model

The MVP uses Supabase PostgreSQL. Supabase Auth owns authentication identities; the application stores profile and marketplace data in related tables. UUID primary keys are recommended. Timestamps are stored in UTC. Sensitive documents are held in private storage buckets; database rows store object paths, not public URLs.

## 10.1 Core entities

| Entity | Purpose / key relationships |
| --- | --- |
| profiles | One application profile per auth user. Holds display name, phone, account preferences and account status. |
| operators | Business profile owned by a user. One owner may manage an operator account; additional team members can be added later. |
| operator_documents | Private verification evidence associated with an operator; access restricted to authorised reviewers. |
| locations | Saved/selected place labels and geocoded coordinates. Private pickup locations must be masked or approximate in public results. |
| vehicles | Optional operator vehicle metadata and capacity; sensitive registration details are restricted. |
| operator_routes | Published transport service between origin and destination, owned by an operator. |
| route_stops | Ordered intermediate stops for an operator route. |
| journeys | A shared-journey listing owned by a permitted publisher. |
| recurring_schedules | Repeat pattern associated with a journey listing. |
| journey_occurrences | Optional generated instances of recurring journeys; supports per-date cancellation and capacity. |
| journey_requests | Commuter requests to join a journey or occurrence. |
| enquiries | Commuter questions sent to an operator route. |
| notifications | In-app notification records for users. |
| reports | Safety, fraud or inaccurate-content reports. |
| audit_logs | Append-only record of important admin and security actions. |

## 10.2 Recommended fields

| Table | Important fields and rules |
| --- | --- |
| profiles | id UUID PK references auth.users; full_name VARCHAR(80) required; phone VARCHAR(20) optional; preferred_language; account_status (active, restricted, suspended, deleted); created_at; updated_at. |
| operators | id UUID PK; owner_id FK profiles; business_name; registration_number (restricted); description; contact_email; public_contact_method; verification_status; verified_at; reviewed_by; created_at. |
| operator_documents | id; operator_id FK; document_type; storage_path; status; submitted_at; reviewed_at; reviewer_id; rejection_reason. Never public. |
| locations | id; owner_id nullable; label; address_text; latitude; longitude; precision_level; is_private; created_at. Public queries should use approximate display values. |
| vehicles | id; operator_id; vehicle_type; make_model optional; capacity; registration_number restricted; status. |
| operator_routes | id; operator_id; origin_location_id; destination_location_id; route_name; fare_amount nullable; currency default ZAR; fare_type (fixed, from, contact); schedule_description; active; last_confirmed_at; created_at. |
| route_stops | id; route_id; location_id; stop_order; estimated_time optional. |
| journeys | id; publisher_id; origin_location_id; destination_location_id; journey_type (once_off, recurring); departure_at nullable for recurring template; seats_available; cost_sharing_amount nullable; currency; status; eligibility_review_state; created_at. |
| recurring_schedules | id; journey_id unique FK; days_of_week smallint[]; departure_time; valid_from; valid_until; timezone default Africa/Johannesburg. |
| journey_occurrences | id; journey_id; departure_at; status; seats_available; unique journey_id + departure_at. |
| journey_requests | id; journey_id or occurrence_id; commuter_id; message; status (pending, accepted, rejected, cancelled); created_at; responded_at; unique active request per commuter and occurrence. |
| enquiries | id; operator_route_id; commuter_id; message; status (new, responded, closed); created_at; responded_at. |
| notifications | id; recipient_id; type; title; body; link_target; is_read; email_status; created_at. |
| reports | id; reporter_id; target_type; target_id; reason; description; severity; status; assigned_admin_id; resolution_note; created_at; closed_at. |
| audit_logs | id; actor_id; action; target_type; target_id; metadata JSONB; created_at. Insert-only for normal users. |

## 10.3 Relationships

- One profile can own multiple journey listings and may own one or more operator profiles, subject to product policy.

- One operator has many operator documents, vehicles and routes.

- One operator route has many ordered route stops.

- One journey may have one recurring schedule and many generated occurrences.

- One journey occurrence has many join requests; each request belongs to one commuter.

- One operator route has many enquiries; each enquiry belongs to one commuter.

- One profile has many notifications and reports.

- One admin action may create an audit log entry.

## 10.4 Status changes

| Entity.field | From | To | Caused by |
| --- | --- | --- | --- |
| operators.verification_status | pending | under_review / verified / rejected / suspended | Admin review only. |
| operator_routes.status | draft | active / inactive / suspended | Operator publishes; admin may suspend. |
| journeys.status | draft | open / full / paused / cancelled / completed | Publisher actions and system capacity rules. |
| journey_requests.status | pending | accepted / rejected / cancelled | Publisher or requesting commuter; server validates. |
| enquiries.status | new | responded / closed | Operator response or closure. |
| reports.status | open | investigating / actioned / dismissed / closed | Admin moderation. |
| notifications.is_read | false | true | Recipient opens or marks notification. |

## 10.5 Indexes and constraints

- Index journeys on status, journey_type and departure_at; index operator_routes on active and operator_id.

- Index enquiries and journey_requests on recipient/owner and status for dashboard queries.

- Use unique constraints to prevent duplicate active requests for the same commuter and occurrence.

- Use database constraints for positive seat counts, non-negative fares and valid status values.

- Use transaction-safe logic for seat acceptance to prevent overbooking.

- Consider PostGIS geography columns and GiST indexes when geographic search is implemented.

## 10.6 Seed data

- Use fictional users, operators and routes with clearly labelled SAMPLE/DEMO records.

- Do not seed real ID documents, licence numbers, vehicle registration numbers or personal phone numbers.

- Include examples of pending, verified, rejected and suspended operator states in a test environment.

- Include once-off and recurring journey examples, a full listing, a cancelled occurrence and requests in each status.

# 11. Tech stack and architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React + Vite + TypeScript | Web-first, fast development, type safety and responsive browser support. |
| Styling | Tailwind CSS | Consistent responsive UI and rapid component styling. |
| Routing | React Router | Public pages, commuter routes, operator area and protected admin area. |
| Server state | TanStack Query | Caching, loading/error states and mutation handling. |
| Backend | Node.js + Express + TypeScript | Central business rules, validation, role checks and API boundary. |
| Database / Auth | Supabase PostgreSQL + Supabase Auth | Relational data, authentication, RLS and managed database. |
| Storage | Supabase Storage private buckets | Verification documents and controlled file access. |
| Validation | Zod | Shared request validation and predictable API errors. |
| Maps / geocoding | Google Maps Platform or Mapbox (choose after cost and terms review) | Location search, geocoding and map display. |
| Email | Resend or comparable transactional email provider | Request, verification and notification emails. |
| Testing | Vitest, React Testing Library, Supertest, Playwright | Unit, API, component and end-to-end coverage. |
| Hosting | Vercel frontend; Render or equivalent backend | Simple web deployment and environment separation. |
| Version control | GitHub with protected main branch and CI workflow | PR review, tests and deployment controls. |

## 11.1 How the parts connect

- The browser loads the React application from the frontend host.

- The frontend calls the Express REST API over HTTPS using the user's authenticated session.

- The API validates input, verifies the user and role, and enforces business rules.

- The API reads/writes PostgreSQL data through a controlled server-side connection or Supabase client.

- Private files are uploaded to restricted storage paths. The API creates short-lived signed links only for authorised reviewers.

- Database triggers or server workflows create notification and audit records.

- An email service sends transactional notifications; delivery failures are logged and retried.

- Scheduled jobs can mark stale listings for reconfirmation and process notification retries.

## 11.2 API endpoints (proposed)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /api/health | Service health check. |
| GET | /api/me | Current profile and permissions. |
| PATCH | /api/me | Update permitted profile fields. |
| GET | /api/search | Search operator routes and journey listings. |
| GET | /api/journeys/:id | Journey details. |
| POST | /api/journeys | Create eligible journey listing. |
| PATCH | /api/journeys/:id | Update own listing. |
| POST | /api/journeys/:id/requests | Request to join. |
| PATCH | /api/requests/:id | Accept, reject or cancel request according to role. |
| POST | /api/operators | Create operator application. |
| POST | /api/operators/:id/documents | Upload verification evidence. |
| POST | /api/operators/:id/routes | Create operator route. |
| GET | /api/operators/search | Search approved operator listings. |
| POST | /api/routes/:id/enquiries | Send enquiry. |
| GET | /api/notifications | List own notifications. |
| POST | /api/reports | Report a user or listing. |
| GET | /api/admin/verifications | Admin review queue. |
| PATCH | /api/admin/operators/:id/verification | Record verification decision. |
| GET | /api/admin/reports | Admin report queue. |

## 11.3 Environment variables

| Name | Purpose | Visibility |
| --- | --- | --- |
| VITE_SUPABASE_URL | Supabase project URL if browser client is used. | Public |
| VITE_SUPABASE_ANON_KEY | Supabase publishable/anon key; safe only with complete RLS. | Public |
| SUPABASE_SERVICE_ROLE_KEY | Privileged server operations only. | Secret; server only |
| DATABASE_URL | Backend database connection if direct PostgreSQL connection is used. | Secret; server only |
| MAPS_API_KEY | Geocoding/maps key; restrict by allowed domains and APIs. | Public-restricted browser key or secret server key depending integration |
| RESEND_API_KEY | Transactional email provider key. | Secret |
| JWT / session secrets | Only if custom session handling is used; prefer provider-managed auth. | Secret |
| APP_BASE_URL | Canonical application URL for email links. | Configuration |

Never commit .env files, service-role keys, database passwords or email API keys. Use local .env files excluded by Git, and production environment-variable settings in hosting dashboards.

## 11.4 Folder structure

commuteconnect/
  client/
    src/
      app/                 # routes and app providers
      components/          # shared UI components
      features/
        auth/
        search/
        journeys/
        operators/
        requests/
        notifications/
        admin/
      hooks/
      lib/
      styles/
  server/
    src/
      routes/
      controllers/
      services/
      middleware/
      validators/
      config/
      jobs/
  supabase/
    migrations/
    seed.sql
    functions/
  tests/
    unit/
    api/
    e2e/
  docs/
    PRD.md
    API.md
    SECURITY.md
  .github/workflows/ci.yml
  README.md

## 11.5 Testing plan

- Unit tests for route compatibility scoring, time-window matching, recurring-day rules, fare validation and status transitions.

- API tests for authentication, authorisation, request creation, acceptance, cancellation and operator verification.

- Concurrency test: two requests attempt to claim the last seat; only valid capacity may be accepted.

- RLS tests using commuter A, commuter B, operator and admin accounts to confirm data boundaries.

- End-to-end tests for commuter search, operator onboarding, route publishing, enquiry and admin review.

- Manual responsive testing at 360px, 768px and desktop widths.

- Accessibility checks for keyboard operation, focus, contrast and screen-reader labels.

- Test on slower mobile connections and verify loading, timeout and retry states.

# 12. Quality, errors, security and privacy

## 12.1 Quality requirements

| Area | Requirement |
| --- | --- |
| Speed | Search results should return within 3 seconds under normal pilot load, excluding slow third-party geocoding. |
| Data usage | Avoid large images and unnecessary map loads; use pagination and lightweight cards. |
| Offline | Show clear offline state; do not claim cached route availability is current. Mutations are disabled or safely retried. |
| Devices | Current major desktop and mobile browsers; minimum supported width 360px. |
| Language and region | English (South Africa) for v1; ZAR; dates and times shown in Africa/Johannesburg. |
| Scale | Initial design target: 500 registered pilot users, 50 operators/listings and 5,000 search requests; review actual hosting limits. |
| Availability | Best-effort pilot availability; monitor API and database errors. |
| Accessibility | WCAG 2.2 AA target for key user flows. |
| Freshness | Display last-updated/last-confirmed dates; stale operator routes must be flagged. |

## 12.2 Error messages

| Situation | Exact message | What happens next |
| --- | --- | --- |
| No internet | “You're offline. Check your connection and try again.” | Disable actions that require live data; retain non-sensitive form draft if safe. |
| Server error | “Something went wrong. Try again.” | Show retry action; log technical details without exposing secrets. |
| Login expired | “Your session has expired. Please sign in again.” | Return to login and restore safe return destination. |
| Not allowed | “You don't have permission to do that.” | Do not reveal protected data. |
| No results | “No options found for these details.” | Suggest nearby areas or a wider departure window. |
| Seat unavailable | “This journey no longer has available seats.” | Refresh journey status and remove accept action. |
| Upload failed | “Upload failed. Check the file and your connection.” | Keep non-sensitive form data; allow retry. |
| Verification pending | “Your details are being reviewed. We'll notify you when there's an update.” | Keep operator features restricted until approval. |
| Rate limit | “Too many attempts. Please wait and try again.” | Apply server-side rate limit. |
| Stale listing | “This information may be out of date. Confirm details with the provider.” | Display last-confirmed date and reduce prominence. |

## 12.3 Security

- Supabase Auth or another managed identity provider handles passwords; never store plaintext passwords.

- Enforce access control on the backend and database (RLS where applicable); hiding buttons is not security.

- Keep service-role keys and database credentials server-side only.

- Use HTTPS, secure cookies/session practices and CSRF protections where relevant.

- Validate and sanitise all inputs; use parameterised database operations.

- Apply rate limits to registration, login, enquiries, join requests, uploads and report submission.

- Store verification files in private buckets with short-lived signed access; restrict file type and size and scan where feasible.

- Use least-privilege admin accounts and multi-factor authentication.

- Record sensitive admin actions, status changes and document access in audit logs.

- Do not expose exact home addresses or private phone numbers in public search results.

- Protect against IDOR by checking record ownership on every read and write.

- Back up database data and test restoration before public launch.

## 12.4 POPIA and privacy

CommuteConnect processes personal information such as names, email addresses, phone numbers, journey patterns, approximate locations and operator verification documents. Journey and location patterns can reveal sensitive behavioural information. The platform must apply POPIA principles and obtain appropriate legal review before public launch.

| Personal information | Why collected | Who can see it | Storage / retention | Deletion approach |
| --- | --- | --- | --- | --- |
| Name, email, phone | Account, contact and service communication. | User; relevant counterpart only where needed; authorised admin. | Profile database while account active; defined retention for disputes/legal duties. | Profile settings/account deletion process; retain only lawful records. |
| Journey origin/destination and time | Search, matching and journey coordination. | User; relevant listing/request participants; restricted admin. | Database; retain only as long as needed for service and safety purposes. | User can delete drafts; completed/cancelled records follow retention policy. |
| Approximate location coordinates | Distance and route matching. | Backend; limited display to users where needed. | Database with access controls. | Delete or anonymise when no longer required. |
| Operator documents and identifiers | Review business/transport eligibility. | Authorised verification reviewers only. | Private storage; retention period defined by legal need and privacy notice. | Secure deletion at expiry or account closure, subject to legal holds. |
| Enquiry and request messages | Coordinate transport and resolve disputes. | Sender, recipient and authorised moderation staff where necessary. | Database; retention period defined in policy. | Deletion/anonymisation where legally and operationally permitted. |
| Reports and moderation notes | Safety, fraud and platform integrity. | Authorised admin and privacy/legal staff. | Restricted database; defined retention period. | Retain only as required for investigation and legal purposes. |

- Publish a clear Privacy Notice and Terms before account creation.

- Explain why location and journey information is collected and who can access it.

- Collect only the minimum location precision needed for the feature.

- Provide a way to access, correct and request deletion of personal information, subject to lawful retention.

- Set retention periods for verification documents, reports, enquiries and audit records.

- Assess cross-border data transfers and vendor processing locations.

- Appoint or designate an Information Officer and maintain appropriate records as required.

- Obtain legal review of platform role, transport regulatory requirements, terms and privacy documentation.

Transport-law caution: the platform's obligations depend on the actual service model and how it facilitates passenger transport. Do not enable paid private rides or present providers as compliant solely because they submitted documents. Obtain South African transport-law advice on operating-licence requirements, e-hailing/platform obligations, lift-club treatment and any registration duties before enabling those workflows.

# 13. Assumptions, risks, open questions and milestones

## 13.1 Assumptions

- Commuters experience enough difficulty discovering and coordinating transport to try a dedicated platform. Check through 25–30 commuter interviews and real journey requests.

- At least one Gauteng corridor has enough overlapping commuter demand to create useful matches. Check through a manual pilot before building broad geographic coverage.

- Some transport operators want an additional digital channel for route discovery and enquiries. Check through 8–10 operator interviews and pilot listings.

- Users will accept enquiry-based coordination without in-platform payments during the first test. Check conversion and qualitative feedback.

- Manual operator verification is feasible for a small pilot. Check reviewer effort and the quality of submitted evidence.

- Users will trust approximate pickup locations and controlled contact sharing more than public display of exact addresses. Check usability and trust feedback.

## 13.2 Risks

| Risk | Likelihood | Impact | Plan |
| --- | --- | --- | --- |
| Insufficient commuters on the same corridor | High | High | Pilot one corridor; recruit both sides before launch; measure searches with results. |
| Marketplace cold-start: too few operators and commuters | High | High | Onboard supply manually; run a small pilot; do not expand until corridor liquidity improves. |
| Private ride-sharing legal classification is unclear | Medium | High | Keep private ride publishing restricted; obtain legal advice before paid/public ride coordination. |
| Unsafe interaction, harassment or fraud | Medium | High | Verification, reporting, moderation, limited contact disclosure, clear safety guidance and audit logs. |
| Fake or stale operator listings | Medium | High | Admin approval, last-confirmed timestamps, reconfirmation prompts and suspension controls. |
| Incorrect fares or schedules | Medium | Medium | Require operator updates; label fare types; show last-updated date; allow reports. |
| Privacy breach of journey patterns or documents | Medium | High | Minimise data, use private storage, RLS, least privilege, audit logs and incident response plan. |
| Users continue using WhatsApp instead | High | Medium | Make route discovery and comparison the value; reduce friction and test repeat usage. |
| Operators will not pay | Medium | Medium | Do not build subscriptions first; test willingness to pay after operators receive measurable enquiries. |
| Map/geocoding costs become high | Medium | Medium | Use quotas, caching, manual location areas and cost monitoring; compare providers. |
| Overbooking due to concurrent requests | Low | High | Transaction-safe seat updates and concurrency tests. |
| Platform appears to guarantee safety or transport availability | Medium | High | Clear wording, explicit match disclaimers and no unverified trust claims. |

## 13.3 Open questions

| # | Question | Who decides | Needed by |
| --- | --- | --- | --- |
| Q1 | Which pilot corridor has the strongest combination of commuter demand and available operator supply? | Founder after interviews and manual test. | Before design freeze. |
| Q2 | What exact activities may CommuteConnect facilitate under South African transport law, especially private shared rides and paid passenger transport? | Founder with qualified transport-law adviser. | Before enabling private ride publishing or payments. |
| Q3 | What evidence is required to label an operator or service verified, and who performs each check? | Founder / compliance reviewer. | Before operator onboarding. |
| Q4 | Will the MVP allow a commuter to publish a shared ride, or begin with operator listings and commuter requests only? | Founder after legal review and validation. | Before implementation of F3. |
| Q5 | Should route matching use approximate neighbourhoods, user-selected landmarks or geocoded points in v1? | Product owner / UX designer. | Before database and search implementation. |
| Q6 | Which map/geocoding provider offers suitable coverage, pricing and terms for the pilot? | Technical lead. | Before integration. |
| Q7 | What retention periods apply to verification files, reports and journey records? | Information Officer / legal adviser. | Before public pilot. |
| Q8 | Should operators pay for subscriptions, featured listings or completed bookings after validation? | Founder after willingness-to-pay interviews. | After pilot evidence. |

## 13.4 Milestones

| Milestone | What is finished | Where to find it | Target |
| --- | --- | --- | --- |
| M0: Concept confirmed | Concept, target users and selected platform decisions. | docs/concept.md | Complete |
| M1: Validation complete | Interviews, competitor scan, corridor selection and manual demand test. | docs/validation/ | Before full MVP build |
| M2: PRD approved | This PRD updated with open questions answered and legal scope clarified. | docs/PRD.md | Before UI design freeze |
| M3: Design ready | Responsive design system, user flows and screen designs for MVP screens. | Design workspace | After PRD approval |
| M4: Foundation built | React app, Express API, Supabase project, auth, CI and migrations. | GitHub repository | Development phase 1 |
| M5: Core marketplace built | Search, operator routes, eligible journeys, matching and enquiries/requests. | Staging deployment | Development phase 2 |
| M6: Admin and security complete | Verification review, moderation, RLS, audit logs and tests. | Staging deployment | Before pilot |
| M7: Controlled pilot | One validated corridor, participating operators and commuters, support process. | Pilot URL and metrics report | After compliance sign-off |
| M8: Pilot review | Usage, match success, retention, safety and willingness-to-pay findings. | docs/pilot-report.md | After 30-day pilot |

# 14. AI prompts / implementation prompts

Use these prompts with a coding assistant only after the PRD and screen designs are approved. Keep the assistant constrained to the relevant feature and require tests.

## 14.1 Project foundation prompt

You are implementing CommuteConnect, a responsive web MVP. Read docs/PRD.md first.
Use React + Vite + TypeScript + Tailwind for the client, Node.js + Express + TypeScript
for the API, and Supabase PostgreSQL/Auth/Storage. Do not invent features outside the
PRD. Start by inspecting the repository, then propose a small implementation plan.
Do not expose service-role keys in the browser. Add validation, error states, tests and
accessible responsive components. Do not enable private paid ride workflows until the
legal scope in the PRD is resolved.

## 14.2 Database implementation prompt

Implement the CommuteConnect schema from Section 10 of docs/PRD.md as ordered
Supabase migrations. Include foreign keys, constraints, indexes, RLS policies and
seed data using fictional SAMPLE records only. Ensure users cannot read or modify
other users' private records. Make accepting a journey request transaction-safe so
the final seat cannot be overbooked. Document any schema decisions that require
product-owner approval.

## 14.3 Feature implementation prompt

Implement one feature at a time from the approved PRD. Before coding, list the
user stories, screens, API endpoints, tables, business rules and tests affected.
Implement loading, empty, error, offline and permission-denied states. Add unit/API
tests for acceptance criteria. Do not silently change the PRD; flag conflicts and
ask for a decision.

## 14.4 UI implementation prompt

Build the specified CommuteConnect screen from the approved design. Follow the
design direction in Section 9, support 360px mobile through desktop, use accessible
labels and keyboard focus, and keep operator services visually distinct from private
shared-journey suggestions. Never label a match as a confirmed booking or an
unverified provider as verified.

# 15. Checklist sign-off

## 15.1 Traceability check

| Feature | Stories | Screens | Business rules |
| --- | --- | --- | --- |
| F1 Account and profile | US1–US3 | S1–S5,S20,M4 | BR1,BR2,BR12,BR18 |
| F2 Journey search | US4 | S1,S6,S7 | BR3,BR4,BR17,BR18 |
| F3 Journey listings | US5,US6 | S9–S11 | BR4–BR6,BR16 |
| F4 Matching | US7 | S7,S12 | BR3,BR5,BR13 |
| F5 Operator directory/routes | US8 | S7,S8,S13,S14 | BR9–BR11 |
| F6 Operator onboarding | US9 | S15,S16,S21 | BR2,BR9,BR12 |
| F7 Requests and enquiries | US10,US11 | S8,S17,S18,M1,M2 | BR7,BR8,BR12–BR14 |
| F8 Notifications | US12 | S19 | BR14 |
| F9 Reporting/moderation | US13 | S8,S10,S22,M3 | BR12,BR15 |
| F10 Admin | US9,US14 | S21,S22 | BR9,BR15 |
| F11 Analytics | Admin metrics | S21 | Metric definitions in Section 3 |

## 15.2 Release checklist

- All Must features implemented or explicitly excluded from the pilot scope.

- All Must user-story acceptance criteria pass.

- RLS and backend permission tests pass for commuter, operator and admin roles.

- No secrets committed to GitHub; production secrets stored in hosting environment.

- Operator verification workflow and audit logging tested.

- Seat concurrency and duplicate-request tests pass.

- Private location and document access reviewed.

- Terms, Privacy Notice, POPIA and transport-law review completed for enabled features.

- Safety reporting, support ownership and incident escalation process are documented.

- Mobile and desktop responsive tests completed.

- Pilot corridor and initial operator supply confirmed.

- Monitoring, backups and rollback plan ready.

## 15.3 Sign-off

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product owner | [Name] | Approved / Changes required | [Date] |
| Technical reviewer | [Name] | Approved / Changes required | [Date] |
| UX reviewer | [Name] | Approved / Changes required | [Date] |
| Legal / compliance reviewer | [Name] | Approved / Changes required | [Date] |

# 16. Glossary

| Term | Meaning |
| --- | --- |
| MVP | Minimum Viable Product: the smallest product release that can test the core value proposition with real users. |
| Commuter | A person who travels from one place to another for work, education or other activities. |
| Transport operator | A business or provider that offers transport services and lists them on CommuteConnect. |
| Private shared journey | A journey listing published by an eligible individual seeking to coordinate a shared trip; subject to legal review and platform policy. |
| Recurring journey | A journey that repeats on selected days and times. |
| Once-off journey | A journey planned for one specific date and time. |
| Route | A path or service between an origin and destination, optionally including intermediate stops. |
| Match | A suggestion generated from compatible route, time and schedule information. |
| Enquiry | A request for information sent to a transport operator. |
| Join request | A commuter's request to join a specific shared journey. |
| Verification | An administrative review of information and documents; the exact checks must be defined and must not imply a guarantee of safety. |
| RLS | Row Level Security: database rules that restrict which rows a logged-in user can access. |
| POPIA | Protection of Personal Information Act, South Africa's personal information protection law. |
| PostGIS | A PostgreSQL extension for storing and querying geographic data. |
| North-star metric | The primary metric that best reflects whether the product delivers its central value. |
| Liquidity | Whether enough relevant commuters and providers are available in the same corridor/time window for the marketplace to be useful. |

## Peer review

| Reviewer | Date | Summary |
| --- | --- | --- |
| [Reviewer name] | [Date] | [One-sentence review summary] |
