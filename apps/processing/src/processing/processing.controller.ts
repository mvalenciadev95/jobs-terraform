import { Controller, Post, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProcessingService } from './processing.service';

@ApiTags('processing')
@Controller('processing')
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @Post('reprocess/:s3Key')
  @ApiOperation({ summary: 'Reprocess from raw data', description: 'Reprocess a raw data file from S3' })
  @ApiParam({ name: 's3Key', description: 'S3 key of the raw data file (URL encoded)' })
  @ApiResponse({ status: 200, description: 'Reprocessing triggered successfully' })
  @ApiResponse({ status: 404, description: 'Raw data not found' })
  async reprocess(@Param('s3Key') s3Key: string) {
    await this.processingService.reprocessFromRaw(decodeURIComponent(s3Key));
    return { message: `Reprocessing triggered for: ${s3Key}` };
  }

  @Get('health')
  @ApiTags('health')
  @ApiOperation({ summary: 'Health check', description: 'Check if the service is healthy' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return { status: 'ok' };
  }
}

