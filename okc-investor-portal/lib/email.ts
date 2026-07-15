import { Resend } from 'resend'

// Transactional email via Resend. Configure in .env.local:
//   RESEND_API_KEY  (dashboard > API Keys)
//   EMAIL_FROM      (verified sender; defaults to Resend's onboarding sender,
//                    which can only deliver to the account owner's address)
// If unset, callers surface the generated credentials to the admin instead.

export type SendEmailResult = { sent: true } | { sent: false; reason: string }

export async function sendCredentialsEmail({
  to,
  password,
  loginUrl,
}: {
  to: string
  password: string
  loginUrl: string
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      sent: false,
      reason: 'Email is not configured (set RESEND_API_KEY in .env.local).',
    }
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'OKC <onboarding@resend.dev>',
    to,
    subject: 'Your OKC investor portal account',
    text: [
      'An account has been created for you on the OKC investor portal.',
      '',
      `Sign in at: ${loginUrl}`,
      `Email: ${to}`,
      `Temporary password: ${password}`,
      '',
      'You will be asked to choose a new password the first time you sign in.',
      '',
      'If you were not expecting this email, please contact your fund manager.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #071437;">
        <h2 style="color: #071437;">Welcome to the OKC investor portal</h2>
        <p>An account has been created for you. Use the credentials below to sign in:</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 6px 16px 6px 0; color: #6b7894;">Email</td>
            <td style="padding: 6px 0; font-weight: bold;">${to}</td>
          </tr>
          <tr>
            <td style="padding: 6px 16px 6px 0; color: #6b7894;">Temporary password</td>
            <td style="padding: 6px 0; font-family: monospace; font-weight: bold;">${password}</td>
          </tr>
        </table>
        <p>
          <a href="${loginUrl}"
             style="display: inline-block; background: #1f6bff; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Sign in to the portal
          </a>
        </p>
        <p style="color: #6b7894; font-size: 14px;">
          You will be asked to choose a new password the first time you sign in.
          If you were not expecting this email, please contact your fund manager.
        </p>
      </div>
    `,
  })

  if (error) {
    return { sent: false, reason: error.message }
  }
  return { sent: true }
}
