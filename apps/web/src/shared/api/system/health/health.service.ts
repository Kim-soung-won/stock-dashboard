import { API_ROUTES } from '@stock/contracts';
import { BaseService } from '../../base';
import { HealthDtoSchemas } from './health-dto.contracts';
import type { HealthDtoTypes } from './health-dto.types';

export const HealthService = {
  fetchHealth: (): Promise<HealthDtoTypes.Health> =>
    BaseService.get(API_ROUTES.health, HealthDtoSchemas.health),
};
