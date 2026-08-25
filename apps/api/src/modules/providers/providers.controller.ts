import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { ProviderRegistry } from './provider.registry';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@osint/types';

@ApiTags('Enrichment jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('enrichments')
export class EnrichmentsController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get(':jobId')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Get enrichment job status/progress' })
  getJobStatus(@Param('jobId') jobId: string) {
    return this.providersService.getJobStatus(jobId);
  }
}

@ApiTags('Providers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providerRegistry: ProviderRegistry) {}

  @Get()
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'List registered providers, what they support, and their status' })
  list() {
    return this.providerRegistry.getAll().map((provider) => ({
      name: provider.meta.name,
      displayName: provider.meta.displayName,
      description: provider.meta.description,
      supports: provider.meta.supports,
      requiresApiKey: provider.meta.requiresApiKey,
      freeTier: provider.meta.freeTier,
      homepage: provider.meta.homepage,
      enabled: provider.isEnabled(),
    }));
  }
}
