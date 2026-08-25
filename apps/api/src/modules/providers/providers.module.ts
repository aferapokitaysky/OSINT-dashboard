import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProvidersService } from './providers.service';
import { EnrichmentsController, ProvidersController } from './providers.controller';
import { EnrichmentProcessor } from './enrichment.processor';
import { ProviderRegistry } from './provider.registry';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'enrichment',
    }),
  ],
  controllers: [EnrichmentsController, ProvidersController],
  providers: [ProvidersService, EnrichmentProcessor, ProviderRegistry],
  exports: [ProvidersService, ProviderRegistry],
})
export class ProvidersModule {}
