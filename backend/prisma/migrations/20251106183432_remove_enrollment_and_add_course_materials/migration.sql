/*
  Warnings:

  - You are about to drop the column `capacity` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `schedule` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Enrollment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Grade` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Course" DROP CONSTRAINT "Course_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Enrollment" DROP CONSTRAINT "Enrollment_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Enrollment" DROP CONSTRAINT "Enrollment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Grade" DROP CONSTRAINT "Grade_enrollmentId_fkey";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "capacity",
DROP COLUMN "period",
DROP COLUMN "schedule",
DROP COLUMN "status",
DROP COLUMN "teacherId";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "courseId" INTEGER;

-- DropTable
DROP TABLE "public"."Attendance";

-- DropTable
DROP TABLE "public"."Enrollment";

-- DropTable
DROP TABLE "public"."Grade";

-- CreateTable
CREATE TABLE "CourseModality" (
    "courseId" INTEGER NOT NULL,
    "modality" "Modality" NOT NULL,

    CONSTRAINT "CourseModality_pkey" PRIMARY KEY ("courseId","modality")
);

-- AddForeignKey
ALTER TABLE "CourseModality" ADD CONSTRAINT "CourseModality_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
