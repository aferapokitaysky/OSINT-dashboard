import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRegistry } from './provider.registry';
import { EventsGateway } from '../events/events.gateway';
import {
  EnrichmentOutcome,
  WsEnrichmentCompletedPayload,
  WsEnrichmentProgressPayload,
  WsEnrichmentProviderCompletedPayload,
  WsEnrichmentStartedPayload,
  WsEvent,
} from '@osint/types';

@Processor('enrichment')
@Injectable()
export class EnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(EnrichmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: ProviderRegistry,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing enrichment job ${job.id} for entity ${job.data.entityId}`);
    const { entityId, entityKind, value, requestedProviders } = job.data;
    const jobId = String(job.id);
    const room = `entity:${entityId}`;

    const availableProviders = this.providerRegistry.getProvidersForEntity(entityKind);
    const providersToRun = requestedProviders
      ? availableProviders.filter((p) => requestedProviders.includes(p.meta.name))
      : availableProviders;

    this.eventsGateway.emitToRoom(room, WsEvent.EnrichmentStarted, {
      jobId,
      entityId,
      providers: providersToRun.map((p) => p.meta.name),
    } satisfies WsEnrichmentStartedPayload);

    if (providersToRun.length === 0) {
      this.logger.warn(`No suitable providers found for ${entityKind} / ${value}`);
      this.emitCompleted(room, jobId, entityId, 'failed');
      return { successCount: 0, errorCount: 0 };
    }

    let successCount = 0;
    let errorCount = 0;
    let completed = 0;
    const total = providersToRun.length;

    await Promise.allSettled(
      providersToRun.map(async (provider) => {
        try {
          const resultEnvelope = await provider.run({ entityKind, value });

          const providerResult = await this.prisma.providerResult.create({
            data: {
              entityId,
              provider: provider.meta.name,
              status: resultEnvelope.status,
              durationMs: resultEnvelope.durationMs,
              data: resultEnvelope.data as any,
              error: resultEnvelope.error,
              fetchedAt: new Date(resultEnvelope.fetchedAt),
            },
          });

          let findingCount = 0;
          if (resultEnvelope.riskSignals?.length) {
            for (const signal of resultEnvelope.riskSignals) {
              await this.prisma.finding.create({
                data: {
                  entityId,
                  source: provider.meta.name,
                  type: signal.type,
                  severity: signal.severity as any,
                  score: signal.score,
                  title: `${signal.severity} signal from ${provider.meta.name}`,
                  description: signal.description,
                },
              });
              findingCount++;
            }
          }

          let relationCount = 0;
          if (resultEnvelope.relatedEntities?.length) {
            for (const rel of resultEnvelope.relatedEntities) {
              const relNormalized = rel.value.trim().toLowerCase();

              const toEntity = await this.prisma.entity.upsert({
                where: { kind_normalized: { kind: rel.kind as any, normalized: relNormalized } },
                update: {},
                create: {
                  kind: rel.kind as any,
                  value: rel.value,
                  normalized: relNormalized,
                  createdById: job.data.requestedBy,
                },
              });

              await this.prisma.entityRelation.upsert({
                where: {
                  fromId_toId_relation_source: {
                    fromId: entityId,
                    toId: toEntity.id,
                    relation: rel.relation,
                    source: provider.meta.name,
                  },
                },
                update: { confidence: rel.confidence },
                create: {
                  fromId: entityId,
                  toId: toEntity.id,
                  relation: rel.relation,
                  source: provider.meta.name,
                  confidence: rel.confidence,
                },
              });
              relationCount++;
            }
          }

          successCount++;
          completed++;
          this.eventsGateway.emitToRoom(room, WsEvent.EnrichmentProviderCompleted, {
            jobId,
            entityId,
            provider: provider.meta.name,
            status: resultEnvelope.status,
            resultId: providerResult.id,
            findingCount,
            relationCount,
          } satisfies WsEnrichmentProviderCompletedPayload);
        } catch (error) {
          this.logger.error(`Provider ${provider.meta.name} failed:`, error as Error);
          errorCount++;
          completed++;
          this.eventsGateway.emitToRoom(room, WsEvent.EnrichmentProviderCompleted, {
            jobId,
            entityId,
            provider: provider.meta.name,
            status: 'ERROR',
            resultId: null,
            findingCount: 0,
            relationCount: 0,
          } satisfies WsEnrichmentProviderCompletedPayload);
        } finally {
          this.eventsGateway.emitToRoom(room, WsEvent.EnrichmentProgress, {
            jobId,
            entityId,
            completed,
            total,
          } satisfies WsEnrichmentProgressPayload);
        }
      }),
    );

    await job.updateProgress(100);
    const outcome: EnrichmentOutcome = successCount === 0 ? 'failed' : errorCount > 0 ? 'partial' : 'completed';
    this.emitCompleted(room, jobId, entityId, outcome);
    this.logger.log(`Job ${job.id} done. Success: ${successCount}, Errors: ${errorCount}`);

    return { totalProviders: providersToRun.length, successCount, errorCount };
  }

  private emitCompleted(room: string, jobId: string, entityId: string, status: EnrichmentOutcome) {
    this.eventsGateway.emitToRoom(room, WsEvent.EnrichmentCompleted, {
      jobId,
      entityId,
      status,
      completedAt: new Date().toISOString(),
    } satisfies WsEnrichmentCompletedPayload);
  }
}
