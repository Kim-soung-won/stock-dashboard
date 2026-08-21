import type { ApiResponse } from '@stock/contracts';
import { OK_CODE } from '@stock/contracts';

/** 모든 컨트롤러는 이 봉투로 응답한다(프론트 shared/api/base 가 이 형태를 기대한다). */
export const ok = <T>(data: T, message = ''): ApiResponse<T> => ({
  code: OK_CODE,
  message,
  data,
});
