import type { z } from 'zod';
import type { ProfileDtoSchemas } from './profile-dto.contracts';

export namespace ProfileDtoTypes {
  export type Profile = z.infer<typeof ProfileDtoSchemas.profile>;
}
