// Demo seed: run with `npx tsx prisma/seed.ts`
//
// Creates the ALPHA fund, portal profiles + Supabase auth users for two
// investors and the ops/admin staff, broker deals (dataset 5.4 shape)
// reproducing the demo P&L series, fund flows (dataset 5.2) with staggered
// deposits so the §8.1 shareholding split is visible, then rebuilds the ledger.
//
// Demo logins (all with password OkcDemo#2026):
//   faye.cheah@example.com  (investor, in the fund since 17 Mar 2026)
//   sarah.lim@example.com   (investor, joined 1 Apr 2026)
//   ops@okccapital.sg       (operations)
//   admin@okccapital.sg     (admin)

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { rebuildFundLedger } from '../lib/ledger'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

const DEMO_PASSWORD = 'OkcDemo#2026'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Daily P&L series for the demo fund (fund-level, SGD).
const DAILY_PNL: [string, number][] = [
  ['2026-03-17', -1510.63],
  ['2026-03-18', -507.2],
  ['2026-03-19', 844.37],
  ['2026-03-20', -1930.44],
  ['2026-03-23', -723.27],
  ['2026-03-24', 225.17],
  ['2026-03-25', -1291.36],
  ['2026-03-26', 968.47],
  ['2026-03-27', 845.19],
  ['2026-03-30', -1417.81],
  ['2026-03-31', -2060.03],
  ['2026-04-01', -1434.73],
  ['2026-04-02', -7154.65],
  ['2026-04-06', -3110.5],
  ['2026-04-07', -1420.2],
  ['2026-04-08', -1.2],
]

async function ensureAuthUser(email: string, role: string, name: string): Promise<string> {
  // listUsers has no email filter pre-v2 admin API; page through (small demo set).
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = data?.users.find(u => u.email?.toLowerCase() === email)
  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      app_metadata: { ...existing.app_metadata, role, must_change_password: false },
      user_metadata: { name },
    })
    return existing.id
  }
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { role, must_change_password: false },
    user_metadata: { name },
  })
  if (error) throw new Error(`create auth user ${email}: ${error.message}`)
  return created.user!.id
}

async function main() {
  console.log('Seeding fund…')
  // ALPHA (formerly XAU). Renamed so it stops colliding with GOLD, which holds
  // the firm's real broker workbook: both were named after gold AND both traded
  // XAUUSD, so neither the fund lists nor an individual deal row told you which
  // fund you were looking at. ALPHA's deals below are synthetic — generated
  // here purely to give the demo investors a shareholding-split story — and now
  // trade EURUSD so the two funds are distinguishable end to end. The firm's
  // real dataset lives in GOLD.
  const fund = await prisma.fund.upsert({
    where: { code: 'ALPHA' },
    update: {},
    create: {
      code: 'ALPHA',
      name: 'OKC Alpha Fund',
      description: 'Systematic momentum strategy executed by an expert advisor.',
      currency: 'SGD',
      strategy: 'Expert Advisor · Systematic momentum',
      inceptionDate: new Date('2026-03-17T00:00:00Z'),
    },
  })

  console.log('Seeding auth users + investor profiles…')
  const people = [
    { email: 'faye.cheah@example.com', name: 'Faye Cheah', role: 'investor', dbRole: 'INVESTOR', onboarded: '2026-03-16' },
    { email: 'sarah.lim@example.com', name: 'Sarah Lim', role: 'investor', dbRole: 'INVESTOR', onboarded: '2026-03-30' },
    { email: 'ops@okccapital.sg', name: 'Operations Team', role: 'operations', dbRole: 'OPERATIONS', onboarded: '2026-03-01' },
    { email: 'admin@okccapital.sg', name: 'Portal Admin', role: 'admin', dbRole: 'ADMIN', onboarded: '2026-03-01' },
  ] as const

  const profiles: Record<string, { id: string }> = {}
  for (const p of people) {
    const authUserId = await ensureAuthUser(p.email, p.role, p.name)
    profiles[p.email] = await prisma.investor.upsert({
      where: { email: p.email },
      update: { authUserId, name: p.name, role: p.dbRole },
      create: {
        email: p.email,
        name: p.name,
        role: p.dbRole,
        authUserId,
        onboardingDate: new Date(`${p.onboarded}T00:00:00Z`),
      },
    })
    console.log(`  ${p.email} (${p.role})`)
  }

  console.log('Seeding fund flows…')
  const faye = profiles['faye.cheah@example.com']
  const sarah = profiles['sarah.lim@example.com']
  await prisma.fundFlow.deleteMany({ where: { fundId: fund.id } })
  await prisma.fundFlow.createMany({
    data: [
      // Faye funds the strategy the day before trading starts.
      {
        investorId: faye.id, fundId: fund.id, type: 'DEPOSIT', amount: 50000,
        status: 'COMPLETED', requestDate: new Date('2026-03-14T09:00:00Z'),
        processedDate: new Date('2026-03-16T00:00:00Z'), reviewedBy: 'ops@okccapital.sg',
        note: 'Initial subscription.',
      },
      // Sarah joins mid-run: processed end of 31 Mar, participates from 1 Apr.
      {
        investorId: sarah.id, fundId: fund.id, type: 'DEPOSIT', amount: 20000,
        status: 'COMPLETED', requestDate: new Date('2026-03-30T03:00:00Z'),
        processedDate: new Date('2026-03-31T00:00:00Z'), reviewedBy: 'ops@okccapital.sg',
        note: 'Onboarding deposit.',
      },
      // Open items for the operations review queue demo.
      {
        investorId: faye.id, fundId: fund.id, type: 'WITHDRAWAL', amount: 10000,
        status: 'PENDING', requestDate: new Date('2026-04-07T06:22:00Z'),
        note: 'Partial withdrawal.',
      },
      {
        investorId: sarah.id, fundId: fund.id, type: 'DEPOSIT', amount: 15000,
        status: 'PENDING', requestDate: new Date('2026-04-08T02:10:00Z'),
        note: 'Top-up.',
      },
    ],
  })

  console.log('Seeding broker deals…')
  await prisma.deal.deleteMany({ where: { fundId: fund.id } })
  let ticket = 500001n
  let position = 91000n
  const deals = []
  for (const [date, pnl] of DAILY_PNL) {
    // Split each day's P&L across a few closing deals (entry = 1/out), the way
    // the broker's raw export reports realised profit.
    const parts = [0.5, 0.3, 0.2]
    let remaining = Math.round(pnl * 100)
    for (let i = 0; i < parts.length; i++) {
      const cents = i === parts.length - 1 ? remaining : Math.round(pnl * 100 * parts[i])
      remaining -= cents
      const profit = cents / 100
      const hour = 10 + i * 3
      deals.push({
        ticket: ticket++,
        fundId: fund.id,
        order: ticket + 1000n,
        time: new Date(`${date}T${String(hour).padStart(2, '0')}:30:00Z`),
        type: profit >= 0 ? 0 : 1,
        entry: 1,
        positionId: position++,
        volume: 0.5 + i * 0.25,
        // EURUSD so ALPHA's instrument differs from GOLD's XAUUSD — with both
        // funds on the same symbol there was no way to tell from a deal row
        // which fund it belonged to. Price kept in a realistic EUR/USD band
        // (~1.0800–1.1200); the P&L series below is unaffected either way.
        price: 1.08 + Math.round(Math.random() * 400) / 10000,
        commission: 0,
        swap: 0,
        profit,
        fee: 0,
        symbol: 'EURUSD',
        comment: 'ea-close',
      })
    }
  }
  await prisma.deal.createMany({ data: deals })
  console.log(`  ${deals.length} deals over ${DAILY_PNL.length} trading days`)

  console.log('Rebuilding ledger (§8.1)…')
  await rebuildFundLedger(fund.id)

  const nav = await prisma.fundDailyNav.findMany({ orderBy: { date: 'asc' } })
  const last = nav[nav.length - 1]
  console.log(
    `  ${nav.length} NAV days, closing balance ${Number(last.closingBalance).toFixed(2)} on ${last.date.toISOString().slice(0, 10)}`
  )
  const ledger = await prisma.investorDailyLedger.findMany({
    where: { date: last.date },
    include: { investor: true },
  })
  for (const row of ledger) {
    console.log(
      `  ${row.investor.name}: value ${Number(row.closingValue).toFixed(2)}, share ${(Number(row.closingSharePct) * 100).toFixed(2)}%`
    )
  }

  console.log('\nDemo password for all seeded accounts: ' + DEMO_PASSWORD)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
