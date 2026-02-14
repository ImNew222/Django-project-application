/**
 * Core Game State Manager for Code Tower Defense.
 * Manages enemies, towers, projectiles, waves, gold, HP, score.
 */
import { createEnemy, resetEnemyCounter, ENEMY_TYPES } from './enemies';
import { createTower, upgradeTower, getTowerStats, resetTowerCounter, TOWER_TYPES } from './towers';
import { getWave, buildSpawnQueue } from './waveConfig';
import { PATH_POINTS, getPathPosition, isOnPath } from './pathData';

export function createGameState() {
  return {
    // Core
    hp: 20,
    maxHp: 20,
    gold: 100,
    score: 0,
    wave: 0,
    totalWaves: 15,

    // State
    phase: 'menu',  // 'menu' | 'prep' | 'wave' | 'gameover' | 'victory'
    speed: 1,       // 1x or 2x

    // Entities
    enemies: [],
    towers: [],
    projectiles: [],

    // Wave spawning
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 1,
    enemiesKilled: 0,
    totalEnemiesKilled: 0,

    // Tutorial
    showTutorial: !localStorage.getItem('td_tutorial_done'),
  };
}

/**
 * Start the next wave.
 */
export function startWave(state) {
  state.wave += 1;
  const waveConfig = getWave(state.wave);
  state.spawnQueue = buildSpawnQueue(waveConfig);
  state.spawnInterval = waveConfig.spawnInterval;
  state.spawnTimer = 0;
  state.enemiesKilled = 0;
  state.phase = 'wave';
  return state;
}

/**
 * Main game tick — called every frame.
 * @param {object} state - game state
 * @param {number} dt - delta time in seconds
 */
export function tick(state, dt) {
  if (state.phase !== 'wave') return state;

  const effectiveDt = dt * state.speed;

  // ── Spawn enemies ────────────────────────────────
  if (state.spawnQueue.length > 0) {
    state.spawnTimer += effectiveDt;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      const typeId = state.spawnQueue.shift();
      const enemy = createEnemy(typeId, 0);
      const pos = getPathPosition(0, 0);
      enemy.x = pos.x;
      enemy.z = pos.z;
      state.enemies.push(enemy);
    }
  }

  // ── Move enemies ─────────────────────────────────
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;

    enemy.pathProgress += enemy.speed * effectiveDt * 0.5;

    if (enemy.pathProgress >= 1) {
      enemy.pathProgress = 0;
      enemy.pathIndex += 1;

      // Reached the end — damage player
      if (enemy.pathIndex >= PATH_POINTS.length - 1) {
        enemy.alive = false;
        state.hp -= enemy.isBoss ? 5 : 1;
        if (state.hp <= 0) {
          state.hp = 0;
          state.phase = 'gameover';
          return state;
        }
        continue;
      }
    }

    const pos = getPathPosition(enemy.pathIndex, enemy.pathProgress);
    enemy.x = pos.x;
    enemy.z = pos.z;
  }

  // ── Towers fire ──────────────────────────────────
  const now = performance.now() / 1000;
  for (const tower of state.towers) {
    if (now - tower.lastFired < tower.fireRate / state.speed) continue;

    // Find closest enemy in range
    let closest = null;
    let closestDist = Infinity;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - tower.x;
      const dz = enemy.z - tower.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= tower.range && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    }

    if (closest) {
      tower.lastFired = now;
      tower.target = closest.id;

      // Create projectile
      state.projectiles.push({
        id: Math.random(),
        fromX: tower.x,
        fromZ: tower.z,
        toX: closest.x,
        toZ: closest.z,
        x: tower.x,
        y: 0.5,
        z: tower.z,
        targetId: closest.id,
        damage: tower.damage,
        label: tower.projectileLabel,
        speed: 6,
        progress: 0,
        towerId: tower.id,
        splashRadius: tower.splashRadius || 0,
        bonusVs: tower.bonusVs,
        bonusMultiplier: tower.bonusMultiplier,
      });
    }
  }

  // ── Move projectiles ─────────────────────────────
  for (const proj of state.projectiles) {
    proj.progress += effectiveDt * proj.speed * 0.3;
    proj.x = proj.fromX + (proj.toX - proj.fromX) * proj.progress;
    proj.z = proj.fromZ + (proj.toZ - proj.fromZ) * proj.progress;

    // Hit
    if (proj.progress >= 1) {
      proj.alive = false;
      const target = state.enemies.find(e => e.id === proj.targetId && e.alive);

      if (proj.splashRadius > 0) {
        // AOE damage
        for (const enemy of state.enemies) {
          if (!enemy.alive) continue;
          const dx = enemy.x - proj.toX;
          const dz = enemy.z - proj.toZ;
          if (Math.sqrt(dx * dx + dz * dz) <= proj.splashRadius) {
            applyDamage(state, enemy, proj);
          }
        }
      } else if (target) {
        applyDamage(state, target, proj);
      }
    }
  }

  // ── Clean up dead ────────────────────────────────
  state.enemies = state.enemies.filter(e => e.alive);
  state.projectiles = state.projectiles.filter(p => p.progress < 1);

  // ── Check wave complete ──────────────────────────
  if (state.spawnQueue.length === 0 && state.enemies.length === 0 && state.phase === 'wave') {
    const waveConfig = getWave(state.wave);
    state.gold += waveConfig.reward;

    if (state.wave >= state.totalWaves) {
      // Keep going endless, or mark victory
      // We allow endless play
    }
    state.phase = 'prep';
  }

  return state;
}

function applyDamage(state, enemy, proj) {
  let dmg = proj.damage;
  // Bonus vs specific types
  if (proj.bonusVs && proj.bonusVs.includes(enemy.typeId)) {
    dmg = Math.round(dmg * (proj.bonusMultiplier || 1));
  }
  enemy.hp -= dmg;

  if (enemy.hp <= 0) {
    enemy.alive = false;
    state.gold += enemy.gold;
    state.score += enemy.points;
    state.enemiesKilled += 1;
    state.totalEnemiesKilled += 1;

    // DDoS special: split into 3 mini enemies
    if (enemy.special === 'split') {
      for (let i = 0; i < 3; i++) {
        const mini = createEnemy('binary', enemy.pathIndex);
        mini.hp = 50;
        mini.maxHp = 50;
        mini.speed = 1.2;
        mini.label = 'req++';
        mini.size = 0.25;
        const pos = getPathPosition(enemy.pathIndex, enemy.pathProgress);
        mini.x = pos.x + (Math.random() - 0.5) * 0.5;
        mini.z = pos.z + (Math.random() - 0.5) * 0.5;
        mini.pathProgress = enemy.pathProgress;
        state.enemies.push(mini);
      }
    }
  }
}

/**
 * Place a tower if valid.
 */
export function placeTower(state, typeId, gridX, gridZ) {
  const type = TOWER_TYPES[typeId];
  if (!type) return { success: false, error: 'Invalid tower' };
  if (state.gold < type.cost) return { success: false, error: 'Not enough gold' };
  if (isOnPath(gridX, gridZ)) return { success: false, error: 'Cannot place on path' };
  if (state.towers.some(t => t.gridX === gridX && t.gridZ === gridZ)) {
    return { success: false, error: 'Tile occupied' };
  }

  // Grid bounds
  if (gridX < 0 || gridX > 9 || gridZ < 0 || gridZ > 6) {
    return { success: false, error: 'Out of bounds' };
  }

  const tower = createTower(typeId, gridX, gridZ);
  // Convert grid to world position
  tower.x = gridX - 4.5 + 0.5;
  tower.z = gridZ - 4.5 + 0.5;
  state.gold -= type.cost;
  state.towers.push(tower);
  return { success: true, tower };
}

/**
 * Upgrade a tower.
 */
export function doUpgradeTower(state, towerId) {
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower || tower.level >= 3) return { success: false, error: 'Max level' };

  const stats = getTowerStats(tower.typeId, tower.level + 1);
  if (state.gold < stats.upgradeCost) return { success: false, error: 'Not enough gold' };

  state.gold -= stats.upgradeCost;
  upgradeTower(tower);
  return { success: true };
}

/**
 * Sell a tower.
 */
export function sellTower(state, towerId) {
  const idx = state.towers.findIndex(t => t.id === towerId);
  if (idx === -1) return;
  const tower = state.towers[idx];
  const stats = getTowerStats(tower.typeId, tower.level);
  state.gold += stats.sellValue;
  state.towers.splice(idx, 1);
}

/**
 * Reset game state for new game.
 */
export function resetGame() {
  resetEnemyCounter();
  resetTowerCounter();
  return createGameState();
}
