'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { saveSettings, SETTING_DEFAULTS, type PortalSettings } from '@/lib/settings'
import { audit } from '@/lib/audit'

export type SaveSettingsState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

export async function updateSettings(
  _prevState: SaveSettingsState,
  formData: FormData
): Promise<SaveSettingsState> {
  const guard = await requireRole('admin')
  if (!guard.ok) return { status: 'error', message: guard.message }

  const values: Partial<PortalSettings> = {}
  for (const key of Object.keys(SETTING_DEFAULTS) as (keyof PortalSettings)[]) {
    const value = formData.get(key)
    if (typeof value === 'string' && value.trim() !== '') {
      values[key] = value.trim()
    }
  }

  const numericKeys = ['minDeposit', 'minWithdrawal', 'managementFee', 'largeTransactionThreshold'] as const
  for (const key of numericKeys) {
    if (values[key] !== undefined && (!Number.isFinite(Number(values[key])) || Number(values[key]) < 0)) {
      return { status: 'error', message: `"${key}" must be a non-negative number.` }
    }
  }

  await saveSettings(values, guard.email)
  await audit('SETTINGS_UPDATED', {
    actor: guard.email,
    detail: Object.keys(values).join(', '),
  })

  revalidatePath('/settings')
  revalidatePath('/request-transaction')
  return { status: 'success', message: 'Settings saved.' }
}
