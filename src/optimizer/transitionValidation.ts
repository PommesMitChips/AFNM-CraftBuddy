import { isSupportedCraftingExpression } from './gameTypes';

const techniqueKinds = new Set([
  'completion',
  'perfection',
  'stability',
  'maxStability',
  'pool',
  'createBuff',
  'consumeBuff',
  'cleanseToxicity',
]);
const buffKinds = new Set([
  'completion',
  'perfection',
  'stability',
  'maxStability',
  'pool',
  'createBuff',
  'addStack',
  'negate',
  'changeToxicity',
  'setState',
]);
const triggerKinds = new Set([
  'actionFailed',
  'poolSpent',
  'poolRestored',
  'stabilitySpent',
  'stabilityRestored',
  'completionGained',
  'perfectionGained',
]);
const masteryKinds = new Set([
  'control',
  'intensity',
  'critchance',
  'critmultiplier',
  'poolcost',
  'stabilitycost',
  'successchance',
  'upgrade',
  'effect',
]);
const scalingKeys = new Set([
  'value',
  'stat',
  'scaling',
  'eqn',
  'customScaling',
  'additiveEqn',
  'multiplier',
  'scalingMax',
  'roundToInteger',
  'scalesWithRoomEffectiveness',
  'scalesWithCharisma',
  'charismaScalingPivot',
  'isItem',
  'multiplyByStanceLength',
  'max',
  'divideByStanceLength',
  'upgradeKey',
  'increment',
]);
class UnsupportedPayload extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UnsupportedPayload.prototype);
  }
}
const fail = (message: string): never => {
  throw new UnsupportedPayload(message);
};
function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail(`Unsupported ${label} shape`);
  return value as Record<string, unknown>;
}
function finite(value: unknown, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail(`Unsupported ${label} value`);
}
function list(value: unknown, label: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return fail(`Unsupported ${label} list`);
  return value;
}
function expression(value: unknown): void {
  if (!isSupportedCraftingExpression(value))
    fail('Unsupported crafting expression');
}

/** Conservative schema preflight for certificates, never for legacy EV previews.
 * An unsupported payload makes the entire action unresolved, including effects
 * gated off on this turn. We do not cache mutable live definitions across calls.
 */
export function findUnsupportedCraftingPayload(
  skillValue: unknown,
  activeBuffs: readonly unknown[],
  conditionEffects: unknown,
): string | undefined {
  const doneBuffs = new Set<object>(),
    visiting = new Set<object>();
  function enter(value: object, depth: number): void {
    if (depth > 64 || visiting.has(value))
      fail('Unsupported cyclic or excessively deep crafting payload');
    visiting.add(value);
  }
  function scaling(value: unknown, depth = 0): void {
    if (value === undefined || value === null) return;
    const s = record(value, 'scaling');
    enter(s, depth);
    for (const key of Object.keys(s))
      if (s[key] !== undefined && !scalingKeys.has(key))
        fail(`Unsupported scaling field: ${key}`);
    finite(s.value, 'scaling');
    for (const key of ['stat', 'scaling', 'upgradeKey'])
      if (s[key] != null && typeof s[key] !== 'string')
        fail(`Unsupported scaling ${key}`);
    for (const key of ['eqn', 'additiveEqn'])
      if (s[key] != null) expression(s[key]);
    for (const key of ['charismaScalingPivot', 'increment'])
      if (s[key] != null) finite(s[key], key);
    for (const key of [
      'roundToInteger',
      'scalesWithRoomEffectiveness',
      'scalesWithCharisma',
      'isItem',
      'multiplyByStanceLength',
      'divideByStanceLength',
    ])
      if (s[key] != null && typeof s[key] !== 'boolean')
        fail(`Unsupported scaling ${key}`);
    for (const key of ['multiplier', 'scalingMax', 'max'])
      scaling(s[key], depth + 1);
    if (s.customScaling != null) {
      const custom = record(s.customScaling, 'custom scaling');
      if (
        Object.keys(custom).some(
          (key) => !['scaling', 'multiplier', 'upgradeKey'].includes(key),
        )
      )
        fail('Unsupported custom scaling field');
      finite(custom.multiplier, 'custom scaling multiplier');
      if (typeof custom.scaling !== 'string')
        fail('Unsupported custom scaling variable');
      if (custom.upgradeKey != null && typeof custom.upgradeKey !== 'string')
        fail('Unsupported custom scaling upgrade key');
    }
    visiting.delete(s);
  }
  function condition(value: unknown): void {
    if (value === undefined || value === null) return;
    const c = record(value, 'condition');
    if (c.kind === 'chance') finite(c.percentage, 'chance');
    else if (c.kind === 'condition') expression(c.condition);
    else if (c.kind === 'buff') {
      if (
        c.buff !== 'self' &&
        typeof record(c.buff, 'condition buff').name !== 'string'
      )
        fail('Unsupported condition buff');
      finite(c.count, 'buff condition count');
      if (!['more', 'less', 'equal'].includes(String(c.mode)))
        fail('Unsupported buff condition mode');
    } else if (
      ['pool', 'completion', 'perfection', 'stability', 'toxicity'].includes(
        String(c.kind),
      )
    ) {
      finite(c.percentage, 'condition percentage');
      if (!['more', 'less'].includes(String(c.mode)))
        fail('Unsupported resource condition mode');
    } else fail(`Unsupported condition kind: ${String(c.kind)}`);
  }
  function effect(value: unknown, buffEffect: boolean, depth: number): void {
    const e = record(value, 'effect');
    if (!(buffEffect ? buffKinds : techniqueKinds).has(String(e.kind)))
      fail(
        `Unsupported ${buffEffect ? 'buff' : 'technique'} effect kind: ${String(e.kind)}`,
      );
    condition(e.condition);
    for (const key of ['amount', 'stacks', 'value']) scaling(e[key], depth + 1);
    if (e.kind === 'createBuff') buff(e.buff, depth + 1);
    if (
      e.kind === 'consumeBuff' &&
      typeof record(e.buff, 'consumed buff').name !== 'string'
    )
      fail('Unsupported consumed buff');
    if (e.kind === 'setState') {
      if (typeof e.key !== 'string') fail('Unsupported setState key');
      if (e.mode !== undefined && e.mode !== 'set' && e.mode !== 'add')
        fail('Unsupported setState mode');
      if (list(e.keys, 'setState keys').some((key) => typeof key !== 'string'))
        fail('Unsupported setState keys');
    }
  }
  function buff(value: unknown, depth = 0): void {
    const b = record(value, 'buff definition');
    if (doneBuffs.has(b)) return;
    enter(b, depth);
    if (typeof b.name !== 'string') fail('Unsupported buff name');
    if (b.additionalVariables != null)
      for (const value of Object.values(
        record(b.additionalVariables, 'buff variables'),
      ))
        finite(value, 'buff variable');
    if (b.stats != null)
      for (const s of Object.values(record(b.stats, 'buff stats')))
        scaling(s, depth + 1);
    if (b.initialState != null)
      for (const e of Object.values(record(b.initialState, 'initial state')))
        expression(e);
    for (const key of [
      'effects',
      'onFusion',
      'onRefine',
      'onStabilize',
      'onSupport',
    ])
      for (const e of list(b[key], key)) effect(e, true, depth + 1);
    for (const value of list(b.triggeredEffects, 'triggered effects')) {
      const block = record(value, 'trigger');
      if (!triggerKinds.has(String(block.trigger)))
        fail(`Unsupported crafting trigger: ${String(block.trigger)}`);
      for (const e of list(block.effects, 'trigger effects'))
        effect(e, true, depth + 1);
    }
    visiting.delete(b);
    doneBuffs.add(b);
  }
  try {
    const skill = record(skillValue, 'skill');
    for (const e of list(skill.effects, 'technique effects'))
      effect(e, false, 0);
    if (skill.grantedBuff != null) buff(skill.grantedBuff);
    for (const value of list(skill.masteryEntries, 'masteries')) {
      const m = record(value, 'mastery');
      if (!masteryKinds.has(String(m.kind)))
        fail(`Unsupported mastery kind: ${String(m.kind)}`);
      condition(m.condition);
      for (const key of ['percentage', 'change'])
        if (m[key] != null) finite(m[key], `mastery ${key}`);
      if (m.upgradeKey != null && typeof m.upgradeKey !== 'string')
        fail('Unsupported mastery upgrade key');
      if (m.shouldMultiply != null && typeof m.shouldMultiply !== 'boolean')
        fail('Unsupported mastery multiplier mode');
      if (m.kind === 'effect')
        for (const e of list(m.effects, 'mastery effects')) effect(e, false, 0);
    }
    for (const definition of activeBuffs)
      if (definition !== undefined) buff(definition);
    for (const value of list(conditionEffects, 'condition effects')) {
      const effect = record(value, 'condition effect');
      if (
        !['control', 'intensity', 'pool', 'stability', 'chance'].includes(
          String(effect.kind),
        )
      )
        fail(`Unsupported condition effect: ${String(effect.kind)}`);
      finite(
        effect.kind === 'chance' ? effect.bonus : effect.multiplier,
        'condition modifier',
      );
    }
  } catch (error) {
    if (error instanceof UnsupportedPayload) return error.message;
    throw error;
  }
  return undefined;
}
