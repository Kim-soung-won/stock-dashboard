import { API_ROUTES } from '@stock/contracts';
import type { LoginRequest } from '@stock/contracts';
import { BaseService } from '../../base';
import { SessionDtoSchemas } from './session-dto.contracts';
import type { SessionDtoTypes } from './session-dto.types';

export const SessionService = {
  /** 닉네임+PIN 으로 참가(신규) 또는 로그인(기존). Bearer 토큰을 돌려받는다. */
  login: (request: LoginRequest): Promise<SessionDtoTypes.Session> =>
    BaseService.post(API_ROUTES.auth.login, SessionDtoSchemas.session, request),

  /** 현재 토큰의 참가자. 토큰이 없거나 만료면 401 → ApiError. */
  me: (): Promise<SessionDtoTypes.Participant> =>
    BaseService.get(API_ROUTES.auth.me, SessionDtoSchemas.participant),
};
