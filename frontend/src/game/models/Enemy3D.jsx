/**
 * 3D Enemy — floating dark cubes with code text labels and HP bars.
 * White theme version.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

export default function Enemy3D({ enemy }) {
    const ref = useRef();
    const hpPercent = enemy.hp / enemy.maxHp;

    useFrame((_, dt) => {
        if (ref.current) {
            ref.current.position.y = 0.3 + Math.sin(performance.now() * 0.003 + enemy.id) * 0.05;
            ref.current.rotation.y += dt * 0.5;
        }
    });

    const bodyColor = enemy.isBoss ? '#dc2626' : '#1e293b';
    const textColor = enemy.isBoss ? '#dc2626' : '#334155';

    return (
        <group position={[enemy.x, 0, enemy.z]}>
            {/* Enemy body */}
            <mesh ref={ref}>
                <boxGeometry args={[enemy.size, enemy.size, enemy.size]} />
                <meshStandardMaterial color={bodyColor} wireframe />
            </mesh>

            {/* Shadow */}
            <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[enemy.size * 0.6, 8]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.08} />
            </mesh>

            {/* Code label */}
            <Text
                position={[0, 0.55 + (enemy.isBoss ? 0.15 : 0), 0]}
                fontSize={enemy.isBoss ? 0.14 : 0.1}
                color={textColor}
                anchorX="center"
                anchorY="middle"
            >
                {enemy.label}
            </Text>

            {/* HP bar background */}
            <mesh position={[0, 0.7 + (enemy.isBoss ? 0.15 : 0), 0]}>
                <planeGeometry args={[0.4, 0.04]} />
                <meshBasicMaterial color="#e2e8f0" />
            </mesh>

            {/* HP bar fill */}
            <mesh position={[-0.2 * (1 - hpPercent), 0.7 + (enemy.isBoss ? 0.15 : 0), 0.001]}>
                <planeGeometry args={[0.4 * hpPercent, 0.04]} />
                <meshBasicMaterial
                    color={hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#f59e0b' : '#ef4444'}
                />
            </mesh>

            {/* Boss crown */}
            {enemy.isBoss && (
                <Text position={[0, 0.95, 0]} fontSize={0.18} anchorX="center">
                    👑
                </Text>
            )}
        </group>
    );
}
