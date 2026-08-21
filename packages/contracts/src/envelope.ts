import { z } from 'zod';

/**
 * BFF 공통 응답 봉투.
 *
 * 프론트 하우스 스타일(shared/api/base)의 BaseResponse 관례를 따라 top-level 은
 * `code`/`message`/`data` 만 둔다. **목록 total 같은 부가 정보는 반드시 `data` 안에**
 * 넣는다 — top-level 에 두면 스키마가 strip 한다.
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    /** 0 = 정상. 그 외는 BFF 에러코드(키움 return_code 를 그대로 전달하지 않는다). */
    code: z.number(),
    message: z.string(),
    data: dataSchema,
  });

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export const OK_CODE = 0;

/** 목록 응답의 표준 형태. total 은 data 안에 있어야 한다. */
export const listPayloadSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    /** 키움 연속조회 키. 있으면 다음 페이지가 존재한다. */
    nextKey: z.string().nullable().default(null),
  });

export type ListPayload<T> = {
  items: T[];
  total: number;
  nextKey: string | null;
};

/** BFF 에러 본문 (code !== 0). */
export const errorPayloadSchema = z.object({
  /** 키움 return_code 또는 내부 에러 식별자 */
  kiwoomCode: z.string().nullable().default(null),
  detail: z.string().nullable().default(null),
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;
