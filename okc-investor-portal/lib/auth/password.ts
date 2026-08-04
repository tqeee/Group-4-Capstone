// One definition of what makes a password acceptable, shared by the server
// action that enforces it and the /change-password checklist that previews it.
//
// The character-class rules mirror the Supabase project's own password policy.
// Duplicating them here is deliberate: Supabase only applies its policy inside
// updateUser(), and in the recovery flow that call is what SPENDS the reset
// link's single-use token. Checking first means a password the policy would
// reject costs the user a retry, not their link.

export const MIN_PASSWORD_LENGTH = 12
// bcrypt (used by Supabase Auth) only hashes the first 72 bytes.
export const MAX_PASSWORD_LENGTH = 72

export type PasswordRule = {
  id: string
  /** Shown in the live checklist. */
  label: string
  /** Returned by the server when the rule fails. */
  problem: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `Between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
    problem: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    test: (pw) => pw.length >= MIN_PASSWORD_LENGTH && pw.length <= MAX_PASSWORD_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    problem: 'Password must include an uppercase letter.',
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    problem: 'Password must include a lowercase letter.',
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: 'number',
    label: 'One number',
    problem: 'Password must include a number.',
    test: (pw) => /[0-9]/.test(pw),
  },
  {
    id: 'special',
    label: 'One special character (e.g. ! @ # $ %)',
    problem: 'Password must include a special character.',
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
]

/** The first unmet rule's message, or null when the password is acceptable. */
export function firstPasswordProblem(password: string): string | null {
  // Distinguish the two length failures — "at least 12" is useless advice to
  // someone who pasted a 100-character passphrase.
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`
  }
  return PASSWORD_RULES.find((rule) => !rule.test(password))?.problem ?? null
}
