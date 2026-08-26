import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '@/entities/auth/session';
import { leaderboardQueries, useLeaderboardStream } from '@/entities/competition/leaderboard';
import { SEASON_STATUS_LABEL, formatDday } from '@/entities/competition/season';
import { formatRate, formatSignedWon, formatWon, pathKeys, signDirection } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

const RANK_MEDAL: Readonly<Record<number, string>> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * 리더보드 — 데이터 레이어.
 *
 * 최초 순위는 useSuspenseQuery(REST)로 받고, 이후 갱신은 useLeaderboardStream 이 WS 로
 * 이 캐시에 직접 써 넣어 자동으로 다시 그려진다(폴링 없음). 내 행은 강조한다.
 */
export const TableLeaderboard = () => {
  useLeaderboardStream();
  const { data: leaderboard } = useSuspenseQuery(leaderboardQueries.current());
  const { participant } = useSession();

  const { season, entries } = leaderboard;

  return (
    <div className="leaderboard">
      <div className="leaderboard__season">
        <strong>{season.name}</strong>
        <span className={'badge badge--season-' + season.status}>
          {SEASON_STATUS_LABEL[season.status]}
        </span>
        <span className="leaderboard__dday">{formatDday(season.endAt, season.status)}</span>
        <span className="leaderboard__seed">시드 {formatWon(season.startingCash)}원</span>
      </div>

      <table className="grid">
        <thead>
          <tr>
            <th className="grid__num">순위</th>
            <th>참가자</th>
            <th className="grid__num">평가금액</th>
            <th className="grid__num">손익</th>
            <th className="grid__num">수익률</th>
            <th className="grid__num">보유</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const direction = signDirection(entry.totalProfitLoss);
            const isMe = participant?.id === entry.participantId;
            return (
              <tr key={entry.participantId} className={isMe ? 'grid__row--me' : undefined}>
                <td className="grid__num">
                  {RANK_MEDAL[entry.rank] ?? entry.rank}
                </td>
                <td>
                  <Link className="grid__name" to={pathKeys.profile.view(entry.participantId)}>
                    {entry.nickname}
                  </Link>
                  {isMe ? <span className="badge badge--me">나</span> : null}
                </td>
                <td className="grid__num">{formatWon(entry.totalValue)}</td>
                <td className="grid__num">
                  <ValueText value={formatSignedWon(entry.totalProfitLoss)} direction={direction} />
                </td>
                <td className="grid__num">
                  <ValueText value={formatRate(entry.totalProfitLossRate)} direction={direction} />
                </td>
                <td className="grid__num">{entry.holdingCount}</td>
              </tr>
            );
          })}
          {entries.length === 0 ? (
            <tr>
              <td colSpan={6} className="state">
                아직 참가자가 없습니다. 첫 매매를 해보세요!
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};
