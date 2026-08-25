import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../../common/access-control.service';
import { SessionUser } from '@osint/types';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    @InjectQueue('file-analysis') private readonly fileAnalysisQueue: Queue,
  ) {}

  async uploadFile(investigationId: string, file: Express.Multer.File, user: SessionUser) {
    const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this investigation');
    }

    const evidence = await this.prisma.evidence.create({
      data: {
        investigationId,
        uploaderId: user.id,
        kind: 'file',
        title: file.originalname,
        storagePath: file.path,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });

    await this.prisma.fileAnalysis.create({
      data: { evidenceId: evidence.id, status: 'QUEUED' },
    });

    const job = await this.fileAnalysisQueue.add('analyze', {
      evidenceId: evidence.id,
      storagePath: file.path,
      declaredMime: file.mimetype,
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: 'evidence.upload',
        targetType: 'Evidence',
        targetId: evidence.id,
        metadata: { jobId: job.id, originalName: file.originalname, sizeBytes: file.size },
      },
    });

    return { evidenceId: evidence.id, jobId: job.id };
  }

  async findOne(id: string, user: SessionUser) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
      include: {
        fileAnalysis: true,
        uploader: { select: { displayName: true } },
      },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence ${id} not found`);
    }

    const allowed = await this.accessControl.canAccessEvidence(user, id);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this evidence');
    }

    return evidence;
  }

  async reanalyze(id: string, user: SessionUser) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id } });
    if (!evidence) {
      throw new NotFoundException(`Evidence ${id} not found`);
    }
    if (!evidence.storagePath) {
      throw new NotFoundException(`Evidence ${id} has no stored file to analyze`);
    }

    const allowed = await this.accessControl.canAccessEvidence(user, id);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this evidence');
    }

    await this.prisma.fileAnalysis.upsert({
      where: { evidenceId: id },
      update: { status: 'QUEUED' },
      create: { evidenceId: id, status: 'QUEUED' },
    });

    const job = await this.fileAnalysisQueue.add('analyze', {
      evidenceId: id,
      storagePath: evidence.storagePath,
      declaredMime: evidence.mimeType,
    });

    return { evidenceId: id, jobId: job.id };
  }
}
