import type { z } from 'zod';

/**
 * BFF 호출 공용 인프라 (도메인 아님 — 수정 시 전체에 영향).
 *
 * 키움을 직접 부르지 않는다. appkey/토큰은 BFF 에만 있고, 브라우저는 정규화된
 * 도메인 모델만 받는다.
 */

export class ApiError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly kiwoomCode: string | null = null,
    readonly detail: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const request = async (path: string, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const body: unknown = await response.json().catch(() => null);
  if (body === null) {
    throw new ApiError(response.status, '응답을 해석할 수 없습니다');
  }

  const envelope = body as {
    code?: number;
    message?: string;
    data?: { kiwoomCode?: string | null; detail?: string | null };
  };

  // HTTP 200 이어도 code !== 0 이면 실패다(BFF 가 키움 규약을 그대로 물려받았다).
  if (!response.ok || envelope.code !== 0) {
    throw new ApiError(
      envelope.code ?? response.status,
      envelope.message ?? '요청이 실패했습니다',
      envelope.data?.kiwoomCode ?? null,
      envelope.data?.detail ?? null,
    );
  }
  return body;
};

/** 응답 봉투를 벗기고 data 만 스키마로 검증해 돌려준다. */
export const BaseService = {
  async get<T extends z.ZodTypeAny>(path: string, dataSchema: T): Promise<z.infer<T>> {
    const body = await request(path);
    // 봉투(code/message)는 request 가 이미 검증했다. 여기서는 data 만 스키마로 좁힌다.
    return dataSchema.parse((body as { data: unknown }).data) as z.infer<T>;
  },

  async post<T extends z.ZodTypeAny>(
    path: string,
    dataSchema: T,
    payload: unknown,
  ): Promise<z.infer<T>> {
    const body = await request(path, { method: 'POST', body: JSON.stringify(payload) });
    return dataSchema.parse((body as { data: unknown }).data) as z.infer<T>;
  },
};
