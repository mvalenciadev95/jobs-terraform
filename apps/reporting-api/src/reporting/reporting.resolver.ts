import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { ReportingService } from './reporting.service';
import { CuratedRecord } from './schemas/curated-record.schema';

@Resolver(() => CuratedRecord)
export class ReportingResolver {
  constructor(private readonly reportingService: ReportingService) {}

  @Query(() => [CuratedRecord], { name: 'records' })
  async getRecords(
    @Args('sourceId', { nullable: true }) sourceId?: string,
    @Args('startDate', { nullable: true }) startDate?: string,
    @Args('endDate', { nullable: true }) endDate?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset?: number,
  ) {
    const result = await this.reportingService.findAll(
      { sourceId, startDate, endDate },
      limit,
      offset,
    );
    return result.records;
  }

  @Query(() => CuratedRecord, { name: 'record' })
  async getRecord(@Args('id') id: string) {
    return this.reportingService.findOne(id);
  }

  @Query(() => String, { name: 'analytics' })
  async getAnalytics(
    @Args('sourceId', { nullable: true }) sourceId?: string,
    @Args('startDate', { nullable: true }) startDate?: string,
    @Args('endDate', { nullable: true }) endDate?: string,
  ) {
    const analytics = await this.reportingService.getAnalytics({
      sourceId,
      startDate,
      endDate,
    });
    return JSON.stringify(analytics);
  }
}



