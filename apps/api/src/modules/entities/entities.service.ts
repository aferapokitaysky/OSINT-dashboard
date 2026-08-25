import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../../common/access-control.service';
import { SessionUser } from '@osint/types';

@Injectable()
export class EntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  // No investigationId filter: the cross-case registry view, scoped to
  // whatever the caller may access. With one: the entities attached to that
  // specific investigation (case-specific notes/tags included).
  async findAll(user: SessionUser, investigationId?: string) {
    if (investigationId) {
      const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
      if (!allowed) {
        throw new ForbiddenException('Access denied to this investigation');
      }

      const links = await this.prisma.investigationEntity.findMany({
        where: { investigationId },
        orderBy: { addedAt: 'desc' },
        include: {
          entity: { include: { createdBy: { select: { displayName: true } } } },
        },
      });
      return links.map(({ entity, ...link }) => ({
        ...entity,
        investigationLink: {
          notes: link.notes,
          tags: link.tags,
          status: link.status,
          addedAt: link.addedAt,
        },
      }));
    }

    return this.prisma.entity.findMany({
      where: this.accessControl.entityAccessWhere(user),
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { displayName: true } },
      },
    });
  }

  async findOne(id: string, user: SessionUser) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        results: {
          orderBy: { fetchedAt: 'desc' },
        },
        findings: true,
        outRelations: {
          include: { to: true },
        },
        inRelations: {
          include: { from: true },
        },
        investigations: {
          include: { investigation: { select: { id: true, title: true, status: true } } },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${id} not found`);
    }

    const allowed = await this.accessControl.canAccessEntity(user, id);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this entity');
    }

    return entity;
  }
}
