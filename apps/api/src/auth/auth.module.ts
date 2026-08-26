import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

/**
 * 인증 모듈. PrismaModule 은 전역이 아니므로 여기서 쓰는 PrismaService 는
 * AppModule 이 이미 등록한 PrismaModule 에서 온다(app.module 에서 import).
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
