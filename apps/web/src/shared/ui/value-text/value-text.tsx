import type { PriceDirection } from '@stock/contracts';
import { directionClassName } from '@/shared/lib';

interface ValueTextProps {
  value: string;
  direction?: PriceDirection;
  size?: 'sm' | 'md' | 'lg';
}

/** 상승/하락 색을 입힌 숫자 표시. 색 규칙은 shared/lib 의 directionClassName 이 정한다. */
export const ValueText = ({ value, direction = 'flat', size = 'md' }: ValueTextProps) => (
  <span className={'value-text value-text--' + size + ' ' + directionClassName(direction)}>
    {value}
  </span>
);
