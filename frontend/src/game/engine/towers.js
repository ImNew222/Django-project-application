/**
 * Tower type definitions for Code Tower Defense.
 * Each tower "fires code" at enemies to solve/kill them.
 */

export const TOWER_TYPES = {
  if_else: {
    id: 'if_else',
    name: 'if/else',
    code: 'if(bug){fix()}',
    projectileLabel: 'fix()',
    cost: 50,
    damage: 10,
    range: 3,
    fireRate: 1.0,  // seconds between shots
    color: '#ffffff',
    shape: 'pyramid',
    description: 'Basic conditional. Reliable against all enemies.',
  },
  try_catch: {
    id: 'try_catch',
    name: 'try/catch',
    code: 'try{}catch(e){}',
    projectileLabel: 'catch!',
    cost: 100,
    damage: 20,
    range: 2.5,
    fireRate: 1.2,
    color: '#ffffff',
    shape: 'cube',
    description: 'Error handler. +50% damage vs error types.',
    bonusVs: ['nullptr', 'sql_injection'],
    bonusMultiplier: 1.5,
  },
  function: {
    id: 'function',
    name: 'function()',
    code: 'function solve(){}',
    projectileLabel: 'solve()',
    cost: 150,
    damage: 30,
    range: 3.5,
    fireRate: 1.5,
    color: '#ffffff',
    shape: 'cylinder',
    description: 'Modular solution. High damage, good range.',
  },
  debugger: {
    id: 'debugger',
    name: 'debugger',
    code: 'console.log(bug)',
    projectileLabel: 'debug',
    cost: 200,
    damage: 15,
    range: 4,
    fireRate: 2.0,
    color: '#ffffff',
    shape: 'sphere',
    description: 'AOE splash. Hits all enemies in blast radius.',
    splashRadius: 1.5,
  },
  regex: {
    id: 'regex',
    name: 'regex',
    code: '/^bug$/g.test()',
    projectileLabel: '/regex/',
    cost: 300,
    damage: 50,
    range: 2,
    fireRate: 2.5,
    color: '#ffffff',
    shape: 'star',
    description: 'Pattern matcher. Highest single-target damage.',
  },
};

/**
 * Upgrade multipliers per level.
 * Level 1 = base, Level 2 = 1.5x, Level 3 = 2x
 */
const UPGRADE_MULTIPLIERS = [1, 1.5, 2];
const UPGRADE_COST_MULTIPLIERS = [0, 1, 2]; // cost to upgrade TO this level

export function getTowerStats(typeId, level = 1) {
  const type = TOWER_TYPES[typeId];
  if (!type) return null;
  const mult = UPGRADE_MULTIPLIERS[Math.min(level - 1, 2)];

  return {
    damage: Math.round(type.damage * mult),
    range: type.range + (level - 1) * 0.3,
    fireRate: Math.max(type.fireRate - (level - 1) * 0.15, 0.3),
    upgradeCost: level < 3 ? Math.round(type.cost * UPGRADE_COST_MULTIPLIERS[level]) : null,
    sellValue: Math.round(type.cost * 0.6 * level),
  };
}

/**
 * Create a new tower instance.
 */
let towerIdCounter = 0;
export function createTower(typeId, gridX, gridZ) {
  const type = TOWER_TYPES[typeId];
  if (!type) return null;
  const stats = getTowerStats(typeId, 1);

  return {
    id: ++towerIdCounter,
    typeId,
    name: type.name,
    code: type.code,
    projectileLabel: type.projectileLabel,
    shape: type.shape,
    color: type.color,
    level: 1,
    damage: stats.damage,
    range: stats.range,
    fireRate: stats.fireRate,
    splashRadius: type.splashRadius || 0,
    bonusVs: type.bonusVs || [],
    bonusMultiplier: type.bonusMultiplier || 1,
    gridX,
    gridZ,
    x: gridX,
    y: 0,
    z: gridZ,
    lastFired: 0, // timestamp
    target: null,
  };
}

export function upgradeTower(tower) {
  if (tower.level >= 3) return null;
  const newLevel = tower.level + 1;
  const stats = getTowerStats(tower.typeId, newLevel);

  tower.level = newLevel;
  tower.damage = stats.damage;
  tower.range = stats.range;
  tower.fireRate = stats.fireRate;
  return tower;
}

export function resetTowerCounter() {
  towerIdCounter = 0;
}
