import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  async saveState(investigationId: string, data: any) {
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId },
    });

    if (!investigation) {
      throw new NotFoundException('Investigation not found');
    }

    return this.prisma.graphState.upsert({
      where: { investigationId },
      update: { data },
      create: {
        investigationId,
        data,
      },
    });
  }

  async getState(investigationId: string) {
    const state = await this.prisma.graphState.findUnique({
      where: { investigationId },
    });

    if (state) {
      return state.data;
    }

    // Auto-discover graph from entities and relations
    const entities = await this.prisma.entity.findMany({
      where: { investigationId },
      include: {
        outRelations: {
          include: { to: true }
        }
      }
    });

    const nodes = entities.map(e => ({
      data: { id: e.id, label: e.value, kind: e.kind }
    }));

    const edges: any[] = [];
    const seenEdges = new Set();

    for (const e of entities) {
      for (const rel of e.outRelations) {
        const edgeId = `${rel.fromId}-${rel.toId}-${rel.relation}`;
        if (!seenEdges.has(edgeId)) {
          edges.push({
            data: { 
              id: rel.id, 
              source: rel.fromId, 
              target: rel.toId, 
              relation: rel.relation 
            }
          });
          seenEdges.add(edgeId);

          // Add target entity to nodes if it's not already there (e.g. if it's not part of the investigation yet)
          if (!nodes.some(n => n.data.id === rel.toId)) {
            nodes.push({
              data: { id: rel.to.id, label: rel.to.value, kind: rel.to.kind }
            });
          }
        }
      }
    }

    return { elements: [...nodes, ...edges] };
  }
}
