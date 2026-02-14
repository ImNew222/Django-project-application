/**
 * Enemy type definitions for Code Tower Defense.
 * Each enemy is a "code bug" that walks the path.
 */

export const ENEMY_TYPES = {
  binary: {
    id: 'binary',
    label: '0101',
    description: 'Binary Bug',
    hp: 30,
    speed: 1.0,
    points: 10,
    gold: 8,
    color: '#ffffff',
    size: 0.3,
  },
  loop: {
    id: 'loop',
    label: 'for(;;){}',
    description: 'Infinite Loop',
    hp: 60,
    speed: 0.8,
    points: 20,
    gold: 15,
    color: '#cccccc',
    size: 0.35,
  },
  nullptr: {
    id: 'nullptr',
    label: 'null',
    description: 'Null Pointer',
    hp: 40,
    speed: 1.5,
    points: 25,
    gold: 18,
    color: '#aaaaaa',
    size: 0.28,
  },
  recursion: {
    id: 'recursion',
    label: 'fn(fn())',
    description: 'Stack Overflow',
    hp: 100,
    speed: 0.7,
    points: 40,
    gold: 30,
    color: '#dddddd',
    size: 0.4,
  },
  // ── Boss enemies (Cybersecurity) ─────────────────────
  sql_injection: {
    id: 'sql_injection',
    label: "'; DROP--",
    description: 'SQL Injection',
    hp: 300,
    speed: 0.4,
    points: 100,
    gold: 80,
    color: '#00ff41',
    size: 0.55,
    isBoss: true,
  },
  xss: {
    id: 'xss',
    label: '<script>',
    description: 'XSS Attack',
    hp: 500,
    speed: 0.5,
    points: 150,
    gold: 120,
    color: '#00ff41',
    size: 0.6,
    isBoss: true,
    special: 'speed_aura', // speeds up nearby enemies
  },
  ddos: {
    id: 'ddos',
    label: 'while(1)',
    description: 'DDoS Flood',
    hp: 800,
    speed: 0.35,
    points: 200,
    gold: 150,
    color: '#00ff41',
    size: 0.7,
    isBoss: true,
    special: 'split', // splits into 3 mini enemies on death
  },
};

/**
 * Create a new enemy instance from a type definition.
 */
let enemyIdCounter = 0;
export function createEnemy(typeId, pathIndex = 0) {
  const type = ENEMY_TYPES[typeId];
  if (!type) return null;

  return {
    id: ++enemyIdCounter,
    typeId,
    label: type.label,
    description: type.description,
    hp: type.hp,
    maxHp: type.hp,
    speed: type.speed,
    points: type.points,
    gold: type.gold,
    color: type.color,
    size: type.size,
    isBoss: type.isBoss || false,
    special: type.special || null,
    pathIndex,        // current index on the path
    pathProgress: 0,  // 0-1 between current and next path point
    alive: true,
    x: 0,
    y: 0.3,
    z: 0,
  };
}

export function resetEnemyCounter() {
  enemyIdCounter = 0;
}
