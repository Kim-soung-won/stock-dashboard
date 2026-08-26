import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ParticipantProfile } from '@stock/contracts';
import { authQueries } from '@/entities/auth/session';
import { useUpdateProfile } from '@/entities/profile/detail';

const PRESET_EMOJI = ['🚀', '📈', '🐂', '🐻', '💎', '🦄', '🔥', '🧑‍🚀', '🤖', '👑'];

/**
 * 내 프로필 편집(bio·아바타 이모지) — 본인에게만 보인다.
 *
 * 성공 시 프로필 캐시는 뮤테이션이 교체하고, 헤더 아바타가 걸린 auth 세션은 여기서
 * 무효화한다(슬라이스를 넘는 조합이라 features 계층의 몫).
 */
export const FormEditProfile = ({
  participant,
}: {
  participant: ParticipantProfile['participant'];
}) => {
  const [bio, setBio] = useState(participant.bio ?? '');
  const [avatarEmoji, setAvatarEmoji] = useState(participant.avatarEmoji ?? '');
  const queryClient = useQueryClient();
  const update = useUpdateProfile();

  const submit = () => {
    update.mutate(
      { bio: bio.trim() || null, avatarEmoji: avatarEmoji.trim() || null },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: authQueries.all() });
        },
      },
    );
  };

  return (
    <form
      className="form-edit-profile"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="field">
        <span>아바타 이모지</span>
        <input
          value={avatarEmoji}
          onChange={(event) => setAvatarEmoji(event.target.value)}
          placeholder="🚀"
          maxLength={8}
        />
      </label>
      <div className="chip-row">
        {PRESET_EMOJI.map((emoji) => (
          <button key={emoji} type="button" onClick={() => setAvatarEmoji(emoji)}>
            {emoji}
          </button>
        ))}
      </div>

      <label className="field">
        <span>한 줄 소개</span>
        <input
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="예: 우량주 장기투자 지향"
          maxLength={140}
        />
      </label>

      {update.isError ? (
        <p className="state state--error">저장 실패: {update.error.message}</p>
      ) : null}
      {update.isSuccess ? <p className="state state--ok">저장했습니다.</p> : null}

      <button type="submit" disabled={update.isPending}>
        {update.isPending ? '저장 중…' : '프로필 저장'}
      </button>
    </form>
  );
};
