import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../../common/access-control.service';
import { EnrichmentRequestDto, SessionUser } from '@osint/types';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectQueue('enrichment') private readonly enrichmentQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async requestEnrichment(entityId: string, dto: EnrichmentRequestDto, user: SessionUser) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${entityId} not found`);
    }

    const allowed = await this.accessControl.canAccessEntity(user, entityId);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this entity');
    }

    const job = await this.enrichmentQueue.add('enrich-entity', {
      entityId: entity.id,
      entityKind: entity.kind,
      value: entity.value,
      requestedProviders: dto.providers,
      requestedBy: user.id,
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: 'enrichment.request',
        targetType: 'Entity',
        targetId: entity.id,
        metadata: { jobId: job.id, requestedProviders: dto.providers },
      },
    });

    return { jobId: job.id, status: 'Queued' };
  }

  async getJobStatus(jobId: string) {
    const job = await this.enrichmentQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      failedReason: job.failedReason,
    };
  }
}
