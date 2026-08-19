-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('INITIAL_PAYMENT', 'REGULAR_PAYMENT');

-- AlterTable
ALTER TABLE "PaymentAgreement"
ADD COLUMN "initialPaymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "currentPendingAmount" DOUBLE PRECISION;

-- Backfill pending amount for existing agreements
UPDATE "PaymentAgreement"
SET "currentPendingAmount" = "totalAmount" - "initialPaymentAmount"
WHERE "currentPendingAmount" IS NULL;

-- Make pending amount required after backfill
ALTER TABLE "PaymentAgreement"
ALTER COLUMN "currentPendingAmount" SET NOT NULL;

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" SERIAL NOT NULL,
    "paymentAgreementId" INTEGER NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "remainingAmountAfterPayment" DOUBLE PRECISION NOT NULL,
    "receiptNumber" TEXT,
    "paymentType" "PaymentTransactionType" NOT NULL,
    "description" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" INTEGER NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentTransaction"
ADD CONSTRAINT "PaymentTransaction_paymentAgreementId_fkey"
FOREIGN KEY ("paymentAgreementId") REFERENCES "PaymentAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction"
ADD CONSTRAINT "PaymentTransaction_receivedById_fkey"
FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
