import type { z } from 'zod';
import type { LeaderboardDtoSchemas } from './leaderboard-dto.contracts';

export namespace LeaderboardDtoTypes {
  export type Leaderboard = z.infer<typeof LeaderboardDtoSchemas.leaderboard>;
}
