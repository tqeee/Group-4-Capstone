import { getSettings } from '@/lib/settings'
import SettingsClient from './SettingsClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await getSettings()
  return <SettingsClient settings={settings} />
}
