import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompetitionModule } from '../competition/competition.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

/**
 * 프로필(읽기 전용 합성 뷰 + 본인 편집).
 * - CompetitionModule: 포트폴리오·순위 재사용(export 된 서비스).
 * - AuthModule: 편집 라우트 보호(AuthGuard). PrismaService 는 전역.
 */
@Module({
  imports: [AuthModule, CompetitionModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
