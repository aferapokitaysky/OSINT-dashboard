import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './modules/prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { InvestigationsModule } from './modules/investigations/investigations.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get('REDIS_URL') || 'redis://localhost:6379',
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    EntitiesModule,
    InvestigationsModule,
    ProvidersModule,
    EventsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
