import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@osint/types';
import { ActivityService } from './activity.service';
import { Request } from 'express';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'Audit trail, cursor-paginated. ADMIN sees everything; everyone else sees only their own actions.' })
  findAll(
    @Req() req: Request,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
  ) {
    return this.activityService.findAll(req.user as any, cursor, limit, action, targetType);
  }
}
