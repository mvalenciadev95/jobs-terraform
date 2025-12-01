import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reporting')
@Controller('api/reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('records')
  @ApiOperation({ summary: 'Get all records', description: 'Retrieve paginated list of curated records' })
  @ApiQuery({ name: 'sourceId', required: false, description: 'Filter by source ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records per page', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip', type: Number })
  @ApiResponse({ status: 200, description: 'Records retrieved successfully' })
  findAll(
    @Query('sourceId') sourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reportingService.findAll(
      { sourceId, startDate, endDate },
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get record by ID', description: 'Retrieve a single curated record by ID' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiResponse({ status: 200, description: 'Record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  findOne(@Param('id') id: string) {
    return this.reportingService.findOne(id);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get analytics', 
    description: 'Get aggregated analytics data. Requires authentication.' 
  })
  @ApiQuery({ name: 'sourceId', required: false, description: 'Filter by source ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  getAnalytics(
    @Query('sourceId') sourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getAnalytics({ sourceId, startDate, endDate });
  }
}

