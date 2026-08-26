import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useSession } from '@/entities/auth/session';
import { profileQueries } from '@/entities/profile/detail';
import { TableWatchlist } from '@/features/market/quote';
import { FormEditProfile, ProfileView } from '@/features/profile';
import { ErrorBoundary, Panel } from '@/shared/ui';

/**
 * 유저 프로필 (SNS — 남이 조회 가능).
 *
 * `/profile/:id` 로 아무 참가자나 조회한다. `:id` 가 `me` 면 세션의 내 id 로 본다.
 * 본인일 때만 편집 폼을 노출한다(판정은 세션 id 비교 — 조회 API 는 공개다).
 * 관심종목은 실시간 시세를 붙여야 하므로 feature 결합을 피해 여기서 조립한다.
 */
export const ProfilePage = () => {
  const params = useParams();
  const session = useSession();
  const id = params.id === 'me' ? session.participant?.id : params.id;

  const { data: profile, isLoading, error } = useQuery(profileQueries.detail(id));

  const isMe = !!profile && session.participant?.id === profile.participant.id;
  const codes = profile?.watchlist.map((item) => item.code) ?? [];

  return (
    <div className="page">
      <header className="page__head">
        <h1>{profile ? profile.participant.nickname : '프로필'}</h1>
      </header>

      {!id ? (
        <p className="state">{session.isVerifying ? '불러오는 중…' : '사용자를 찾을 수 없습니다.'}</p>
      ) : isLoading ? (
        <p className="state">프로필을 불러오는 중…</p>
      ) : error ? (
        <p className="state state--error">프로필을 불러오지 못했습니다: {error.message}</p>
      ) : profile ? (
        <>
          <ProfileView profile={profile} />

          {isMe ? (
            <Panel title="프로필 편집">
              <FormEditProfile participant={profile.participant} />
            </Panel>
          ) : null}

          <Panel title="관심종목">
            {codes.length === 0 ? (
              <p className="state">공개된 관심종목이 없습니다.</p>
            ) : (
              <ErrorBoundary context="profile-watchlist" resetKeys={[codes.join(',')]}>
                <TableWatchlist codes={codes} />
              </ErrorBoundary>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
};
