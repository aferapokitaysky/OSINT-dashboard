import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../../common/access-control.service';
import { AttachEntityDto, CreateInvestigationDto, SessionUser } from '@osint/types';

@Injectable()
export class InvestigationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async create(dto: CreateInvestigationDto, user: SessionUser) {
    return this.prisma.investigation.create({
      data: {
        title: dto.title,
        description: dto.description,
        tags: dto.tags || [],
        ownerId: user.id,
      },
    });
  }

  async findAll(user: SessionUser) {
    return this.prisma.investigation.findMany({
      where: this.accessControl.investigationAccessWhere(user),
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { displayName: true } },
        _count: { select: { entities: true, evidence: true, alerts: true } },
      },
    });
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

    return this.prisma.investigationEntity.upsert({
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
  }

  async listEntities(investigationId: string, user: SessionUser) {
    const allowed = await this.accessControl.canAccessInvestigation(user, investigationId);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this investigation');
    }

    return this.prisma.investigationEntity.findMany({
      where: { investigationId },
      orderBy: { addedAt: 'desc' },
      include: { entity: true },
    });
  }
}
