import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcessingModule } from './processing/processing.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/twl_pipeline?authSource=admin';
        return {
          uri: mongoUri,
        };
      },
    }),
    ProcessingModule,
    HealthModule,
  ],
})
export class AppModule {}



