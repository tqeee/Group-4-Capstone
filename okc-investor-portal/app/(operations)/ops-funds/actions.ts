'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/guards'
import { audit } from '@/lib/audit'
import { FUND_CURRENCIES } from './constants'

export type CreateFundState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

// Launch a new fund product (§3.4 multi-fund support). Once created it
// immediately appears everywhere funds are listed — including the investor
// deposit form — so validation is strict.
export async function createFund(
  _prevState: CreateFundState,
  formData: FormData
): Promise<CreateFundState> {
  const guard = await requireRole('operations')
  if (!guard.ok) return { status: 'error', message: guard.message }

  const code = String(formData.get('code') ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,10}$/.test(code)) {
    return { status: 'error', message: 'Fund code must be 2–10 letters or digits (e.g. XAU).' }
  }

  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 3 || name.length > 80) {
    return { status: 'error', message: 'Please enter a fund name (3–80 characters).' }
  }

  const currency = String(formData.get('currency') ?? '')
  if (!FUND_CURRENCIES.includes(currency as (typeof FUND_CURRENCIES)[number])) {
    return { status: 'error', message: 'Please choose a valid currency.' }
  }

  const inceptionRaw = String(formData.get('inceptionDate') ?? '').trim()
  const inceptionDate = new Date(`${inceptionRaw}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(inceptionRaw) ||
    isNaN(inceptionDate.getTime()) ||
    inceptionDate < new Date('2000-01-01') ||
    inceptionDate > new Date(Date.now() + 366 * 24 * 3600 * 1000)
  ) {
    return { status: 'error', message: 'Please enter a valid inception date.' }
  }

  const strategy = String(formData.get('strategy') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  if (strategy.length > 120 || description.length > 500) {
    return { status: 'error', message: 'Strategy or description is too long.' }
  }

  try {
    await prisma.fund.create({
      data: {
        code,
        name,
        currency,
        inceptionDate,
        strategy: strategy || null,
        description: description || null,
      },
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      return { status: 'error', message: `A fund with code ${code} already exists.` }
    }
    throw err
  }

  await audit('FUND_CREATED', {
    actor: guard.email,
    detail: `${code} — ${name} (${currency})`,
  })

  // Funds are listed on all of these.
  revalidatePath('/ops-funds')
  revalidatePath('/data-import')
  revalidatePath('/operations')
  revalidatePath('/funds')
  revalidatePath('/request-transaction')

  return {
    status: 'success',
    message: `${name} (${code}) is live — investors can now submit deposits into it.`,
  }
}
