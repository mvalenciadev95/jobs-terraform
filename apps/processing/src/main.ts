import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('TWL Data Pipeline - Processing Service')
    .setDescription('API documentation for Processing Service')
    .setVersion('1.0')
    .addTag('processing', 'Data processing endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Processing service running on port ${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/api`,
  );
}
bootstrap();
