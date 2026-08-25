import { BadRequestException, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { EvidenceService } from './evidence.service';
import { EvidenceController, InvestigationEvidenceController } from './evidence.controller';
import { FileAnalysisProcessor } from './file-analysis.processor';
import { ALLOWED_UPLOAD_MIME_TYPES } from './magic-bytes.util';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'file-analysis' }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const storageDir = path.resolve(
          process.cwd(),
          configService.get<string>('EVIDENCE_STORAGE_DIR') || './storage/evidence',
        );
        fs.mkdirSync(storageDir, { recursive: true });

        return {
          storage: diskStorage({
            destination: storageDir,
            // Random filename, never the client-supplied one — avoids path
            // traversal/overwrite; the original name is kept as Evidence.title.
            filename: (_req, file, cb) => {
              cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
            },
          }),
          limits: {
            fileSize: configService.get<number>('EVIDENCE_MAX_UPLOAD_BYTES') || 25 * 1024 * 1024,
          },
          fileFilter: (_req, file, cb) => {
            if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
              cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
              return;
            }
            cb(null, true);
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [InvestigationEvidenceController, EvidenceController],
  providers: [EvidenceService, FileAnalysisProcessor],
  exports: [EvidenceService],
})
export class EvidenceModule {}
