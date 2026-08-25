import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, parseLimit, sliceCursorPage } from '../../common/pagination';
import { SessionUser } from '@osint/types';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // ADMIN sees the full audit trail; everyone else sees only what they did
  // themselves. There's no per-investigation scoping yet — ActivityLog's
  // targetType/targetId is heterogeneous (Entity, Investigation, Evidence, ...)
  // and correlating all of those back to "which investigation" would need a
  // join per target type. Left as a known gap rather than half-implemented.
  async findAll(
    user: SessionUser,
    cursor?: string,
    limit?: string,
    action?: string,
    targetType?: string,
  ): Promise<PaginatedResult<unknown>> {
    const take = parseLimit(limit);
    const where: Prisma.ActivityLogWhereInput = {
      ...(user.role === 'ADMIN' ? {} : { actorId: user.id }),
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { actor: { select: { displayName: true, email: true } } },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    const { items, nextCursor } = sliceCursorPage(rows, take);
    return { items, nextCursor, total };
  }
}
