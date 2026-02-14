/**
 * Wave definitions for Code Tower Defense.
 * 15 waves + endless mode after that.
 * Boss waves every 5th wave.
 */

export const WAVES = [
  // Wave 1-3: Easy — binary bugs
  {
    wave: 1,
    enemies: [{ type: 'binary', count: 5 }],
    spawnInterval: 1.5,
    reward: 20,
  },
  {
    wave: 2,
    enemies: [{ type: 'binary', count: 8 }],
    spawnInterval: 1.3,
    reward: 25,
  },
  {
    wave: 3,
    enemies: [
      { type: 'binary', count: 6 },
      { type: 'loop', count: 2 },
    ],
    spawnInterval: 1.2,
    reward: 30,
  },

  // Wave 4-5: Loops + first boss
  {
    wave: 4,
    enemies: [
      { type: 'binary', count: 4 },
      { type: 'loop', count: 5 },
    ],
    spawnInterval: 1.1,
    reward: 40,
  },
  {
    wave: 5,
    enemies: [
      { type: 'loop', count: 6 },
      { type: 'sql_injection', count: 1 },  // BOSS!
    ],
    spawnInterval: 1.0,
    reward: 60,
  },

  // Wave 6-7: Null pointers
  {
    wave: 6,
    enemies: [
      { type: 'binary', count: 3 },
      { type: 'loop', count: 4 },
      { type: 'nullptr', count: 4 },
    ],
    spawnInterval: 1.0,
    reward: 45,
  },
  {
    wave: 7,
    enemies: [
      { type: 'nullptr', count: 8 },
      { type: 'loop', count: 3 },
    ],
    spawnInterval: 0.9,
    reward: 50,
  },

  // Wave 8-10: Recursion + XSS boss
  {
    wave: 8,
    enemies: [
      { type: 'loop', count: 4 },
      { type: 'nullptr', count: 5 },
      { type: 'recursion', count: 2 },
    ],
    spawnInterval: 0.9,
    reward: 55,
  },
  {
    wave: 9,
    enemies: [
      { type: 'recursion', count: 5 },
      { type: 'nullptr', count: 4 },
    ],
    spawnInterval: 0.85,
    reward: 60,
  },
  {
    wave: 10,
    enemies: [
      { type: 'recursion', count: 6 },
      { type: 'loop', count: 4 },
      { type: 'xss', count: 1 },  // BOSS!
    ],
    spawnInterval: 0.8,
    reward: 80,
  },

  // Wave 11-14: Mixed hard
  {
    wave: 11,
    enemies: [
      { type: 'recursion', count: 6 },
      { type: 'nullptr', count: 6 },
      { type: 'loop', count: 4 },
    ],
    spawnInterval: 0.8,
    reward: 65,
  },
  {
    wave: 12,
    enemies: [
      { type: 'recursion', count: 8 },
      { type: 'nullptr', count: 5 },
    ],
    spawnInterval: 0.75,
    reward: 70,
  },
  {
    wave: 13,
    enemies: [
      { type: 'binary', count: 10 },
      { type: 'loop', count: 8 },
      { type: 'recursion', count: 5 },
    ],
    spawnInterval: 0.6,
    reward: 75,
  },
  {
    wave: 14,
    enemies: [
      { type: 'recursion', count: 10 },
      { type: 'nullptr', count: 8 },
    ],
    spawnInterval: 0.55,
    reward: 80,
  },

  // Wave 15: FINAL BOSS — DDoS
  {
    wave: 15,
    enemies: [
      { type: 'recursion', count: 8 },
      { type: 'loop', count: 6 },
      { type: 'nullptr', count: 6 },
      { type: 'ddos', count: 1 },  // FINAL BOSS!
    ],
    spawnInterval: 0.5,
    reward: 150,
  },
];

/**
 * Generate an endless wave for waves > 15.
 */
export function generateEndlessWave(waveNum) {
  const scale = 1 + (waveNum - 15) * 0.3;
  const types = ['binary', 'loop', 'nullptr', 'recursion'];
  const enemies = types.map(type => ({
    type,
    count: Math.floor((3 + waveNum * 0.5) * (Math.random() * 0.5 + 0.75)),
  }));

  // Boss every 5 waves
  if (waveNum % 5 === 0) {
    const bosses = ['sql_injection', 'xss', 'ddos'];
    enemies.push({
      type: bosses[Math.floor(Math.random() * bosses.length)],
      count: 1,
    });
  }

  return {
    wave: waveNum,
    enemies,
    spawnInterval: Math.max(0.3, 0.8 - (waveNum - 15) * 0.03),
    reward: 50 + waveNum * 5,
  };
}

/**
 * Get wave config (defined or endless).
 */
export function getWave(waveNum) {
  if (waveNum <= WAVES.length) {
    return WAVES[waveNum - 1];
  }
  return generateEndlessWave(waveNum);
}

/**
 * Build a flat spawn queue from wave config.
 */
export function buildSpawnQueue(waveConfig) {
  const queue = [];
  for (const group of waveConfig.enemies) {
    for (let i = 0; i < group.count; i++) {
      queue.push(group.type);
    }
  }
  // Shuffle to mix enemy types
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  // But put bosses at the END
  const bosses = queue.filter(t => ['sql_injection', 'xss', 'ddos'].includes(t));
  const normals = queue.filter(t => !['sql_injection', 'xss', 'ddos'].includes(t));
  return [...normals, ...bosses];
}
