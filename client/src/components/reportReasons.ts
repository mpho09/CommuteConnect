export const REPORT_REASONS = [
  { value: 'safety', label: 'Safety concern' },
  { value: 'fraud', label: 'Scam or fraud' },
  { value: 'inaccurate', label: 'Inaccurate or outdated information' },
  { value: 'harassment', label: 'Harassment or abusive behaviour' },
  { value: 'other', label: 'Something else' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']

export interface ReportSubmission {
  reason: ReportReason
  details: string
}
