import type { z } from 'zod';
import type { SeasonDtoSchemas } from './season-dto.contracts';

export namespace SeasonDtoTypes {
  export type Season = z.infer<typeof SeasonDtoSchemas.season>;
}
