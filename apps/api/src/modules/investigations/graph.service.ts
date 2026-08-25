import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../../common/access-control.service';
import { SessionUser } from '@osint/types';

export interface GraphQuery {
  depth?: string;
  minConfidence?: string;
}

const DEFAULT_DEPTH = 1;
const MAX_DEPTH = 3;

@Injectable()
export class GraphService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async saveState(investigationId: string, data: unknown, user: SessionUser) {
    const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this investigation');
    }

    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId },
    });
    if (!investigation) {
      throw new NotFoundException('Investigation not found');
    }

    return this.prisma.graphState.upsert({
      where: { investigationId },
      update: { data: data as any },
      create: {
        investigationId,
        data: data as any,
      },
    });
  }

  async getState(investigationId: string, user: SessionUser) {
    const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this investigation');
    }

    const state = await this.prisma.graphState.findUnique({
      where: { investigationId },
    });

    if (!state) {
      return { nodes: [], zoom: 1, pan: { x: 0, y: 0 } };
    }

    return state.data;
  }

  // Computed traversal from this case's attached entities, following
  // EntityRelation edges up to `depth` hops. Not the persisted layout blob
  // (see save/getState above) — this reflects the actual OSINT graph.
  //
  // Known gaps (coordination/P2_INTELLIGENCE_WORKBENCH.md's full contract):
  // node.riskScore is always 0 (no risk-scoring engine yet), and
  // node.investigationRefs is always [] (cross-investigation reference
  // lookup isn't implemented — see the separate GET /entities/:id/cross-investigations
  // gap). Path-finding (POST /graph/path) and export are not implemented.
  async getGraphData(investigationId: string, user: SessionUser, query: GraphQuery) {
    const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this investigation');
    }

    const depth = clampDepth(query.depth);
    const minConfidence = clampConfidence(query.minConfidence);

    const seedLinks = await this.prisma.investigationEntity.findMany({
      where: { investigationId },
      select: { entityId: true },
    });

    const visited = new Set<string>(seedLinks.map((l) => l.entityId));
    let frontier = [...visited];
    const edgesById = new Map<
      string,
      { id: string; source: string; target: string; relation: string; confidence: number; sourceName: string; observedAt: string }
    >();

    for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
      const relations = await this.prisma.entityRelation.findMany({
        where: {
          confidence: { gte: minConfidence },
          OR: [{ fromId: { in: frontier } }, { toId: { in: frontier } }],
        },
      });

      const nextFrontier: string[] = [];
      for (const rel of relations) {
        edgesById.set(rel.id, {
          id: rel.id,
          source: rel.fromId,
          target: rel.toId,
          relation: rel.relation,
          confidence: rel.confidence,
          sourceName: rel.source,
          observedAt: rel.createdAt.toISOString(),
        });
        for (const candidate of [rel.fromId, rel.toId]) {
          if (!visited.has(candidate)) {
            visited.add(candidate);
            nextFrontier.push(candidate);
          }
        }
      }
      frontier = nextFrontier;
    }

    const entities = await this.prisma.entity.findMany({
      where: { id: { in: [...visited] } },
      select: { id: true, value: true, kind: true },
    });

    return {
      nodes: entities.map((e) => ({
        id: e.id,
        label: e.value,
        kind: e.kind,
        riskScore: 0,
        investigationRefs: [] as Array<{ id: string; title: string; access: 'current' | 'related' }>,
      })),
      edges: [...edgesById.values()].map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        relation: e.relation,
        confidence: e.confidence,
        sourceName: e.sourceName,
        observedAt: e.observedAt,
      })),
    };
  }
}

function clampDepth(raw?: string): number {
  const parsed = raw ? Number(raw) : DEFAULT_DEPTH;
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DEPTH;
  return Math.min(Math.floor(parsed), MAX_DEPTH);
}

function clampConfidence(raw?: string): number {
  const parsed = raw ? Number(raw) : 0;
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 1);
}
