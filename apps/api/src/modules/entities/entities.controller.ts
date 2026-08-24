import { Controller, Get, Post, Body, Param, UseGuards, Req, Query, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, createEntitySchema, CreateEntityDto } from '@osint/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Request } from 'express';

@ApiTags('Entities')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Create or update an entity' })
  @UsePipes(new ZodValidationPipe(createEntitySchema))
  create(@Body() createEntityDto: CreateEntityDto, @Req() req: Request) {
    return this.entitiesService.create(createEntityDto, req.user as any);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'List entities' })
  findAll(@Req() req: Request, @Query('investigationId') investigationId?: string) {
    return this.entitiesService.findAll(req.user as any, investigationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'Get entity details' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.entitiesService.findOne(id, req.user as any);
  }
}
