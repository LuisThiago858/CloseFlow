import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { Environment } from '../config/environment';

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService<Environment, true>);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: configService.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CloseFlow API')
    .setDescription('Contrato REST inicial da plataforma CloseFlow.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs/openapi.json',
  });
}
