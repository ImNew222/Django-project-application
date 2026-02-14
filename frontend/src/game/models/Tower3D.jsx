/**
 * 3D Tower meshes — dark wireframe shapes with code labels on white theme.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

const LEVEL_COLORS = ['#334155', '#2563eb', '#7c3aed'];

const SHAPES = {
    pyramid: ({ color }) => (
        <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.25, 0.6, 4]} />
            <meshStandardMaterial color={color} wireframe />
        </mesh>
    ),
    cube: ({ color }) => (
        <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.4, 0.5, 0.4]} />
            <meshStandardMaterial color={color} wireframe />
        </mesh>
    ),
    cylinder: ({ color }) => (
        <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 0.7, 8]} />
            <meshStandardMaterial color={color} wireframe />
        </mesh>
    ),
    sphere: ({ color }) => {
        const ref = useRef();
        useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt; });
        return (
            <mesh ref={ref} position={[0, 0.3, 0]}>
                <sphereGeometry args={[0.3, 8, 6]} />
                <meshStandardMaterial color={color} wireframe />
            </mesh>
        );
    },
    star: ({ color }) => {
        const ref = useRef();
        useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 2; });
        return (
            <mesh ref={ref} position={[0, 0.3, 0]}>
                <octahedronGeometry args={[0.3]} />
                <meshStandardMaterial color={color} wireframe />
            </mesh>
        );
    },
};

export default function Tower3D({ tower, selected, onClick }) {
    const ShapeComponent = SHAPES[tower.shape] || SHAPES.cube;
    const color = LEVEL_COLORS[Math.min(tower.level - 1, 2)];

    return (
        <group
            position={[tower.x, 0, tower.z]}
            onClick={(e) => { e.stopPropagation(); onClick?.(tower); }}
        >
            {/* Base platform */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.35, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.15} />
            </mesh>

            {/* Tower shape */}
            <ShapeComponent color={color} />

            {/* Code label */}
            <Text
                position={[0, 0.8, 0]}
                fontSize={0.1}
                color={color}
                anchorX="center"
                anchorY="middle"
            >
                {tower.code}
            </Text>

            {/* Level stars */}
            {tower.level > 1 && (
                <Text
                    position={[0.3, 0.65, 0]}
                    fontSize={0.08}
                    color={color}
                    anchorX="center"
                >
                    {'★'.repeat(tower.level)}
                </Text>
            )}

            {/* Range circle (selected only) */}
            {selected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <ringGeometry args={[tower.range - 0.05, tower.range, 32]} />
                    <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} />
                </mesh>
            )}
        </group>
    );
}
