-- DropForeignKey
ALTER TABLE "public"."ClassSession" DROP CONSTRAINT "ClassSession_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CourseModality" DROP CONSTRAINT "CourseModality_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."File" DROP CONSTRAINT "File_courseId_fkey";

-- AddForeignKey
ALTER TABLE "CourseModality" ADD CONSTRAINT "CourseModality_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
