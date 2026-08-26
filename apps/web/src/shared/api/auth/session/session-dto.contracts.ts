import { authSessionSchema, participantSchema } from '@stock/contracts';

export const SessionDtoSchemas = {
  session: authSessionSchema,
  participant: participantSchema,
} as const;
