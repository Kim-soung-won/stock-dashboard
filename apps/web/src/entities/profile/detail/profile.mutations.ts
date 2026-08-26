import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateProfileRequest } from '@stock/contracts';
import { ProfileService } from '@/shared/api/profile/detail';
import { profileQueries } from './profile.queries';

/**
 * 내 프로필(bio·아바타) 수정.
 *
 * 서버가 갱신된 프로필을 돌려주므로 그 프로필 캐시를 교체한다. 헤더 아바타 등 세션에
 * 걸린 참가자 정보는 auth 슬라이스가 진실이라 여기서 무효화하지 않는다 — 그 조합은
 * features 계층(폼)에서 auth me 무효화로 처리한다.
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateProfileRequest) => ProfileService.updateMine(request),
    retry: false,
    onSuccess: (profile) =>
      queryClient.setQueryData(
        profileQueries.detail(profile.participant.id).queryKey,
        profile,
      ),
  });
};
