import { ContactShadows, Environment, Lightformer } from '@react-three/drei'

/**
 * Studio lighting built from local Lightformers (no HDR download: works offline and on GitHub Pages),
 * plus contact shadows on a dark ground.
 */
export function Stage({ shadows = true, ground = true, shadowFrames }: { shadows?: boolean; ground?: boolean; shadowFrames?: number }) {
  return (
    <>
      <color attach="background" args={['#0b0d12']} />
      <fog attach="fog" args={['#0b0d12', 14, 34]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 8, 5]} intensity={1.6} />
      <directionalLight position={[-6, 4, -4]} intensity={0.6} color="#9fd8ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2} position={[0, 2, 6]} scale={[12, 1.2, 1]} />
        <Lightformer form="rect" intensity={2} position={[0, 2, -6]} rotation-y={Math.PI} scale={[12, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#e10600" position={[-7, 1.5, 0]} rotation-y={Math.PI / 2} scale={[6, 1, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#00d2be" position={[7, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[6, 1, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[3, 4, 3]} scale={2} />
      </Environment>
      {ground && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
          <circleGeometry args={[30, 64]} />
          <meshStandardMaterial color="#0f1218" roughness={0.85} metalness={0.1} />
        </mesh>
      )}
      {shadows && (
        <ContactShadows position={[0, 0.001, 0]} scale={9} far={1.6} blur={2.4} opacity={0.75} resolution={512} frames={shadowFrames} color="#000000" />
      )}
    </>
  )
}
