import { Inject, Injectable, Logger } from '@nestjs/common';
import { type RestApiId, urlOf } from '@stock/kiwoom-codes';
import { ENV, type Env, kiwoomHosts } from '../config/env';
import { KiwoomApiError } from './kiwoom.errors';
import { KiwoomTokenService } from './kiwoom-token.service';
import { RateLimiter } from './rate-limiter';

export type KiwoomBody = Record<string, string | number | undefined>;

export interface KiwoomResult<T> {
  data: T;
  /** 응답 헤더 cont-yn === 'Y' 면 다음 페이지가 있다. */
  hasNext: boolean;
  nextKey: string | null;
}

interface CallOptions {
  contYn?: string;
  nextKey?: string;
  /** 토큰/유량 재시도를 이미 한 번 했는지 (내부용) */
  retried?: boolean;
}

/** 연속조회 무한루프 방어. */
const MAX_PAGES = 50;

/**
 * 키움 REST 호출 계층.
 *
 * 키움은 342개 TR 전부 `POST` + JSON 이고, URL 은 기능 그룹(`/api/dostk/chart` 등)이며
 * 실제 TR 구분은 `api-id` 헤더가 한다. 그래서 "엔드포인트별 함수"가 아니라
 * **api-id + 바디를 받는 단일 호출 계층**이 스펙과 맞는 모양이다.
 * URL 은 스펙에서 생성한 카탈로그(`urlOf`)에서 가져오므로 손으로 관리하지 않는다.
 */
@Injectable()
export class KiwoomRestClient {
  private readonly logger = new Logger(KiwoomRestClient.name);
  private readonly limiter: RateLimiter;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly tokenService: KiwoomTokenService,
  ) {
    this.limiter = new RateLimiter(env.KIWOOM_RPS);
  }

  async call<T = Record<string, unknown>>(
    apiId: RestApiId,
    body: KiwoomBody = {},
    options: CallOptions = {},
  ): Promise<KiwoomResult<T>> {
    await this.limiter.acquire();

    const { rest } = kiwoomHosts(this.env);
    const token = await this.tokenService.getToken();
    const response = await fetch(`${rest}${urlOf(apiId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        authorization: `Bearer ${token}`,
        'api-id': apiId,
        'cont-yn': options.contYn ?? 'N',
        'next-key': options.nextKey ?? '',
      },
      body: JSON.stringify(this.normalizeBody(body)),
    });

    const payload = (await response.json()) as Record<string, unknown> & {
      return_code?: number;
      return_msg?: string;
    };

    // HTTP 200 이어도 return_code 로 성패를 판정해야 한다.
    const returnCode = payload.return_code;
    if (!response.ok || (typeof returnCode === 'number' && returnCode !== 0)) {
      const error = new KiwoomApiError(
        apiId,
        String(returnCode ?? response.status),
        String(payload.return_msg ?? response.statusText),
      );

      if (error.isIpMismatch) {
        this.logger.error(
          '토큰 발급 IP 와 요청 IP 가 다릅니다(8010). egress IP 가 고정된 환경에서 실행해야 합니다.',
        );
        throw error;
      }
      if (!options.retried && error.isAuthFailure) {
        this.tokenService.invalidate();
        return this.call<T>(apiId, body, { ...options, retried: true });
      }
      if (!options.retried && error.isThrottled) {
        this.limiter.penalize();
        this.logger.warn(`유량 초과(${error.returnCode}) — 1초 후 1회 재시도: ${apiId}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.call<T>(apiId, body, { ...options, retried: true });
      }
      throw error;
    }

    return {
      data: payload as T,
      hasNext: response.headers.get('cont-yn') === 'Y',
      nextKey: response.headers.get('next-key') || null,
    };
  }

  /**
   * 연속조회를 끝까지 따라가며 각 페이지에서 리스트를 뽑아 합친다.
   * 응답 헤더 `cont-yn`/`next-key` 를 다음 요청 **헤더**에 실어야 한다(바디가 아니다).
   */
  async callAll<T, Item>(
    apiId: RestApiId,
    body: KiwoomBody,
    extract: (page: T) => Item[] | undefined,
    maxPages = MAX_PAGES,
  ): Promise<Item[]> {
    const items: Item[] = [];
    let contYn = 'N';
    let nextKey = '';

    for (let page = 0; page < maxPages; page += 1) {
      const result = await this.call<T>(apiId, body, { contYn, nextKey });
      items.push(...(extract(result.data) ?? []));
      if (!result.hasNext || !result.nextKey) return items;
      contYn = 'Y';
      nextKey = result.nextKey;
    }

    this.logger.warn(`연속조회 상한(${maxPages}페이지) 도달 — 이후 데이터는 잘렸습니다: ${apiId}`);
    return items;
  }

  /** 키움은 값 없음을 빈 문자열로 받는다. undefined 를 그대로 보내면 필수값 오류(1511). */
  private normalizeBody(body: KiwoomBody): Record<string, string> {
    return Object.fromEntries(
      Object.entries(body).map(([key, value]) => [key, value === undefined ? '' : String(value)]),
    );
  }
}
