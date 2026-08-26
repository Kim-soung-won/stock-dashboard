import type { z } from 'zod';
import type { SessionDtoSchemas } from './session-dto.contracts';

export namespace SessionDtoTypes {
  export type Session = z.infer<typeof SessionDtoSchemas.session>;
  export type Participant = z.infer<typeof SessionDtoSchemas.participant>;
}
