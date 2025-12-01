import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Field, ObjectType } from '@nestjs/graphql';
import { Document } from 'mongoose';

@ObjectType()
@Schema({ timestamps: true })
export class CuratedRecord extends Document {
  @Field()
  _id: string;

  @Field()
  @Prop({ required: true, index: true })
  sourceId: string;

  @Field()
  @Prop({ required: true })
  originalId: string;

  @Field()
  @Prop({ required: true })
  capturedAt: Date;

  @Field()
  @Prop({ required: true })
  rawDataUri: string;

  @Field(() => String)
  @Prop({ type: Object, required: true })
  normalizedFields: {
    title: string;
    content: string;
    author: string;
    metadata: Record<string, any>;
  };

  @Field()
  @Prop({ required: true, unique: true, index: true })
  fingerprint: string;

  @Field()
  @Prop({ required: true, enum: ['unique', 'duplicate'] })
  dedupStatus: string;

  @Field()
  @Prop()
  processedAt: Date;
}

export const CuratedRecordSchema = SchemaFactory.createForClass(CuratedRecord);



