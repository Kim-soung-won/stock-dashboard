import { describe, expect, it } from 'vitest';
import { toTradeRequest, validateTradeForm } from './portfolio.libs';

/**
 * 매매 폼의 클라이언트 단계 검증 계약(서버도 같은 규칙을 다시 본다).
 * 코드는 6자리 미만이면 막고, 수량은 1주 이상이어야 한다.
 */
describe('validateTradeForm', () => {
  it('코드가 6자리 미만이면 막는다', () => {
    expect(validateTradeForm({ code: '005', side: 'buy', quantity: 1 })).toBe(
      '종목코드를 입력하세요',
    );
  });

  it('수량이 0 이하면 막는다', () => {
    expect(validateTradeForm({ code: '005930', side: 'buy', quantity: 0 })).toBe(
      '수량은 1주 이상이어야 합니다',
    );
  });

  it('유효하면 null(통과)', () => {
    expect(validateTradeForm({ code: '005930', side: 'sell', quantity: 3 })).toBeNull();
  });
});

describe('toTradeRequest', () => {
  it('코드 앞뒤 공백을 제거한다', () => {
    expect(toTradeRequest({ code: ' 005930 ', side: 'buy', quantity: 2 })).toEqual({
      code: '005930',
      side: 'buy',
      quantity: 2,
    });
  });
});
