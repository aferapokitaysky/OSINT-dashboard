import { Controller, Get, Post, Body, Param, UseGuards, Req, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvestigationsService } from './investigations.service';
import { GraphService } from './graph.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Role,
  attachEntitySchema,
  AttachEntityDto,
  createInvestigationSchema,
  CreateInvestigationDto,
} from '@osint/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Request } from 'express';

@ApiTags('Investigations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('investigations')
export class InvestigationsController {
  constructor(
    private readonly investigationsService: InvestigationsService,
    private readonly graphService: GraphService,
  ) {}

  @Get(':id/graph')
  @Roles(Role.ANALYST, Role.ADMIN, Role.VIEWER)
  @ApiOperation({ summary: 'Get investigation graph state' })
  getGraph(@Param('id') id: string) {
    return this.graphService.getState(id);
  }

  @Post(':id/graph')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Save investigation graph state' })
  saveGraph(@Param('id') id: string, @Body() data: any) {
    return this.graphService.saveState(id, data);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Create a new investigation workspace' })
  @UsePipes(new ZodValidationPipe(createInvestigationSchema))
  create(@Body() createInvestigationDto: CreateInvestigationDto, @Req() req: Request) {
    return this.investigationsService.create(createInvestigationDto, req.user as any);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'List investigations' })
  findAll(@Req() req: Request) {
    return this.investigationsService.findAll(req.user as any);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'Get investigation details' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.investigationsService.findOne(id, req.user as any);
  }

  @Post(':id/entities')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Normalize/create and attach an entity to this investigation' })
  @UsePipes(new ZodValidationPipe(attachEntitySchema))
  attachEntity(
    @Param('id') id: string,
    @Body() dto: AttachEntityDto,
    @Req() req: Request,
  ) {
    return this.investigationsService.attachEntity(id, dto, req.user as any);
  }

  @Get(':id/entities')
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  @ApiOperation({ summary: 'List entities attached to this investigation' })
  listEntities(@Param('id') id: string, @Req() req: Request) {
    return this.investigationsService.listEntities(id, req.user as any);
  }
}
