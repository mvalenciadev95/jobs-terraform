import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CuratedRecord extends Document {
  @Prop({ required: true, index: true })
  sourceId: string;

  @Prop({ required: true })
  originalId: string;

  @Prop({ required: true })
  capturedAt: Date;

  @Prop({ required: true })
  rawDataUri: string;

  @Prop({ type: Object, required: true })
  normalizedFields: {
    title: string;
    content: string;
    author: string;
    metadata: Record<string, any>;
  };

  @Prop({ required: true, unique: true, index: true })
  fingerprint: string;

  @Prop({ required: true, enum: ['unique', 'duplicate'] })
  dedupStatus: string;

  @Prop()
  processedAt: Date;
}

export const CuratedRecordSchema = SchemaFactory.createForClass(CuratedRecord);

CuratedRecordSchema.index({ sourceId: 1, capturedAt: -1 });
CuratedRecordSchema.index({ fingerprint: 1 });



