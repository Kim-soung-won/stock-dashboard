import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ENV, type Env } from '../config/env';

/**
 * 실계좌 조회 기능 스위치 가드.
 *
 * `ACCOUNT_ENABLED=false` 면 계좌 엔드포인트(잔고·미체결)를 막는다. 직접 API 를 부르는
 * 경로에 대한 방어선이고(프론트는 health 로 이미 메뉴·페이지를 감춘다), 의도된 비활성화라
 * 503(일시 사용 불가) 로 명확한 사유를 돌려준다. ENV 는 전역 provider 에서 주입된다.
 */
@Injectable()
export class AccountEnabledGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(_context: ExecutionContext): boolean {
    if (!this.env.ACCOUNT_ENABLED) {
      throw new ServiceUnavailableException(
        '실계좌 조회 기능이 비활성화되어 있습니다 (ACCOUNT_ENABLED=false)',
      );
    }
    return true;
  }
}
