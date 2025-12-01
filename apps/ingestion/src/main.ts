import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('TWL Data Pipeline - Ingestion Service')
    .setDescription('API documentation for Ingestion Service')
    .setVersion('1.0')
    .addTag('ingestion', 'Data ingestion endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Ingestion service running on port ${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/api`,
  );
}
bootstrap();
