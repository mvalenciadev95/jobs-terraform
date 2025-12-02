import { Controller, Post, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IngestionService } from './ingestion.service';

@ApiTags('ingestion')
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('trigger')
  @ApiOperation({
    summary: 'Trigger ingestion for all sources',
    description: 'Manually trigger data ingestion from all configured sources',
  })
  @ApiResponse({ status: 200, description: 'Ingestion triggered successfully' })
  async triggerIngestion() {
    await this.ingestionService.ingestAllSources();
    return { message: 'Ingestion triggered successfully' };
  }

  @Post('trigger/:sourceId')
  @ApiOperation({
    summary: 'Trigger ingestion for specific source',
    description: 'Manually trigger data ingestion from a specific source',
  })
  @ApiParam({
    name: 'sourceId',
    description: 'Source ID (jsonplaceholder, reqres, mock)',
  })
  @ApiResponse({ status: 200, description: 'Ingestion triggered for source' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  async triggerSourceIngestion(@Param('sourceId') sourceId: string) {
    await this.ingestionService.ingestSource(sourceId);
    return { message: `Ingestion triggered for source: ${sourceId}` };
  }

  @Get('health')
  @ApiTags('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check if the service is healthy',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return { status: 'ok' };
  }
}
