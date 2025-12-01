import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'processing',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  readiness() {
    return {
      status: 'ready',
      service: 'processing',
    };
  }

  @Get('liveness')
  liveness() {
    return {
      status: 'alive',
      service: 'processing',
    };
  }
}



