import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@osint/types';
import { EvidenceService } from './evidence.service';
import { Request } from 'express';

@ApiTags('Investigation Evidence')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('investigations')
export class InvestigationEvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post(':id/evidence/files')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file as evidence; queues hash + metadata analysis' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') investigationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded (expected multipart field "file")');
    }
    return this.evidenceService.uploadFile(investigationId, file, req.user as any);
  }
}

@ApiTags('Evidence')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get(':id')
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'Get evidence: hashes, detected type, extracted metadata, warnings' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.evidenceService.findOne(id, req.user as any);
  }

  @Post(':id/analyze')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Re-run file analysis for this evidence' })
  reanalyze(@Param('id') id: string, @Req() req: Request) {
    return this.evidenceService.reanalyze(id, req.user as any);
  }
}
