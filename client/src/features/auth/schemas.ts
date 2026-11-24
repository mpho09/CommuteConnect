import { z } from 'zod'

/**
 * Client-side validation for the auth screens. The server re-validates
 * everything; these give fast, specific feedback.
 */

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .pipe(z.email('Enter a valid email address, like name@example.com.'))

/** Shown as a live checklist under the password field. */
export const PASSWORD_RULES: Array<{ label: string; test: (pw: string) => boolean }> = [
  { label: '8+ characters', test: (pw) => pw.length >= 8 },
  { label: 'An uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'A number or symbol', test: (pw) => /[\d\W_]/.test(pw) },
]

const newPassword = z
  .string()
  .min(1, 'Create a password.')
  .max(72, 'Use 72 characters or fewer.')
  .refine((pw) => PASSWORD_RULES.every((r) => r.test(pw)), {
    message: 'Use at least 8 characters, with an uppercase letter and a number or symbol.',
  })

function passwordsMatch(v: { password: string; confirmPassword: string }) {
  return v.password === v.confirmPassword
}
const mismatch = { message: 'Passwords don’t match.', path: ['confirmPassword'] }

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name.')
      .max(80, 'Use 80 characters or fewer.'),
    email,
    // BR2: commuter, operator or both.
    roles: z
      .array(z.enum(['commuter', 'operator']))
      .min(1, 'Choose how you’ll use CommuteConnect.'),
    password: newPassword,
    confirmPassword: z.string().min(1, 'Re-enter your password.'),
    // BR18
    acceptedTerms: z.boolean().refine((v) => v, {
      message: 'You need to accept the Terms of Service and Privacy Notice to create an account.',
    }),
  })
  .refine(passwordsMatch, mismatch)

export type SignUpValues = z.input<typeof signUpSchema>

export const logInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, 'Re-enter your new password.'),
  })
  .refine(passwordsMatch, mismatch)

export type FieldErrors<K extends string> = Partial<Record<K, string>>

/** First message per top-level field, in schema order. */
export function toFieldErrors<K extends string>(error: z.ZodError): FieldErrors<K> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !out[key]) out[key] = issue.message
  }
  return out as FieldErrors<K>
}
