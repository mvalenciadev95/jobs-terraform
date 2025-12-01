import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { ReportingResolver } from './reporting.resolver';
import { CuratedRecord, CuratedRecordSchema } from './schemas/curated-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CuratedRecord.name, schema: CuratedRecordSchema },
    ]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService, ReportingResolver],
  exports: [ReportingService],
})
export class ReportingModule {}



