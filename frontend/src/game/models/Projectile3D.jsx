/**
 * 3D Projectile — dark sphere with glow for white theme.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Projectile3D({ projectile }) {
    const ref = useRef();

    useFrame(() => {
        if (ref.current) {
            ref.current.position.set(projectile.x, 0.4, projectile.z);
        }
    });

    return (
        <group>
            <mesh ref={ref} position={[projectile.x, 0.4, projectile.z]}>
                <sphereGeometry args={[0.06, 6, 6]} />
                <meshBasicMaterial color="#1e293b" />
            </mesh>
            <mesh position={[projectile.x, 0.4, projectile.z]}>
                <sphereGeometry args={[0.1, 6, 6]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}
