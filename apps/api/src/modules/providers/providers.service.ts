import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EnrichmentRequestDto, SessionUser, QuickEnrichmentDto } from '@osint/types';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectQueue('enrichment') private readonly enrichmentQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async requestEnrichment(dto: EnrichmentRequestDto, user: SessionUser) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${dto.entityId} not found`);
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

  async quickEnrich(dto: QuickEnrichmentDto, user: SessionUser) {
    let value = dto.value.trim();
    
    // Auto-normalize Domain if a full URL is provided
    if (dto.type === 'DOMAIN' && (value.startsWith('http://') || value.startsWith('https://'))) {
      try {
        const url = new URL(value);
        value = url.hostname;
      } catch (e) {
        // Fallback to manual split if URL parsing fails
        value = value.replace('https://', '').replace('http://', '').split('/')[0];
      }
    }

    const normalized = value.toLowerCase();
    
    // Explicitly handle investigationId to ensure it's not ignored if it exists but is undefined in Prisma's view
    const investigationId = dto.investigationId || null;

    const entity = await this.prisma.entity.upsert({
      where: { kind_normalized: { kind: dto.type as any, normalized } },
      update: {
        investigationId: investigationId,
      },
      create: {
        kind: dto.type as any,
        value: value,
        normalized,
        createdById: user.id,
        investigationId: investigationId,
      },
    });

    const job = await this.enrichmentQueue.add('enrich-entity', {
      entityId: entity.id,
      entityKind: entity.kind,
      value: entity.value,
      requestedProviders: dto.providers,
      requestedBy: user.id,
      investigationId: dto.investigationId,
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: 'enrichment.quick',
        targetType: 'Entity',
        targetId: entity.id,
        metadata: { jobId: job.id, investigationId: dto.investigationId },
      },
    });

    return { jobId: job.id, status: 'Queued' };
  }

  async getJobStatus(jobId: string) {
    const job = await this.enrichmentQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    const { entityId } = job.data;
    const [findings, results] = await Promise.all([
      this.prisma.finding.findMany({ 
        where: { entityId },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.providerResult.findMany({ 
        where: { entityId },
        orderBy: { fetchedAt: 'desc' }
      }),
    ]);

    // Keep only the latest result per provider to avoid duplicates from previous runs
    const latestResultsMap = new Map();
    for (const r of results) {
      if (!latestResultsMap.has(r.provider)) {
        latestResultsMap.set(r.provider, r);
      }
    }
    const uniqueResults = Array.from(latestResultsMap.values());

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      failedReason: job.failedReason,
      results: uniqueResults.map(r => ({
        provider: r.provider,
        status: r.status,
        findings: findings.filter(f => f.source === r.provider && f.createdAt >= r.fetchedAt),
      })),
    };
  }
}
