/**
 * Main 3D Game Canvas — high-performance version.
 *
 * PERF: Game loop runs in useFrame (inside Three.js render loop).
 * 3D components read positions from gameRef directly — zero React re-renders.
 * Static elements (grid, ground) are memoized.
 */
import { useRef, useMemo, useState, useCallback, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { tick } from '../engine/gameState';
import { PATH_POINTS, GRID_SIZE, isOnPath } from '../engine/pathData';

const half = GRID_SIZE / 2;

/* ─────────────────────────────────────────────────────────
   GAME LOOP — runs inside Three.js at native frame rate
   ─────────────────────────────────────────────────────── */
function GameLoop({ gameRef, syncUI, particlesRef }) {
    const uiSyncTimer = useRef(0);

    useFrame((_, dt) => {
        const state = gameRef.current;
        if (state.phase !== 'wave') return;

        const clampedDt = Math.min(dt, 0.1);

        // Snapshot enemies before tick to detect deaths
        const enemiesBefore = new Set(state.enemies.filter(e => e.alive).map(e => e.id));

        tick(state, clampedDt);

        // Detect deaths → spawn particles
        if (particlesRef.current) {
            for (const id of enemiesBefore) {
                if (!state.enemies.find(e => e.id === id && e.alive)) {
                    // Find where enemy was (or use last known position)
                    const dead = state.enemies.find(e => e.id === id);
                    if (dead) {
                        particlesRef.current.spawnExplosion(dead.x, 0.3, dead.z);
                        particlesRef.current.spawnDamageNumber(dead.x, 0.6, dead.z, dead.maxHp);
                    }
                }
            }
        }

        // Sync React UI at ~4 Hz (every ~250ms), not every frame
        uiSyncTimer.current += clampedDt;
        if (uiSyncTimer.current > 0.25) {
            uiSyncTimer.current = 0;
            syncUI();
        }
    });

    return null;
}

/* ─────────────────────────────────────────────────────────
   PARTICLE SYSTEM — explosions + floating damage numbers
   ─────────────────────────────────────────────────────── */
const MAX_EXPLOSIONS = 60;
const MAX_DAMAGE_NUMS = 20;

function ParticleSystem({ ref: _ref, particlesRef }) {
    const explosionsRef = useRef([]);
    const damageNumsRef = useRef([]);
    const meshRefs = useRef([]);
    const textRefs = useRef([]);

    // Expose spawn methods
    particlesRef.current = {
        spawnExplosion(x, y, z) {
            for (let i = 0; i < 6; i++) {
                explosionsRef.current.push({
                    x, y, z,
                    vx: (Math.random() - 0.5) * 3,
                    vy: Math.random() * 3 + 1,
                    vz: (Math.random() - 0.5) * 3,
                    life: 0.6,
                    maxLife: 0.6,
                    size: 0.06 + Math.random() * 0.06,
                });
            }
            // Trim old
            if (explosionsRef.current.length > MAX_EXPLOSIONS) {
                explosionsRef.current = explosionsRef.current.slice(-MAX_EXPLOSIONS);
            }
        },
        spawnDamageNumber(x, y, z, amount) {
            damageNumsRef.current.push({
                x, y: y + 0.3, z,
                vy: 1.2,
                life: 0.8,
                maxLife: 0.8,
                text: `+${amount}`,
            });
            if (damageNumsRef.current.length > MAX_DAMAGE_NUMS) {
                damageNumsRef.current = damageNumsRef.current.slice(-MAX_DAMAGE_NUMS);
            }
        },
    };

    useFrame((_, dt) => {
        // Update explosion particles
        for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
            const p = explosionsRef.current[i];
            p.life -= dt;
            if (p.life <= 0) {
                explosionsRef.current.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vy -= 6 * dt; // gravity
        }

        // Update mesh positions
        for (let i = 0; i < meshRefs.current.length; i++) {
            const mesh = meshRefs.current[i];
            if (!mesh) continue;
            const p = explosionsRef.current[i];
            if (p) {
                mesh.visible = true;
                mesh.position.set(p.x, p.y, p.z);
                const scale = (p.life / p.maxLife) * p.size;
                mesh.scale.setScalar(scale * 10);
                mesh.material.opacity = p.life / p.maxLife;
            } else {
                mesh.visible = false;
            }
        }

        // Update damage numbers
        for (let i = damageNumsRef.current.length - 1; i >= 0; i--) {
            const d = damageNumsRef.current[i];
            d.life -= dt;
            if (d.life <= 0) {
                damageNumsRef.current.splice(i, 1);
                continue;
            }
            d.y += d.vy * dt;
        }

        for (let i = 0; i < textRefs.current.length; i++) {
            const textMesh = textRefs.current[i];
            if (!textMesh) continue;
            const d = damageNumsRef.current[i];
            if (d) {
                textMesh.visible = true;
                textMesh.position.set(d.x, d.y, d.z);
                textMesh.fillOpacity = d.life / d.maxLife;
            } else {
                textMesh.visible = false;
            }
        }
    });

    return (
        <group>
            {/* Pre-allocate explosion meshes */}
            {Array.from({ length: MAX_EXPLOSIONS }, (_, i) => (
                <mesh
                    key={`exp-${i}`}
                    ref={el => meshRefs.current[i] = el}
                    visible={false}
                >
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={1} />
                </mesh>
            ))}

            {/* Pre-allocate damage number texts */}
            {Array.from({ length: MAX_DAMAGE_NUMS }, (_, i) => (
                <Text
                    key={`dmg-${i}`}
                    ref={el => textRefs.current[i] = el}
                    visible={false}
                    fontSize={0.15}
                    color="#22c55e"
                    anchorX="center"
                    anchorY="middle"
                    fillOpacity={1}
                >
                    {'+0'}
                </Text>
            ))}
        </group>
    );
}

/* ─────────────────────────────────────────────────────────
   ENEMY 3D — reads position from gameRef, no props update
   ─────────────────────────────────────────────────────── */
function EnemyRenderer({ gameRef }) {
    const meshRefs = useRef([]);
    const hpBgRefs = useRef([]);
    const hpFillRefs = useRef([]);
    const shadowRefs = useRef([]);
    const MAX_ENEMIES = 40;

    useFrame(() => {
        const enemies = gameRef.current.enemies;
        for (let i = 0; i < MAX_ENEMIES; i++) {
            const mesh = meshRefs.current[i];
            const hpBg = hpBgRefs.current[i];
            const hpFill = hpFillRefs.current[i];
            const shadow = shadowRefs.current[i];
            if (!mesh) continue;

            const enemy = enemies[i];
            if (enemy && enemy.alive) {
                mesh.visible = true;
                const bobY = 0.3 + Math.sin(performance.now() * 0.003 + enemy.id) * 0.05;
                mesh.position.set(enemy.x, bobY, enemy.z);
                mesh.rotation.y += 0.01;
                const s = enemy.isBoss ? 0.55 : enemy.size;
                mesh.scale.setScalar(s / 0.3);
                mesh.material.color.set(enemy.isBoss ? '#dc2626' : '#1e293b');

                if (hpBg) {
                    hpBg.visible = true;
                    hpBg.position.set(enemy.x, 0.7, enemy.z);
                }
                if (hpFill) {
                    const pct = enemy.hp / enemy.maxHp;
                    hpFill.visible = true;
                    hpFill.position.set(enemy.x - 0.2 * (1 - pct), 0.7, enemy.z + 0.001);
                    hpFill.scale.set(pct, 1, 1);
                    hpFill.material.color.set(pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444');
                }
                if (shadow) {
                    shadow.visible = true;
                    shadow.position.set(enemy.x, 0.003, enemy.z);
                }
            } else {
                mesh.visible = false;
                if (hpBg) hpBg.visible = false;
                if (hpFill) hpFill.visible = false;
                if (shadow) shadow.visible = false;
            }
        }
    });

    return (
        <group>
            {Array.from({ length: MAX_ENEMIES }, (_, i) => (
                <group key={i}>
                    <mesh
                        ref={el => meshRefs.current[i] = el}
                        visible={false}
                    >
                        <boxGeometry args={[0.3, 0.3, 0.3]} />
                        <meshStandardMaterial color="#1e293b" wireframe />
                    </mesh>
                    <mesh ref={el => hpBgRefs.current[i] = el} visible={false}>
                        <planeGeometry args={[0.4, 0.04]} />
                        <meshBasicMaterial color="#e2e8f0" />
                    </mesh>
                    <mesh ref={el => hpFillRefs.current[i] = el} visible={false}>
                        <planeGeometry args={[0.4, 0.04]} />
                        <meshBasicMaterial color="#22c55e" />
                    </mesh>
                    <mesh
                        ref={el => shadowRefs.current[i] = el}
                        visible={false}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <circleGeometry args={[0.15, 8]} />
                        <meshBasicMaterial color="#000" transparent opacity={0.08} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

/* ─────────────────────────────────────────────────────────
   TOWER 3D — memoized, with attack beam
   ─────────────────────────────────────────────────────── */
const LEVEL_COLORS = ['#334155', '#2563eb', '#7c3aed'];

function TowerRenderer({ gameRef, selectedTowerId, onTowerClick }) {
    const beamRefs = useRef([]);
    const MAX_TOWERS = 20;

    // We need to store tower data for rendering
    const towerMeshRefs = useRef([]);
    const baseMeshRefs = useRef([]);
    const rangeMeshRefs = useRef([]);
    const labelRefs = useRef([]);

    useFrame(() => {
        const towers = gameRef.current.towers;
        const enemies = gameRef.current.enemies;

        for (let i = 0; i < MAX_TOWERS; i++) {
            const towerMesh = towerMeshRefs.current[i];
            const beam = beamRefs.current[i];
            const base = baseMeshRefs.current[i];
            const range = rangeMeshRefs.current[i];
            const label = labelRefs.current[i];
            if (!towerMesh) continue;

            const tower = towers[i];
            if (tower) {
                towerMesh.visible = true;
                towerMesh.position.set(tower.x, 0.3, tower.z);
                const color = LEVEL_COLORS[Math.min(tower.level - 1, 2)];
                towerMesh.material.color.set(color);

                if (base) {
                    base.visible = true;
                    base.position.set(tower.x, 0.01, tower.z);
                    base.material.color.set(color);
                }

                if (label) {
                    label.visible = true;
                    label.position.set(tower.x, 0.8, tower.z);
                    label.color = color;
                    // Update text content by setting the text property
                }

                // Range circle
                if (range) {
                    range.visible = selectedTowerId === tower.id;
                    range.position.set(tower.x, 0.005, tower.z);
                }

                // Attack beam
                if (beam) {
                    const target = tower.target ? enemies.find(e => e.id === tower.target && e.alive) : null;
                    const now = performance.now() / 1000;
                    const recentlyFired = now - tower.lastFired < 0.15;

                    if (target && recentlyFired) {
                        beam.visible = true;
                        // Position beam between tower and target
                        const mx = (tower.x + target.x) / 2;
                        const mz = (tower.z + target.z) / 2;
                        const dx = target.x - tower.x;
                        const dz = target.z - tower.z;
                        const len = Math.sqrt(dx * dx + dz * dz);
                        const angle = Math.atan2(dx, dz);
                        beam.position.set(mx, 0.4, mz);
                        beam.rotation.set(0, angle, 0);
                        beam.scale.set(1, 1, len);
                    } else {
                        beam.visible = false;
                    }
                }
            } else {
                towerMesh.visible = false;
                if (beam) beam.visible = false;
                if (base) base.visible = false;
                if (range) range.visible = false;
                if (label) label.visible = false;
            }
        }
    });

    return (
        <group>
            {Array.from({ length: MAX_TOWERS }, (_, i) => (
                <group key={i}>
                    {/* Tower body */}
                    <mesh
                        ref={el => towerMeshRefs.current[i] = el}
                        visible={false}
                        onClick={(e) => {
                            e.stopPropagation();
                            const tower = gameRef.current.towers[i];
                            if (tower) onTowerClick?.(tower);
                        }}
                    >
                        <coneGeometry args={[0.25, 0.6, 4]} />
                        <meshStandardMaterial color="#334155" wireframe />
                    </mesh>

                    {/* Base */}
                    <mesh
                        ref={el => baseMeshRefs.current[i] = el}
                        visible={false}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <circleGeometry args={[0.35, 16]} />
                        <meshBasicMaterial color="#334155" transparent opacity={0.15} />
                    </mesh>

                    {/* Label */}
                    <Text
                        ref={el => labelRefs.current[i] = el}
                        visible={false}
                        fontSize={0.1}
                        color="#334155"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {'tower'}
                    </Text>

                    {/* Range circle */}
                    <mesh
                        ref={el => rangeMeshRefs.current[i] = el}
                        visible={false}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <ringGeometry args={[2.95, 3, 32]} />
                        <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} />
                    </mesh>

                    {/* Attack beam */}
                    <mesh ref={el => beamRefs.current[i] = el} visible={false}>
                        <boxGeometry args={[0.03, 0.03, 1]} />
                        <meshBasicMaterial color="#3b82f6" transparent opacity={0.7} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

/* ─────────────────────────────────────────────────────────
   PROJECTILE RENDERER
   ─────────────────────────────────────────────────────── */
function ProjectileRenderer({ gameRef }) {
    const meshRefs = useRef([]);
    const glowRefs = useRef([]);
    const MAX_PROJECTILES = 30;

    useFrame(() => {
        const projectiles = gameRef.current.projectiles;
        for (let i = 0; i < MAX_PROJECTILES; i++) {
            const mesh = meshRefs.current[i];
            const glow = glowRefs.current[i];
            if (!mesh) continue;

            const proj = projectiles[i];
            if (proj) {
                mesh.visible = true;
                mesh.position.set(proj.x, 0.4, proj.z);
                if (glow) {
                    glow.visible = true;
                    glow.position.set(proj.x, 0.4, proj.z);
                }
            } else {
                mesh.visible = false;
                if (glow) glow.visible = false;
            }
        }
    });

    return (
        <group>
            {Array.from({ length: MAX_PROJECTILES }, (_, i) => (
                <group key={i}>
                    <mesh ref={el => meshRefs.current[i] = el} visible={false}>
                        <sphereGeometry args={[0.06, 6, 6]} />
                        <meshBasicMaterial color="#1e293b" />
                    </mesh>
                    <mesh ref={el => glowRefs.current[i] = el} visible={false}>
                        <sphereGeometry args={[0.1, 6, 6]} />
                        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

/* ─────────────────────────────────────────────────────────
   STATIC ELEMENTS (memoized — never re-render)
   ─────────────────────────────────────────────────────── */
const GridLines = memo(function GridLines() {
    const lines = useMemo(() => {
        const result = [];
        const t = 0.02;
        for (let z = 0; z <= 7; z++) {
            result.push({ pos: [0, 0.005, z - half], scale: [10, t, t] });
        }
        for (let x = 0; x <= 10; x++) {
            result.push({ pos: [x - half, 0.005, -half + 3.5], scale: [t, t, 7] });
        }
        return result;
    }, []);

    return (
        <group>
            {lines.map((l, i) => (
                <mesh key={i} position={l.pos} scale={l.scale}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#d4d4d8" />
                </mesh>
            ))}
        </group>
    );
});

const Ground = memo(function Ground() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshBasicMaterial color="#f8fafc" />
        </mesh>
    );
});

const PathDots = memo(function PathDots() {
    return (
        <group>
            {PATH_POINTS.slice(1, -1).map((p, i) => (
                <mesh key={i} position={[p.x - half + 0.5, 0.02, p.z - half + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.15, 8]} />
                    <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
                </mesh>
            ))}
            {PATH_POINTS.slice(1, -2).map((p, i) => {
                const next = PATH_POINTS[i + 2];
                const x1 = p.x - half + 0.5, z1 = p.z - half + 0.5;
                const x2 = next.x - half + 0.5, z2 = next.z - half + 0.5;
                const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
                const angle = Math.atan2(x2 - x1, z2 - z1);
                return (
                    <mesh key={`seg-${i}`} position={[(x1 + x2) / 2, 0.015, (z1 + z2) / 2]} rotation={[0, angle, 0]}>
                        <boxGeometry args={[0.06, 0.01, len]} />
                        <meshBasicMaterial color="#94a3b8" transparent opacity={0.4} />
                    </mesh>
                );
            })}
        </group>
    );
});

const Server = memo(function Server() {
    const lp = PATH_POINTS[PATH_POINTS.length - 2];
    const x = lp.x - half + 0.5, z = lp.z - half + 0.5;
    return (
        <group position={[x + 1, 0, z]}>
            <mesh position={[0, 0.4, 0]}>
                <boxGeometry args={[0.5, 0.8, 0.3]} />
                <meshStandardMaterial color="#1e293b" wireframe />
            </mesh>
            <Text position={[0, 1, 0]} fontSize={0.14} color="#1e293b" anchorX="center">
                {'> SERVER'}
            </Text>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[0.5, 0.6, 16]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
            </mesh>
        </group>
    );
});

const SpawnPoint = memo(function SpawnPoint() {
    const f = PATH_POINTS[1];
    return (
        <group position={[f.x - half + 0.5 - 1.2, 0, f.z - half + 0.5]}>
            <Text position={[0, 0.5, 0]} fontSize={0.12} color="#64748b" anchorX="center">
                {'BUGS →'}
            </Text>
        </group>
    );
});

/* ─────────────────────────────────────────────────────────
   GRID TILES — interactive, semi-static
   ─────────────────────────────────────────────────────── */
function GridTiles({ onGridClick, gameRef, placingTower, tutorialTile }) {
    const [hovered, setHovered] = useState(null);

    const tiles = useMemo(() => {
        const result = [];
        for (let x = 0; x <= 9; x++) {
            for (let z = 0; z <= 6; z++) {
                result.push({ x, z, onPath: isOnPath(x, z) });
            }
        }
        return result;
    }, []);

    return (
        <group>
            {tiles.map(tile => {
                const wx = tile.x - half + 0.5;
                const wz = tile.z - half + 0.5;
                const isHovered = hovered?.x === tile.x && hovered?.z === tile.z;
                const isTutorialTarget = tutorialTile?.x === tile.x && tutorialTile?.z === tile.z;
                const canPlace = !tile.onPath && placingTower;

                let color = '#e8e8e8';
                let opacity = 0.3;

                if (tile.onPath) { color = '#cbd5e1'; opacity = 0.7; }
                else if (isTutorialTarget) { color = '#22c55e'; opacity = 0.6; }
                else if (isHovered && canPlace) { color = '#22c55e'; opacity = 0.5; }
                else if (isHovered) { color = '#94a3b8'; opacity = 0.45; }

                return (
                    <mesh
                        key={`${tile.x}-${tile.z}`}
                        position={[wx, 0.01, wz]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        onClick={(e) => { e.stopPropagation(); onGridClick?.(tile.x, tile.z); }}
                        onPointerOver={() => setHovered(tile)}
                        onPointerOut={() => setHovered(null)}
                    >
                        <planeGeometry args={[0.92, 0.92]} />
                        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
                    </mesh>
                );
            })}
        </group>
    );
}

/* ─────────────────────────────────────────────────────────
   SCENE — assembles everything
   ─────────────────────────────────────────────────────── */
function Scene({ gameRef, syncUI, selectedTower, placingTower, onGridClick, onTowerClick, tutorialTile }) {
    const particlesRef = useRef({});

    return (
        <>
            <ambientLight intensity={0.9} />
            <directionalLight position={[5, 10, 5]} intensity={0.4} />

            <OrbitControls
                maxPolarAngle={Math.PI / 3}
                minPolarAngle={Math.PI / 6}
                maxDistance={14}
                minDistance={6}
                enablePan={false}
                target={[0, 0, 0]}
            />

            {/* Game loop (no visual output) */}
            <GameLoop gameRef={gameRef} syncUI={syncUI} particlesRef={particlesRef} />

            {/* Static (memoized) */}
            <Ground />
            <GridLines />
            <PathDots />
            <Server />
            <SpawnPoint />

            {/* Interactive */}
            <GridTiles
                onGridClick={onGridClick}
                gameRef={gameRef}
                placingTower={placingTower}
                tutorialTile={tutorialTile}
            />

            {/* Dynamic renderers (all use useFrame internally) */}
            <TowerRenderer
                gameRef={gameRef}
                selectedTowerId={selectedTower?.id}
                onTowerClick={onTowerClick}
            />
            <EnemyRenderer gameRef={gameRef} />
            <ProjectileRenderer gameRef={gameRef} />
            <ParticleSystem particlesRef={particlesRef} />
        </>
    );
}

/* ─────────────────────────────────────────────────────────
   MAIN CANVAS EXPORT
   ─────────────────────────────────────────────────────── */
export default function GameCanvas({
    gameRef,
    syncUI,
    selectedTower,
    placingTower,
    onGridClick,
    onTowerClick,
    tutorialTile,
}) {
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [2, 10, 8], fov: 45 }}
                style={{ background: '#f1f5f9' }}
            >
                <Scene
                    gameRef={gameRef}
                    syncUI={syncUI}
                    selectedTower={selectedTower}
                    placingTower={placingTower}
                    onGridClick={onGridClick}
                    onTowerClick={onTowerClick}
                    tutorialTile={tutorialTile}
                />
            </Canvas>
        </div>
    );
}
