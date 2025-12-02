import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ProcessingRecord extends Document {
  @Prop({ required: true, unique: true, index: true })
  messageId: string;

  @Prop({ required: true, enum: ['processing', 'completed', 'failed'] })
  status: string;

  @Prop()
  startedAt: Date;

  @Prop()
  completedAt: Date;

  @Prop()
  failedAt: Date;

  @Prop()
  error: string;

  @Prop({ enum: ['unique', 'duplicate'] })
  dedupStatus: string;

  @Prop()
  curatedRecordId: string;
}

export const ProcessingRecordSchema =
  SchemaFactory.createForClass(ProcessingRecord);

ProcessingRecordSchema.index({ messageId: 1 });
ProcessingRecordSchema.index({ status: 1 });
