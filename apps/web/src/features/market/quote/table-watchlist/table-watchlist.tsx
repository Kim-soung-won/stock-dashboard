import { useQueries } from '@tanstack/react-query';
import { mergeTick, quoteQueries, useTickStream } from '@/entities/market/quote';
import { formatCompact, formatRate, formatSignedWon, formatWon } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

interface TableWatchlistProps {
  codes: string[];
  onSelect?: (code: string) => void;
}

/**
 * 관심종목 실시간 시세 표.
 *
 * REST 스냅샷으로 첫 화면을 그리고, 그 위에 실시간 체결(0B)을 얹는다. 폴링은 쓰지
 * 않는다 — 종목 수 x 초당 폴링은 유량 초과(1700)로 가는 가장 빠른 길이다.
 */
export const TableWatchlist = ({ codes, onSelect }: TableWatchlistProps) => {
  const snapshots = useQueries({
    queries: codes.map((code) => quoteQueries.detail(code)),
  });
  const ticks = useTickStream('watchlist', codes);

  const rows = codes.map((code, index) => {
    const snapshot = snapshots[index]?.data;
    if (!snapshot) return { code, quote: null };
    const tick = ticks.get(code);
    return { code, quote: tick ? mergeTick(snapshot, tick) : snapshot };
  });

  const isLoading = snapshots.some((query) => query.isPending);
  const error = snapshots.find((query) => query.isError)?.error;

  if (error) {
    return <p className="state state--error">시세를 불러오지 못했습니다: {error.message}</p>;
  }

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>종목</th>
          <th className="grid__num">현재가</th>
          <th className="grid__num">전일대비</th>
          <th className="grid__num">등락률</th>
          <th className="grid__num">거래량</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ code, quote }) => (
          <tr
            key={code}
            onClick={() => onSelect?.(code)}
            className={onSelect ? 'grid__row--clickable' : undefined}
          >
            <td>
              <span className="grid__name">{quote?.name ?? '-'}</span>
              <span className="grid__code">{code}</span>
            </td>
            <td className="grid__num">
              <ValueText
                value={formatWon(quote?.price ?? null)}
                direction={quote?.direction ?? 'flat'}
              />
            </td>
            <td className="grid__num">
              <ValueText
                value={formatSignedWon(quote?.change ?? null)}
                direction={quote?.direction ?? 'flat'}
              />
            </td>
            <td className="grid__num">
              <ValueText
                value={formatRate(quote?.changeRate ?? null)}
                direction={quote?.direction ?? 'flat'}
              />
            </td>
            <td className="grid__num">{formatCompact(quote?.volume ?? null)}</td>
          </tr>
        ))}
        {isLoading ? (
          <tr>
            <td colSpan={5} className="state">
              시세 스냅샷 로딩 중…
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
};
