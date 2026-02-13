-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "analysis" JSONB,
ADD COLUMN "generatedEmail" TEXT,
ADD COLUMN "score" INTEGER;
