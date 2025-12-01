import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { CuratedRecord } from './schemas/curated-record.schema';

export interface AnalyticsFilters {
  sourceId?: string;
  startDate?: string;
  endDate?: string;
}

export interface FindAllResult {
  records: any[];
  total: number;
  limit: number;
  offset: number;
}

export interface AnalyticsResult {
  total: number;
  bySource: any[];
  byDate: any[];
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectModel(CuratedRecord.name)
    private readonly curatedRecordModel: Model<CuratedRecord>,
  ) {}

  async findAll(
    filters?: AnalyticsFilters,
    limit = 100,
    offset = 0,
  ): Promise<FindAllResult> {
    const query: any = {};

    if (filters?.sourceId) {
      query.sourceId = filters.sourceId;
    }

    if (filters?.startDate || filters?.endDate) {
      query.capturedAt = {};
      if (filters.startDate) {
        query.capturedAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.capturedAt.$lte = new Date(filters.endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.curatedRecordModel
        .find(query)
        .sort({ capturedAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      this.curatedRecordModel.countDocuments(query),
    ]);

    return {
      records,
      total,
      limit,
      offset,
    };
  }

  async findOne(id: string): Promise<any> {
    return this.curatedRecordModel.findById(id).lean();
  }

  async getAnalytics(filters?: AnalyticsFilters): Promise<AnalyticsResult> {
    const matchQuery: any = {};

    if (filters?.sourceId) {
      matchQuery.sourceId = filters.sourceId;
    }

    if (filters?.startDate || filters?.endDate) {
      matchQuery.capturedAt = {};
      if (filters.startDate) {
        matchQuery.capturedAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchQuery.capturedAt.$lte = new Date(filters.endDate);
      }
    }

    const pipeline: PipelineStage[] = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$sourceId',
          count: { $sum: 1 },
          unique: {
            $sum: { $cond: [{ $eq: ['$dedupStatus', 'unique'] }, 1, 0] },
          },
          duplicates: {
            $sum: { $cond: [{ $eq: ['$dedupStatus', 'duplicate'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 as const } },
    ];

    const bySource = await this.curatedRecordModel.aggregate(pipeline);

    const byDatePipeline: PipelineStage[] = [
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$capturedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 as const } },
      { $limit: 30 },
    ];

    const byDate = await this.curatedRecordModel.aggregate(byDatePipeline);

    const total = await this.curatedRecordModel.countDocuments(matchQuery);

    return {
      total,
      bySource,
      byDate,
    };
  }
}
