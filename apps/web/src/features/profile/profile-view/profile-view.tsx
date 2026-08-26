import type { ParticipantProfile } from '@stock/contracts';
import { formatRate, formatSignedWon, formatWon } from '@/shared/lib';
import { Panel, ValueText } from '@/shared/ui';
import { ProfileHoldings } from './components/profile-holdings';
import { ProfileTrades } from './components/profile-trades';

/**
 * 공개 프로필 뷰(읽기 전용) — 헤더(아바타·닉네임·소개) + 요약 지표 + 보유·최근 체결.
 * 관심종목(실시간 시세)은 feature 간 결합을 피하려 페이지에서 조립한다.
 */
export const ProfileView = ({ profile }: { profile: ParticipantProfile }) => {
  const { participant, stats } = profile;
  const plDirection = stats.totalProfitLoss >= 0 ? 'up' : 'down';
  const joined = new Date(participant.createdAt).toLocaleDateString('ko-KR');

  return (
    <div className="profile">
      <div className="profile__head">
        <span className="profile__avatar">{participant.avatarEmoji ?? '👤'}</span>
        <div className="profile__ident">
          <div className="profile__name">{participant.nickname}</div>
          <div className="profile__meta">
            가입 {joined} · {stats.rank !== null ? `${stats.rank}위` : '순위 없음'}
          </div>
          {participant.bio ? <p className="profile__bio">{participant.bio}</p> : null}
        </div>
      </div>

      <div className="summary">
        <div className="summary__item">
          <span>평가금액</span>
          <strong>{formatWon(stats.totalValue)}</strong>
        </div>
        <div className="summary__item">
          <span>총손익</span>
          <strong>
            <ValueText value={formatSignedWon(stats.totalProfitLoss)} direction={plDirection} />
          </strong>
        </div>
        <div className="summary__item">
          <span>총수익률</span>
          <strong>
            <ValueText value={formatRate(stats.totalProfitLossRate)} direction={plDirection} />
          </strong>
        </div>
        <div className="summary__item">
          <span>보유 종목</span>
          <strong>{stats.holdingCount}</strong>
        </div>
      </div>

      <Panel title="보유 종목">
        <ProfileHoldings holdings={profile.holdings} />
      </Panel>

      <Panel title="최근 체결">
        <ProfileTrades trades={profile.recentTrades} />
      </Panel>
    </div>
  );
};
