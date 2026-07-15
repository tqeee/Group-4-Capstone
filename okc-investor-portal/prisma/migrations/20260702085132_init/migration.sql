-- CreateEnum
CREATE TYPE "Role" AS ENUM ('INVESTOR', 'OPERATIONS', 'ADMIN');

-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "investors" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'INVESTOR',
    "onboardingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funds" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'SGD',
    "riskLevel" TEXT NOT NULL DEFAULT 'High',
    "strategy" TEXT,
    "inceptionDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_flows" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "type" "FlowType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SGD',
    "status" "FlowStatus" NOT NULL DEFAULT 'PENDING',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedDate" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "note" TEXT,

    CONSTRAINT "fund_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "ticket" BIGINT NOT NULL,
    "fundId" TEXT NOT NULL,
    "order" BIGINT,
    "time" TIMESTAMP(3) NOT NULL,
    "type" INTEGER NOT NULL,
    "entry" INTEGER NOT NULL,
    "positionId" BIGINT,
    "volume" DECIMAL(18,2) NOT NULL,
    "price" DECIMAL(18,5) NOT NULL,
    "commission" DECIMAL(18,2) NOT NULL,
    "swap" DECIMAL(18,2) NOT NULL,
    "profit" DECIMAL(18,2) NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL,
    "symbol" TEXT NOT NULL,
    "comment" TEXT,
    "batchId" TEXT,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("ticket")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'deals',
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Validated',

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_daily_nav" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL,
    "pnl" DECIMAL(18,2) NOT NULL,
    "netFlows" DECIMAL(18,2) NOT NULL,
    "closingBalance" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "fund_daily_nav_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_daily_ledger" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openingSharePct" DECIMAL(12,8) NOT NULL,
    "openingValue" DECIMAL(18,2) NOT NULL,
    "pnlShare" DECIMAL(18,2) NOT NULL,
    "flows" DECIMAL(18,2) NOT NULL,
    "closingValue" DECIMAL(18,2) NOT NULL,
    "closingSharePct" DECIMAL(12,8) NOT NULL,

    CONSTRAINT "investor_daily_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "portal_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "investors_authUserId_key" ON "investors"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "investors_email_key" ON "investors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "funds_code_key" ON "funds"("code");

-- CreateIndex
CREATE INDEX "fund_flows_status_idx" ON "fund_flows"("status");

-- CreateIndex
CREATE INDEX "fund_flows_investorId_idx" ON "fund_flows"("investorId");

-- CreateIndex
CREATE INDEX "deals_fundId_time_idx" ON "deals"("fundId", "time");

-- CreateIndex
CREATE UNIQUE INDEX "fund_daily_nav_fundId_date_key" ON "fund_daily_nav"("fundId", "date");

-- CreateIndex
CREATE INDEX "investor_daily_ledger_fundId_date_idx" ON "investor_daily_ledger"("fundId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "investor_daily_ledger_investorId_fundId_date_key" ON "investor_daily_ledger"("investorId", "fundId", "date");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "fund_flows" ADD CONSTRAINT "fund_flows_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_flows" ADD CONSTRAINT "fund_flows_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_daily_nav" ADD CONSTRAINT "fund_daily_nav_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_daily_ledger" ADD CONSTRAINT "investor_daily_ledger_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_daily_ledger" ADD CONSTRAINT "investor_daily_ledger_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
