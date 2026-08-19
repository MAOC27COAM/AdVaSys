-- Fase 1: Vincular SimulationEvent al ciclo academico.
-- Ejecutar manualmente: npx prisma migrate deploy (o migrate dev) cuando corresponda.

-- 1) Columna nullable
ALTER TABLE "SimulationEvent" ADD COLUMN "cycleId" INTEGER;

-- 2) Backfill desde la instancia mas reciente de cada evento
UPDATE "SimulationEvent" AS e
SET "cycleId" = sub."cycleId"
FROM (
  SELECT DISTINCT ON (si."eventId")
    si."eventId",
    si."cycleId"
  FROM "SimulationInstance" AS si
  WHERE si."cycleId" IS NOT NULL
  ORDER BY si."eventId", si."uploadedAt" DESC
) AS sub
WHERE e."id" = sub."eventId";

-- 3) Fallback legacy: eventos sin instancias -> ciclo con startDate mas reciente
UPDATE "SimulationEvent" AS e
SET "cycleId" = (
  SELECT c."id"
  FROM "Cycle" AS c
  ORDER BY c."startDate" DESC
  LIMIT 1
)
WHERE e."cycleId" IS NULL;

-- 4) NOT NULL + FK
ALTER TABLE "SimulationEvent" ALTER COLUMN "cycleId" SET NOT NULL;

ALTER TABLE "SimulationEvent"
ADD CONSTRAINT "SimulationEvent_cycleId_fkey"
FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5) Unicidad por ciclo (mismo nombre permitido en otro ciclo)
DROP INDEX IF EXISTS "SimulationEvent_name_key";

CREATE UNIQUE INDEX "SimulationEvent_cycleId_name_key"
ON "SimulationEvent"("cycleId", "name");
