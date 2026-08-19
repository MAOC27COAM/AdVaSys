-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('PRE_U', 'BECA_18', 'SECUNDARIA', 'PRIMARIA', 'COAR', 'PRIMERA_OPCION');

-- CreateEnum
CREATE TYPE "Schedule" AS ENUM ('TURNO_MANANA', 'TURNO_TARDE');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('POR_PARTES', 'MENSUALIDAD', 'UNO_SOLO');

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "modality" "Modality" NOT NULL,
    "schedule" "Schedule" NOT NULL,
    "investment" "InvestmentType" NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "employmentStatus" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "academicDegree" TEXT NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
