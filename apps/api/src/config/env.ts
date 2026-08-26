import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * 환경변수는 저장소 루트의 단일 `.env` 를 쓴다(`.env.example` 참고).
 * pnpm 스크립트는 cwd 가 apps/api 라서 두 위치를 모두 살펴본다.
 */
for (const candidate of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(candidate)) {
    loadDotenv({ path: candidate });
    break;
  }
}

const envSchema = z.object({
  KIWOOM_APP_KEY: z.string().min(1, 'KIWOOM_APP_KEY 가 필요합니다'),
  KIWOOM_SECRET_KEY: z.string().min(1, 'KIWOOM_SECRET_KEY 가 필요합니다'),
  /** mock 이 기본값. real 로 바꾸면 실제 주문이 체결된다. */
  KIWOOM_ENV: z.enum(['mock', 'real']).default('mock'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  /**
   * 초당 REST 호출 상한. 스펙에 구체적 수치가 없고 유량 초과 에러코드
   * (1700/1701/1702)만 정의돼 있어, 보수적 기본값으로 두고 실측 후 조정한다.
   */
  KIWOOM_RPS: z.coerce.number().positive().default(4),
  /**
   * 모의투자 경쟁 로그인 토큰(HMAC) 서명 키. 개발 편의로 기본값을 두지만,
   * 이 값이 노출되면 아무나 토큰을 위조할 수 있으니 운영에서는 반드시 교체한다.
   */
  SESSION_SECRET: z.string().min(1).default('dev-insecure-session-secret'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export const loadEnv = (): Env => {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`환경변수 설정 오류\n${detail.join('\n')}\n루트 .env.example 을 복사해 채우세요.`);
  }
  cached = parsed.data;
  return cached;
};

export const ENV = 'ENV_TOKEN';

/** 실전/모의 도메인. 전환은 이 함수 하나로 끝난다. */
export const kiwoomHosts = (env: Env) =>
  env.KIWOOM_ENV === 'real'
    ? { rest: 'https://api.kiwoom.com', ws: 'wss://api.kiwoom.com:10000' }
    : { rest: 'https://mockapi.kiwoom.com', ws: 'wss://mockapi.kiwoom.com:10000' };
