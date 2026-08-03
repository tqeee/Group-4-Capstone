-- New FundFlow lifecycle for the bank-transfer confirmation workflow: ops
-- approving a deposit now emails bank details and waits for the investor's
-- proof of transfer before money is applied to the fund, instead of applying
-- it immediately on approval. See the FlowStatus enum comment in
-- schema.prisma for the full state machine.
--
-- Split into its own migration (data fix for the old APPROVED status follows
-- in 20260803000001) because a newly added enum value cannot be used by a
-- statement in the same transaction that added it.
ALTER TYPE "FlowStatus" ADD VALUE 'AWAITING_PROOF';
ALTER TYPE "FlowStatus" ADD VALUE 'PENDING_RECEIPT';

ALTER TABLE "fund_flows" ADD COLUMN "proofOfTransfer" TEXT;
