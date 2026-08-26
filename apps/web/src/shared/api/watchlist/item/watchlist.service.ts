import { API_ROUTES } from '@stock/contracts';
import type { AddWatchlistRequest } from '@stock/contracts';
import { BaseService } from '../../base';
import { WatchlistDtoSchemas } from './watchlist-dto.contracts';
import type { WatchlistDtoTypes } from './watchlist-dto.types';

/**
 * 관심 종목 API. 추가·삭제도 **갱신된 전체 목록**을 돌려받아, 클라이언트가 재조회 없이
 * 캐시를 교체할 수 있다. 전 라우트 인증 필요(Bearer 토큰은 BaseService 가 싣는다).
 */
export const WatchlistService = {
  fetchList: (): Promise<WatchlistDtoTypes.List> =>
    BaseService.get(API_ROUTES.watchlist.list, WatchlistDtoSchemas.list),

  add: (request: AddWatchlistRequest): Promise<WatchlistDtoTypes.List> =>
    BaseService.post(API_ROUTES.watchlist.add, WatchlistDtoSchemas.list, request),

  remove: (code: string): Promise<WatchlistDtoTypes.List> =>
    BaseService.del(API_ROUTES.watchlist.remove(code), WatchlistDtoSchemas.list),
};
