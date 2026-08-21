import { orderBookSchema, quoteSchema } from '@stock/contracts';

/**
 * 데이터 계약 계층.
 *
 * 하우스 스타일에서 DTO 는 "서버 응답 snake_case" 지만, 이 프로젝트의 서버는 BFF 이고
 * 키움의 snake_case·부호 문자열·단위 환산을 BFF 가 이미 흡수했다. 그래서 DTO 는
 * camelCase 이며, 스키마 원본은 워크스페이스 공용 패키지(@stock/contracts)에 있다.
 */
export const QuoteDtoSchemas = {
  quote: quoteSchema,
  orderBook: orderBookSchema,
} as const;
