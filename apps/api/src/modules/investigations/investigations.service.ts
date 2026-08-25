import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../../common/access-control.service';
import { PaginatedResult, parseLimit, sliceCursorPage } from '../../common/pagination';
import { AttachEntityDto, CreateInvestigationDto, SessionUser } from '@osint/types';

@Injectable()
export class InvestigationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async create(dto: CreateInvestigationDto, user: SessionUser) {
    const investigation = await this.prisma.investigation.create({
      data: {
        title: dto.title,
        description: dto.description,
        tags: dto.tags || [],
        ownerId: user.id,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: 'investigation.create',
        targetType: 'Investigation',
        targetId: investigation.id,
        metadata: { title: investigation.title },
      },
    });

    return investigation;
  }

  async findAll(
    user: SessionUser,
    cursor?: string,
    limit?: string,
  ): Promise<PaginatedResult<unknown>> {
    const take = parseLimit(limit);
    const where = this.accessControl.investigationAccessWhere(user);

    const [rows, total] = await Promise.all([
      this.prisma.investigation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          owner: { select: { displayName: true } },
          _count: { select: { entities: true, evidence: true, alerts: true } },
        },
      }),
      this.prisma.investigation.count({ where }),
    ]);

    const { items, nextCursor } = sliceCursorPage(rows, take);
    return { items, nextCursor, total };
  }

  async findOne(id: string, user: SessionUser) {
    const investigation = await this.prisma.investigation.findUnique({
      where: { id },
      include: {
        owner: { select: { displayName: true } },
        entities: { include: { entity: true }, orderBy: { addedAt: 'desc' } },
        evidence: true,
        alerts: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!investigation) {
      throw new NotFoundException(`Investigation ${id} not found`);
    }

    const allowed = await this.accessControl.canAccessInvestigation(user, id);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this investigation');
    }

    return investigation;
  }

  // Upserts the canonical Entity by (kind, normalized) — never moves an
  // existing entity, only attaches/links it — then upserts the
  // investigation-specific join row with this case's notes/tags.
  async attachEntity(investigationId: string, dto: AttachEntityDto, user: SessionUser) {
    const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this investigation');
    }

    const normalized = dto.value.trim().toLowerCase();
    const entity = await this.prisma.entity.upsert({
      where: { kind_normalized: { kind: dto.kind as any, normalized } },
      update: {},
      create: {
        kind: dto.kind as any,
        value: dto.value,
        normalized,
        createdById: user.id,
      },
    });

    const link = await this.prisma.investigationEntity.upsert({
      where: { investigationId_entityId: { investigationId, entityId: entity.id } },
      update: { notes: dto.notes, tags: dto.tags ?? [] },
      create: {
        investigationId,
        entityId: entity.id,
        notes: dto.notes,
        tags: dto.tags ?? [],
        addedById: user.id,
      },
      include: { entity: true },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: 'investigation.entity.attach',
        targetType: 'Investigation',
        targetId: investigationId,
        metadata: { entityId: entity.id, kind: entity.kind, value: entity.value },
      },
    });

    return link;
  }

  async listEntities(
    investigationId: string,
    user: SessionUser,
    cursor?: string,
    limit?: string,
  ): Promise<PaginatedResult<unknown>> {
    const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this investigation');
    }

    const take = parseLimit(limit);
    const where = { investigationId };

    const [rows, total] = await Promise.all([
      this.prisma.investigationEntity.findMany({
        where,
        orderBy: { addedAt: 'desc' },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { entity: true },
      }),
      this.prisma.investigationEntity.count({ where }),
    ]);

    const { items, nextCursor } = sliceCursorPage(rows, take);
    return { items, nextCursor, total };
  }
}
