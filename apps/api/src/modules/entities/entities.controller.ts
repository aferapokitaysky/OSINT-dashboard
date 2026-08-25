import { Controller, Get, Post, Body, Param, UseGuards, Req, Query, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { ProvidersService } from '../providers/providers.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, enrichmentRequestSchema, EnrichmentRequestDto } from '@osint/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Request } from 'express';

@ApiTags('Entities')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('entities')
export class EntitiesController {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly providersService: ProvidersService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'List entities (cross-case registry, or scoped via ?investigationId=), cursor-paginated' })
  findAll(
    @Req() req: Request,
    @Query('investigationId') investigationId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.entitiesService.findAll(req.user as any, investigationId, cursor, limit);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'Get entity dossier: findings, provider results, relations' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.entitiesService.findOne(id, req.user as any);
  }

  @Post(':id/enrichments')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Run enrichment for this entity across matching providers' })
  @UsePipes(new ZodValidationPipe(enrichmentRequestSchema))
  requestEnrichment(
    @Param('id') id: string,
    @Body() dto: EnrichmentRequestDto,
    @Req() req: Request,
  ) {
    return this.providersService.requestEnrichment(id, dto, req.user as any);
  }
}
