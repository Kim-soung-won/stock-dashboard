import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { parseExpiresDt } from '@stock/kiwoom-codes';
import { ENV, type Env, kiwoomHosts } from '../config/env';
import { extractKiwoomSubCode, tokenFailureHint } from './kiwoom.errors';

interface TokenResponse {
  token?: string;
  token_type?: string;
  expires_dt?: string;
  return_code?: number;
  return_msg?: string;
}

/** 만료 직전에 미리 갱신할 여유 시간. */
const REFRESH_MARGIN_MS = 60_000;

/**
 * 접근토큰(au10001) 관리.
 *
 * 토큰은 **발급 요청한 IP 에 묶인다**(에러 8010). 따라서 발급과 호출은 같은 egress IP
 * 를 가진 이 프로세스 안에서만 일어나야 하고, appkey/secretkey 는 프론트로 절대
 * 내려가지 않는다. 이것이 브라우저가 키움을 직접 부를 수 없는 첫 번째 이유다.
 */
@Injectable()
export class KiwoomTokenService implements OnApplicationShutdown {
  private readonly logger = new Logger(KiwoomTokenService.name);
  private token: string | null = null;
  private expiresAt = 0;
  private inFlight: Promise<string> | null = null;

  constructor(@Inject(ENV) private readonly env: Env) {}

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - REFRESH_MARGIN_MS) {
      return this.token;
    }
    // 동시 요청이 몰려도 발급은 한 번만 나간다.
    this.inFlight ??= this.issue().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /** 토큰 계열 에러(8005 등)를 만났을 때 강제 재발급. */
  invalidate(): void {
    this.token = null;
    this.expiresAt = 0;
  }

  private async issue(): Promise<string> {
    const { rest } = kiwoomHosts(this.env);
    const response = await fetch(`${rest}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: this.env.KIWOOM_APP_KEY,
        secretkey: this.env.KIWOOM_SECRET_KEY,
      }),
    });

    const payload = (await response.json()) as TokenResponse;
    if (!response.ok || payload.return_code !== 0 || !payload.token) {
      // 원인 코드는 return_msg 안에 [8030:...] 형태로 들어온다. 조치 문구까지 만들어 올린다.
      const subCode = extractKiwoomSubCode(payload.return_msg);
      const hint = tokenFailureHint(subCode);
      this.logger.error(`접근토큰 발급 실패 (${this.env.KIWOOM_ENV}): ${hint}`);
      throw new HttpException(
        {
          code: payload.return_code ?? response.status,
          message: hint,
          data: {
            kiwoomCode: subCode ?? String(payload.return_code ?? response.status),
            detail: payload.return_msg ?? response.statusText,
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.token = payload.token;
    // expires_dt 는 yyyyMMddHHmmss 문자열이다.
    this.expiresAt = payload.expires_dt
      ? (parseExpiresDt(payload.expires_dt) ?? Date.now() + 30 * 60_000)
      : Date.now() + 30 * 60_000;
    this.logger.log(
      `접근토큰 발급 완료 (${this.env.KIWOOM_ENV}, 만료 ${new Date(this.expiresAt).toISOString()})`,
    );
    return this.token;
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.token) return;
    const { rest } = kiwoomHosts(this.env);
    try {
      await fetch(`${rest}/oauth2/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify({
          appkey: this.env.KIWOOM_APP_KEY,
          secretkey: this.env.KIWOOM_SECRET_KEY,
          token: this.token,
        }),
      });
    } catch (error) {
      this.logger.warn(`토큰 폐기 실패 (무시): ${(error as Error).message}`);
    }
  }
}
