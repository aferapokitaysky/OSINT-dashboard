-- CreateEnum
CREATE TYPE "FileAnalysisStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'UNSUPPORTED');

-- CreateTable
CREATE TABLE "FileAnalysis" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "status" "FileAnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "detectedMime" TEXT,
    "sha256" TEXT,
    "sha1" TEXT,
    "md5" TEXT,
    "metadata" JSONB,
    "warnings" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileAnalysis_evidenceId_key" ON "FileAnalysis"("evidenceId");

-- CreateIndex
CREATE INDEX "FileAnalysis_status_idx" ON "FileAnalysis"("status");

-- AddForeignKey
ALTER TABLE "FileAnalysis" ADD CONSTRAINT "FileAnalysis_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
