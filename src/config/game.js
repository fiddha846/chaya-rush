/**
 * CHAYA RUSH — game rules.
 *
 * Decision locked with owner:
 *   Round duration and customer patience are SEPARATE concepts.
 *   60 seconds = the whole round. Each customer also has an independent
 *   patience timer that can expire during that round.
 *
 * No bonus amounts are defined here on purpose. The owner asked us not to
 * invent them. Fill in `streakBonus` after approval.
 */

export const GAME_RULES = {
  /** Whole-round service window, in seconds. Owner-specified. */
  roundDurationSec: 60,

  /**
   * Per-customer patience, in seconds. Owner-specified: 60.
   * Kept separate from roundDurationSec (also 60).
   *
   * Note: because this equals the round length, a customer who arrives after
   * the round starts cannot run out of patience before the round ends. If you
   * want the complaint state to be reachable, set this below 60 (e.g. 30–40).
   */
  customerPatienceSec: 60,

  /**
   * Optional streak bonus. Shape intentionally left open.
   * TODO: exact bonus amounts pending owner approval. Do NOT invent values.
   */
  streakBonus: null,

  /** Earnings start at zero. */
  startingEarnings: 0,
};
