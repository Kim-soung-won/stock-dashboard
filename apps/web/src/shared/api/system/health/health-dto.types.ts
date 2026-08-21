import type { z } from 'zod';
import type { HealthDtoSchemas } from './health-dto.contracts';

export namespace HealthDtoTypes {
  export type Health = z.infer<typeof HealthDtoSchemas.health>;
}
