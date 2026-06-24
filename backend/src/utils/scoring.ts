// Shared scoring logic used by leaderboard and profile routes

export function stageMultiplier(stage: string): number {
  switch (stage) {
    case 'LAST_16':       return 1.5;
    case 'QUARTER_FINALS': return 2;
    case 'SEMI_FINALS':   return 3;
    case 'THIRD_PLACE':   return 2;
    case 'FINAL':         return 4;
    default:              return 1; // GROUP_STAGE
  }
}

export function calcBasePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  const goalError = Math.abs(predHome - actualHome) + Math.abs(predAway - actualAway);
  if (goalError === 0) return 5;
  if (Math.sign(predHome - predAway) !== Math.sign(actualHome - actualAway)) return 0;
  if (goalError === 1) return 4;
  if (goalError === 2) return 3;
  return 2;
}

export function calcPoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  stage: string = 'GROUP_STAGE'
): number {
  const base = calcBasePoints(predHome, predAway, actualHome, actualAway);
  if (base === 0) return 0;
  return Math.round(base * stageMultiplier(stage));
}

export function streakBonus(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 5)  return 2;
  if (streak >= 3)  return 1;
  return 0;
}
