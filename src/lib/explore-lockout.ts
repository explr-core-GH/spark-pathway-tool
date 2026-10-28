/** Picture sign-in lockout: every 5th wrong try locks the login. */
export const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const MAX_LOCK_MINUTES = 24 * 60;

/** 15, 30, 60, 120 … minutes for the 1st, 2nd, 3rd, 4th … lock, capped at 24 hours. */
export function lockMinutesFor(failedAttempts: number): number {
  const lockNumber = Math.max(1, Math.floor(failedAttempts / MAX_FAILED_ATTEMPTS));
  return Math.min(MAX_LOCK_MINUTES, LOCK_MINUTES * 2 ** Math.min(lockNumber - 1, 20));
}
