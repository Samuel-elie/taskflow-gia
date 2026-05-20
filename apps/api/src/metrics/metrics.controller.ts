import { Controller, Get, Header } from '@nestjs/common';
import { register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics();

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', register.contentType)
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}