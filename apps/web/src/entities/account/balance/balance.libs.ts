import type { Balance, Position } from '@stock/contracts';

/** 평가금액이 큰 순으로. 보유 비중이 큰 종목이 위로 오는 게 자연스럽다. */
export const sortPositions = (positions: Position[]): Position[] =>
  [...positions].sort((a, b) => (b.evaluationAmount ?? 0) - (a.evaluationAmount ?? 0));

/** 총손익 방향. 색상 결정용(계좌 화면 상단 요약). */
export const totalDirection = (balance: Balance): 'up' | 'down' | 'flat' => {
  const value = balance.totalProfitLoss ?? 0;
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
};

/** 보유 종목 코드만. 실시간 구독 대상으로 그대로 넘긴다. */
export const positionCodes = (balance: Balance): string[] =>
  balance.positions.map((position) => position.code);
