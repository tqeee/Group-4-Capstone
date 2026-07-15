import { prisma } from '@/lib/db'

// Admin-configurable portal settings, persisted as key-value rows. Unset keys
// fall back to these defaults. minDeposit/minWithdrawal are enforced when
// investors submit fund-flow requests; largeTransactionThreshold is surfaced
// to operations during review.
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
  const rows = await prisma.portalSetting.findMany()
  const settings = { ...SETTING_DEFAULTS } as PortalSettings
  for (const row of rows) {
    if (row.key in settings) settings[row.key as SettingKey] = row.value
  }
  return settings
}

export async function saveSettings(
  values: Partial<PortalSettings>,
  updatedBy: string
): Promise<void> {
  const entries = Object.entries(values).filter(([key]) => key in SETTING_DEFAULTS)
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
