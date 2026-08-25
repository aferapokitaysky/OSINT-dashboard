import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { SessionUser } from '@osint/types';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessInvestigation(user: SessionUser, investigationId: string): Promise<boolean> {
    if (user.role === 'ADMIN') return true;
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId },
      select: { ownerId: true },
    });
    return investigation?.ownerId === user.id;
  }

  // Entity is canonical and has no owner of its own (see
  // coordination/decisions.md D-001) — access is inherited from every
  // investigation it's attached to via InvestigationEntity, falling back to
  // whoever created it for entities not (yet) attached to any investigation.
  async canAccessEntity(user: SessionUser, entityId: string): Promise<boolean> {
    if (user.role === 'ADMIN') return true;
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: {
        createdById: true,
        investigations: { select: { investigation: { select: { ownerId: true } } } },
      },
    });
    if (!entity) return false;
    if (entity.createdById === user.id) return true;
    return entity.investigations.some((link) => link.investigation.ownerId === user.id);
  }

  investigationAccessWhere(user: SessionUser) {
    if (user.role === 'ADMIN') return {};
    return { ownerId: user.id };
  }

  entityAccessWhere(user: SessionUser) {
    if (user.role === 'ADMIN') return {};
    return {
      OR: [
        { createdById: user.id },
        { investigations: { some: { investigation: { ownerId: user.id } } } },
      ],
    };
  }
}
