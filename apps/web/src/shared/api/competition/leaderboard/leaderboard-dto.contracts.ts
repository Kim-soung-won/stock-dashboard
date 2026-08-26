import { leaderboardHistorySchema, leaderboardSchema } from '@stock/contracts';

export const LeaderboardDtoSchemas = {
  leaderboard: leaderboardSchema,
  history: leaderboardHistorySchema,
} as const;
