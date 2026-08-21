import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { loadEnv } from './config/env';

const bootstrap = async (): Promise<void> => {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  // 검증은 zod(contracts 스키마)로 컨트롤러에서 한다 — class-validator 는 쓰지 않는다.
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(env.PORT);

  const logger = new Logger('Bootstrap');
  logger.log('BFF 기동: http://localhost:' + env.PORT);
  logger.log('키움 환경: ' + env.KIWOOM_ENV + (env.KIWOOM_ENV === 'real' ? ' (실주문 주의)' : ' (모의)'));
};

void bootstrap();
