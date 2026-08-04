import { prisma } from '@/lib/db'
import { getCurrentManagementFeeRate } from '@/lib/managementFee'

// Admin-configurable portal settings, persisted as key-value rows. Unset keys
// fall back to these defaults. minDeposit/minWithdrawal are enforced when
// investors submit fund-flow requests; largeTransactionThreshold is surfaced
// to operations during review.
//
// managementFee is a special case: it's kept in this type only so the
// settings form can keep reading/writing it like any other field, but it is
// NOT persisted here. It's backed by lib/managementFee.ts's rate history
// instead (see the ManagementFeeRate schema comment for why) — getSettings
// overlays the live current rate below, and the settings action writes
// changes through setManagementFeeRate rather than saveSettings.
export const SETTING_DEFAULTS = {
  portalName: 'OKC Investor Portal',
  contactEmail: 'im@okc.com',
  navUpdateTime: '19:00',
  timezone: 'Asia/Singapore',
  minDeposit: '1000',
  minWithdrawal: '1000',
  managementFee: '1',
  largeTransactionThreshold: '500000',
} as const

export type SettingKey = keyof typeof SETTING_DEFAULTS
export type PortalSettings = Record<SettingKey, string>

export async function getSettings(): Promise<PortalSettings> {
  const [rows, currentFeeRate] = await Promise.all([
    prisma.portalSetting.findMany(),
    getCurrentManagementFeeRate(),
  ])
  const settings = { ...SETTING_DEFAULTS } as PortalSettings
  for (const row of rows) {
    if (row.key in settings) settings[row.key as SettingKey] = row.value
  }
  settings.managementFee = String(currentFeeRate)
  return settings
}

export async function saveSettings(
  values: Partial<PortalSettings>,
  updatedBy: string
): Promise<void> {
  // managementFee never lands in portal_settings — see the comment above.
  const entries = Object.entries(values).filter(
    ([key]) => key in SETTING_DEFAULTS && key !== 'managementFee'
  )
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.portalSetting.upsert({
        where: { key },
        update: { value, updatedBy },
        create: { key, value, updatedBy },
      })
    )
  )
}
