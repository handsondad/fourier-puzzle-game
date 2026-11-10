/** 答对八成五以上 3 颗星，一半以上 2 颗，其余 1 颗。 */
export function starsFor(score: number, total: number): number {
  if (!total) return 0;
  const ratio = score / total;
  if (ratio >= 0.85) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}
