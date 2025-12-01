import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'reporting-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  readiness() {
    return {
      status: 'ready',
      service: 'reporting-api',
    };
  }

  @Get('liveness')
  liveness() {
    return {
      status: 'alive',
      service: 'reporting-api',
    };
  }
}



