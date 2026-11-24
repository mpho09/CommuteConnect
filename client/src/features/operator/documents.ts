import type { DocumentType } from '../../lib/api/types'

/** Verification documents (PRD F6, operator_documents). Never shown publicly (BR12). */
export const DOCUMENTS: Array<{
  type: DocumentType
  label: string
  description: string
  required: boolean
}> = [
  {
    type: 'operating_licence',
    label: 'Operating licence',
    description: 'Your operating licence or permit for the routes you run.',
    required: true,
  },
  {
    type: 'business_registration',
    label: 'Business registration',
    description: 'CIPC registration, or your association’s constitution.',
    required: true,
  },
  {
    type: 'proof_of_address',
    label: 'Proof of business address',
    description: 'A recent utility bill or lease for your office or depot.',
    required: true,
  },
  {
    type: 'vehicle_roadworthy',
    label: 'Vehicle roadworthy certificate',
    description: 'Recommended: a current roadworthy certificate for a vehicle you use.',
    required: false,
  },
]

export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
export const MAX_BYTES = 5 * 1024 * 1024

/** Client-side check before uploading; the server checks again. */
export function checkFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Upload a PDF, JPG or PNG file.'
  if (file.size > MAX_BYTES) return 'Files must be 5 MB or smaller.'
  if (file.size === 0) return 'This file is empty. Choose another file.'
  return null
}
