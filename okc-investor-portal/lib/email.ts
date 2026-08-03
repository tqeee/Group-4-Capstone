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

// ⚠ FAKE DEMO DATA — a fictional bank/account for this demo, not a real
// institution. Replace with OKC's real bank account details before this goes
// anywhere near production.
const BANK_DETAILS = {
  bankName: 'Marina Bay Trust Bank',
  accountName: 'OKC Capital Pte Ltd',
  accountNumber: '003-9182746-1',
  swift: 'MBTBSGSG',
  bankAddress: '9 Raffles Place, #10-01, Marina Bay Trust Tower, Singapore 048619',
}

// Sent when operations approves a deposit request: tells the investor where
// to wire the money and what reference to use, so operations can match the
// investor's proof of transfer back to this request.
export async function sendBankDetailsEmail({
  to,
  investorName,
  amountLabel,
  reference,
}: {
  to: string
  investorName: string
  amountLabel: string // pre-formatted, e.g. "$10,000.00"
  reference: string // quote this on the transfer so ops can match it
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
    subject: 'Bank transfer details for your OKC deposit',
    text: [
      `Hi ${investorName},`,
      '',
      `Your deposit request for ${amountLabel} has been approved. Please transfer the funds to the account below:`,
      '',
      `Bank name: ${BANK_DETAILS.bankName}`,
      `Account name: ${BANK_DETAILS.accountName}`,
      `Account number: ${BANK_DETAILS.accountNumber}`,
      `SWIFT / BIC: ${BANK_DETAILS.swift}`,
      `Bank address: ${BANK_DETAILS.bankAddress}`,
      '',
      `Please quote reference "${reference}" on the transfer.`,
      '',
      'Once you have made the transfer, submit your proof of transfer on the Request Transaction page so we can confirm receipt and apply the funds.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #071437;">
        <h2 style="color: #071437;">Bank transfer details for your OKC deposit</h2>
        <p>Hi ${investorName},</p>
        <p>Your deposit request for <strong>${amountLabel}</strong> has been approved. Please transfer the funds to the account below:</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 16px 6px 0; color: #6b7894;">Bank name</td><td style="padding: 6px 0; font-weight: bold;">${BANK_DETAILS.bankName}</td></tr>
          <tr><td style="padding: 6px 16px 6px 0; color: #6b7894;">Account name</td><td style="padding: 6px 0; font-weight: bold;">${BANK_DETAILS.accountName}</td></tr>
          <tr><td style="padding: 6px 16px 6px 0; color: #6b7894;">Account number</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold;">${BANK_DETAILS.accountNumber}</td></tr>
          <tr><td style="padding: 6px 16px 6px 0; color: #6b7894;">SWIFT / BIC</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold;">${BANK_DETAILS.swift}</td></tr>
          <tr><td style="padding: 6px 16px 6px 0; color: #6b7894;">Bank address</td><td style="padding: 6px 0;">${BANK_DETAILS.bankAddress}</td></tr>
        </table>
        <p>Please quote reference <strong>"${reference}"</strong> on the transfer.</p>
        <p style="color: #6b7894; font-size: 14px;">
          Once you have made the transfer, submit your proof of transfer on the Request Transaction page
          so we can confirm receipt and apply the funds.
        </p>
      </div>
    `,
  })

  if (error) {
    return { sent: false, reason: error.message }
  }
  return { sent: true }
}
