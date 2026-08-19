/*
  Warnings:

  - You are about to drop the column `modalityId` on the `SimulationInstance` table. All the data in the column will be lost.
  - You are about to drop the `SimulationModality` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `eventId` to the `SimulationInstance` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."SimulationInstance" DROP CONSTRAINT "SimulationInstance_modalityId_fkey";

-- AlterTable
ALTER TABLE "SimulationInstance" DROP COLUMN "modalityId",
ADD COLUMN     "eventId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."SimulationModality";

-- CreateTable
CREATE TABLE "AcademicModality" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "thematicSegments" JSONB,
    "maxQuestions" INTEGER,
    "totalQuestions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicModality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationEvent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "thematicSeparation" JSONB,
    "answerKey" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationEventModalities" (
    "eventId" INTEGER NOT NULL,
    "modalityId" INTEGER NOT NULL,

    CONSTRAINT "SimulationEventModalities_pkey" PRIMARY KEY ("eventId","modalityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicModality_name_key" ON "AcademicModality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationEvent_name_key" ON "SimulationEvent"("name");

-- AddForeignKey
ALTER TABLE "SimulationEventModalities" ADD CONSTRAINT "SimulationEventModalities_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SimulationEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationEventModalities" ADD CONSTRAINT "SimulationEventModalities_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "AcademicModality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationInstance" ADD CONSTRAINT "SimulationInstance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SimulationEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
