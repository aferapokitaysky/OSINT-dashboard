import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { detectMagicBytes } from './magic-bytes.util';
import { extractExif, extractPdfInfo } from './metadata-extractors';
import {
  FileAnalysisStage,
  FileAnalysisStatus,
  WsEvent,
  WsFileAnalysisCompletedPayload,
  WsFileAnalysisProgressPayload,
} from '@osint/types';

interface FileAnalysisJobData {
  evidenceId: string;
  storagePath: string;
  declaredMime: string | null;
}

@Processor('file-analysis')
@Injectable()
export class FileAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(FileAnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<FileAnalysisJobData>): Promise<void> {
    const { evidenceId, storagePath, declaredMime } = job.data;
    this.logger.log(`Analyzing evidence ${evidenceId}`);

    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      select: { investigationId: true },
    });
    const room = evidence ? `investigation:${evidence.investigationId}` : null;

    await this.prisma.fileAnalysis.update({ where: { evidenceId }, data: { status: 'RUNNING' } });
    this.emitProgress(room, evidenceId, 'hashing', 10);

    const warnings: string[] = [];
    let status: FileAnalysisStatus = 'COMPLETED';
    let detectedMime: string | null = null;
    let sha256: string | null = null;
    let sha1: string | null = null;
    let md5: string | null = null;
    let metadata: Record<string, unknown> = {};

    try {
      const buffer = await readFile(storagePath);

      sha256 = createHash('sha256').update(buffer).digest('hex');
      sha1 = createHash('sha1').update(buffer).digest('hex');
      md5 = createHash('md5').update(buffer).digest('hex');

      this.emitProgress(room, evidenceId, 'detecting_type', 40);
      detectedMime = detectMagicBytes(buffer);

      if (declaredMime && detectedMime && declaredMime !== detectedMime) {
        warnings.push(`Declared type "${declaredMime}" does not match detected type "${detectedMime}"`);
      }

      this.emitProgress(room, evidenceId, 'extracting_metadata', 70);

      if (detectedMime === 'image/jpeg') {
        metadata = { ...extractExif(buffer, warnings) };
      } else if (detectedMime === 'image/png') {
        metadata = {}; // PNG carries no EXIF container — nothing to extract yet.
      } else if (detectedMime === 'application/pdf') {
        metadata = { ...(await extractPdfInfo(buffer, warnings)) };
      } else {
        status = 'UNSUPPORTED';
        warnings.push(
          detectedMime
            ? `Metadata extraction not implemented for ${detectedMime}`
            : 'Unrecognized file type (magic bytes did not match any supported format)',
        );
      }
    } catch (err) {
      this.logger.error(`File analysis failed for ${evidenceId}`, err as Error);
      status = 'FAILED';
      warnings.push((err as Error).message);
    }

    await this.prisma.fileAnalysis.update({
      where: { evidenceId },
      data: {
        status,
        detectedMime,
        sha256,
        sha1,
        md5,
        metadata: metadata as any,
        warnings: warnings as any,
        analyzedAt: new Date(),
      },
    });

    if (sha256) {
      await this.prisma.evidence.update({
        where: { id: evidenceId },
        data: { sha256, mimeType: detectedMime ?? declaredMime ?? undefined },
      });
    }

    this.emitCompleted(room, evidenceId, status, warnings.length);
    this.logger.log(`Evidence ${evidenceId} analysis: ${status}, ${warnings.length} warning(s)`);
  }

  private emitProgress(room: string | null, evidenceId: string, stage: FileAnalysisStage, progress: number) {
    if (!room) return;
    this.eventsGateway.emitToRoom(room, WsEvent.FileAnalysisProgress, {
      evidenceId,
      stage,
      progress,
    } satisfies WsFileAnalysisProgressPayload);
  }

  private emitCompleted(room: string | null, evidenceId: string, status: FileAnalysisStatus, warningCount: number) {
    if (!room) return;
    this.eventsGateway.emitToRoom(room, WsEvent.FileAnalysisCompleted, {
      evidenceId,
      analysisId: evidenceId,
      status,
      warningCount,
    } satisfies WsFileAnalysisCompletedPayload);
  }
}
