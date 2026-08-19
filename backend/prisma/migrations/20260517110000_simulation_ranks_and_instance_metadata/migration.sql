-- Fase 2: Rankings por modalidad/grupo y metadatos de importacion en instancia.
-- Ejecutar manualmente cuando Fase 1 ya este aplicada.

ALTER TABLE "SimulationResult"
ADD COLUMN "rankByModality" INTEGER,
ADD COLUMN "rankByGroup" INTEGER;

ALTER TABLE "SimulationInstance"
ADD COLUMN "importType" TEXT,
ADD COLUMN "importSummary" JSONB;
