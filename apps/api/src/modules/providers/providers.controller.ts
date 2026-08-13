import { Controller, Post, Body, Req, UseGuards, UsePipes, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, enrichmentRequestSchema, EnrichmentRequestDto, quickEnrichmentSchema, QuickEnrichmentDto } from '@osint/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Request } from 'express';

@ApiTags('Providers (Enrichment)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('enrichment')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Request enrichment for an entity' })
  @UsePipes(new ZodValidationPipe(enrichmentRequestSchema))
  requestEnrichment(@Body() dto: EnrichmentRequestDto, @Req() req: Request) {
    return this.providersService.requestEnrichment(dto, req.user as any);
  }

  @Post('quick')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Quick search: auto-create entity and enrich' })
  @UsePipes(new ZodValidationPipe(quickEnrichmentSchema))
  quickEnrich(@Body() dto: QuickEnrichmentDto, @Req() req: Request) {
    return this.providersService.quickEnrich(dto, req.user as any);
  }

  @Get('job/:id')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Get enrichment job status' })
  getJobStatus(@Param('id') id: string) {
    return this.providersService.getJobStatus(id);
  }
}
