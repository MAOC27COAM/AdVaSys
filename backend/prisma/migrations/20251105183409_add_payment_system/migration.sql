/*
  Warnings:

  - You are about to drop the column `investment` on the `StudentProfile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentAgreementType" AS ENUM ('MONTHLY_INSTALLMENTS', 'CUSTOM_PARTS', 'SINGLE_PAYMENT');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "investment";

-- DropEnum
DROP TYPE "public"."InvestmentType";

-- CreateTable
CREATE TABLE "PaymentAgreement" (
    "id" SERIAL NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "agreementType" "PaymentAgreementType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cycleEnrollmentId" INTEGER NOT NULL,

    CONSTRAINT "PaymentAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstallment" (
    "id" SERIAL NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentAgreementId" INTEGER NOT NULL,

    CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAgreement_cycleEnrollmentId_key" ON "PaymentAgreement"("cycleEnrollmentId");

-- AddForeignKey
ALTER TABLE "PaymentAgreement" ADD CONSTRAINT "PaymentAgreement_cycleEnrollmentId_fkey" FOREIGN KEY ("cycleEnrollmentId") REFERENCES "CycleEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_paymentAgreementId_fkey" FOREIGN KEY ("paymentAgreementId") REFERENCES "PaymentAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
