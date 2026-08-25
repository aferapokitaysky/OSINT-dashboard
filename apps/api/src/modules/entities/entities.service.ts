import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../../common/access-control.service';
import { PaginatedResult, parseLimit, sliceCursorPage } from '../../common/pagination';
import { SessionUser } from '@osint/types';

@Injectable()
export class EntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  // No investigationId filter: the cross-case registry view, scoped to
  // whatever the caller may access. With one: the entities attached to that
  // specific investigation (case-specific notes/tags included) — duplicates
  // InvestigationsService.listEntities on purpose, so GET /entities?investigationId=
  // and GET /investigations/:id/entities both work for whichever the client
  // already has a URL for.
  async findAll(
    user: SessionUser,
    investigationId?: string,
    cursor?: string,
    limit?: string,
  ): Promise<PaginatedResult<unknown>> {
    const take = parseLimit(limit);

    if (investigationId) {
      const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
      if (!allowed) {
        throw new ForbiddenException('Access denied to this investigation');
      }

      const where = { investigationId };
      const [rows, total] = await Promise.all([
        this.prisma.investigationEntity.findMany({
          where,
          orderBy: { addedAt: 'desc' },
          take: take + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: {
            entity: { include: { createdBy: { select: { displayName: true } } } },
          },
        }),
        this.prisma.investigationEntity.count({ where }),
      ]);

      const { items: links, nextCursor } = sliceCursorPage(rows, take);
      const items = links.map(({ entity, ...link }) => ({
        ...entity,
        investigationLink: {
          notes: link.notes,
          tags: link.tags,
          status: link.status,
          addedAt: link.addedAt,
        },
      }));
      return { items, nextCursor, total };
    }

    const where = this.accessControl.entityAccessWhere(user);
    const [rows, total] = await Promise.all([
      this.prisma.entity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          createdBy: { select: { displayName: true } },
        },
      }),
      this.prisma.entity.count({ where }),
    ]);

    const { items, nextCursor } = sliceCursorPage(rows, take);
    return { items, nextCursor, total };
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
