/** AFNM 0.7.17: independent, zero-based reduction and penalty channels. */
export function combineCostStat(
  reduction: boolean,
  current: number,
  contribution: number,
): number {
  const value = reduction
    ? 100 - ((100 - Math.min(100, current)) * (100 - Math.min(100, contribution))) / 100
    : ((100 + current) * (100 + contribution)) / 100 - 100;
  return Math.round(value * 1e10) / 1e10;
}

export function costMultiplier(reduction = 0, penalty = 0): number {
  return (Math.max(0, 100 - reduction) * Math.max(0, 100 + penalty)) / 1e4;
}

export function floorCost(value: number): number {
  return Math.floor(Math.round(Math.max(0, value) * 1e10) / 1e10);
}
