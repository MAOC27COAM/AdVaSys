-- Preserve historical rows by introducing nullable cycle references first.
ALTER TABLE "AttendanceSession"
ADD COLUMN "cycleId" INTEGER;

ALTER TABLE "SimulationInstance"
ADD COLUMN "cycleId" INTEGER;

CREATE INDEX "AttendanceSession_cycleId_idx" ON "AttendanceSession"("cycleId");
CREATE INDEX "SimulationInstance_cycleId_idx" ON "SimulationInstance"("cycleId");

ALTER TABLE "AttendanceSession"
ADD CONSTRAINT "AttendanceSession_cycleId_fkey"
FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SimulationInstance"
ADD CONSTRAINT "SimulationInstance_cycleId_fkey"
FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
