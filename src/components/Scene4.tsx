import { Canvas } from '@react-three/fiber'
import { Text, Billboard, OrbitControls, Environment, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Cube } from './Cube'

interface Scene4Props {
    z: number
    setZ: (value: number) => void
}

// Slice plane component - circular gradient with concentric rings
// Solid up to radius 1, progressively transparent from radius 1 to 2
function SlicePlane({ z }: { z: number }) {
    const ringCount = 100
    const maxRadius = 2
    const solidRadius = 1.5
    const rings = []

    for (let i = 0; i < ringCount; i++) {
        const innerRadius = (i / ringCount) * maxRadius
        const outerRadius = ((i + 1) / ringCount) * maxRadius
        const midRadius = (innerRadius + outerRadius) / 2

        // Opacity: fully opaque (0.7) up to radius 1, then fade to 0 at radius 2
        let opacity: number
        if (midRadius <= solidRadius) {
            opacity = 0.7  // Solid within radius 1
        } else {
            // Linear fade from 0.7 at radius 1 to 0 at radius 2
            opacity = 0.7 * (1 - (midRadius - solidRadius) / (maxRadius - solidRadius))
        }

        rings.push(
            <mesh key={i} position={[0.5, 0.5, z]} renderOrder={1}>
                <ringGeometry args={[innerRadius, outerRadius, 32]} />
                <meshStandardMaterial
                    color="#ddecec"
                    transparent
                    opacity={opacity}
                    side={THREE.DoubleSide}
                    emissive="#00ffff"
                    emissiveIntensity={0}
                    depthWrite={false}
                />
            </mesh>
        )
    }

    return <group>{rings}</group>
}

// Grey lines showing where slice plane intersects cube faces
function SliceLines({ z }: { z: number }) {
    // Only show lines when z is strictly between 0 and 1
    const showLines = z > 0 && z < 1

    if (!showLines) return null

    const lineRadius = 0.008
    const lineColor = '#888888'

    return (
        <group>
            {/* Left face (-X): vertical line from (0, 0, z) to (0, 1, z) */}
            <mesh position={[0, 0.5, z]} renderOrder={2}>
                <cylinderGeometry args={[lineRadius, lineRadius, 1, 8]} />
                <meshBasicMaterial color={lineColor} transparent opacity={0.6} depthTest={false} />
            </mesh>

            {/* Right face (+X): vertical line from (1, 0, z) to (1, 1, z) */}
            <mesh position={[1, 0.5, z]} renderOrder={2}>
                <cylinderGeometry args={[lineRadius, lineRadius, 1, 8]} />
                <meshBasicMaterial color={lineColor} transparent opacity={0.6} depthTest={false} />
            </mesh>

            {/* Bottom face (-Y): horizontal line from (0, 0, z) to (1, 0, z) */}
            <mesh position={[0.5, 0, z]} rotation={[0, 0, Math.PI / 2]} renderOrder={2}>
                <cylinderGeometry args={[lineRadius, lineRadius, 1, 8]} />
                <meshBasicMaterial color={lineColor} transparent opacity={0.6} depthTest={false} />
            </mesh>

            {/* Top face (+Y): horizontal line from (0, 1, z) to (1, 1, z) */}
            <mesh position={[0.5, 1, z]} rotation={[0, 0, Math.PI / 2]} renderOrder={2}>
                <cylinderGeometry args={[lineRadius, lineRadius, 1, 8]} />
                <meshBasicMaterial color={lineColor} transparent opacity={0.6} depthTest={false} />
            </mesh>
        </group>
    )
}

// 3D View component (left side)
function Scene4_3DView({ z }: { z: number }) {
    // Use same axis dimensions as Scene 1 (at w=0.5)
    const length = 1.5
    const center = 1.75

    return (
        <>
            {/* Shared lights (same as App.tsx provides for other scenes) */}
            <ambientLight intensity={0.8} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {/* Scene 1 specific lights */}
            <pointLight position={[0.5, 0.5, 0.5]} intensity={1.5} distance={5} decay={1} />
            <directionalLight position={[0.5, -2, 0.5]} intensity={0.5} target-position={[0.5, 0, 0.5]} /> {/* Diffuse light below dark green face */}
            <hemisphereLight intensity={0.4} groundColor="#444" />
            <Environment preset="city" />

            {/* Starfield background */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* Cube at w=0.5 (same as Scene 1) */}
            <Cube w={0.5} />

            {/* Slice Plane */}
            <SlicePlane z={z} />

            {/* Slice intersection lines on cube faces */}
            <SliceLines z={z} />

            {/* Axes */}
            {/* X axis - Red */}
            <mesh position={[center, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, length, 8]} />
                <meshStandardMaterial color="red" transparent opacity={0.5} />
            </mesh>
            {/* Y axis - Green */}
            <mesh position={[0, center, 0]}>
                <cylinderGeometry args={[0.01, 0.01, length, 8]} />
                <meshStandardMaterial color="green" transparent opacity={0.5} />
            </mesh>
            {/* Z axis - Blue */}
            <mesh position={[0, 0, center]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.01, length, 8]} />
                <meshStandardMaterial color="blue" transparent opacity={0.5} />
            </mesh>

            {/* Labels */}
            <group>
                {/* Origin */}
                <Billboard position={[-0.1, -0.1, -0.1]}>
                    <Text fontSize={0.2} color="white">0</Text>
                </Billboard>

                {/* X Axis Labels */}
                <Billboard position={[1, -0.1, 0]}>
                    <Text fontSize={0.15} color="white">1</Text>
                </Billboard>
                <Billboard position={[2, -0.1, 0]}>
                    <Text fontSize={0.15} color="white">2</Text>
                </Billboard>
                <Text position={[2.7, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.3} color="#ff8888">X</Text>

                {/* Y Axis Labels */}
                <Billboard position={[-0.1, 1, 0]}>
                    <Text fontSize={0.15} color="white">1</Text>
                </Billboard>
                <Billboard position={[-0.1, 2, 0]}>
                    <Text fontSize={0.15} color="white">2</Text>
                </Billboard>
                <Text position={[0, 2.7, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.3} color="#88ff88">Y</Text>

                {/* Z Axis Labels */}
                <Billboard position={[0, -0.1, 1]}>
                    <Text fontSize={0.15} color="white">1</Text>
                </Billboard>
                <Billboard position={[0, -0.1, 2]}>
                    <Text fontSize={0.15} color="white">2</Text>
                </Billboard>
                <Text position={[0, 0, 2.7]} fontSize={0.3} color="#8888ff">Z</Text>
            </group>

            {/* Orbit Controls */}
            <OrbitControls makeDefault />
        </>
    )
}

// 2D Cross-section View component
function CrossSection2D({ z }: { z: number }) {
    // Determine cross-section state
    const isOutside = z < 0 || z > 1
    const isOnBackFace = Math.abs(z) < 0.001
    const isOnFrontFace = Math.abs(z - 1) < 0.001
    const isOnFace = isOnBackFace || isOnFrontFace
    const isInside = z > 0 && z < 1

    // Cube face colors from Cube.tsx
    const C_Right = '#f39494'   // +X face (light red)
    const C_Left = '#c40707'    // -X face (dark red)
    const C_Top = '#57f157'     // +Y face (light green)
    const C_Bottom = '#048004'  // -Y face (dark green)
    const C_Back = '#00008b'    // z=0 face (dark blue)
    const C_Front = '#7185f1'   // z=1 face (light blue)

    const canvasSize = 300
    const margin = 50
    const squareSize = canvasSize - margin * 2
    const edgeWidth = 8

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        }}>
            <h2 style={{
                color: 'white',
                marginBottom: '20px',
                fontSize: '20px',
                fontWeight: 500,
                opacity: 0.9,
            }}>
                Cross-Section at Z = {z.toFixed(2)}
            </h2>

            <svg
                width={canvasSize}
                height={canvasSize}
                style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                {/* Axes */}
                {/* X axis */}
                <line
                    x1={margin - 15}
                    y1={canvasSize - margin}
                    x2={canvasSize - margin + 15}
                    y2={canvasSize - margin}
                    stroke="#ff8888"
                    strokeWidth={2}
                    opacity={0.6}
                />
                <text x={canvasSize - margin + 20} y={canvasSize - margin + 5} fill="#ff8888" fontSize={16}>X</text>

                {/* Y axis */}
                <line
                    x1={margin}
                    y1={canvasSize - margin + 15}
                    x2={margin}
                    y2={margin - 15}
                    stroke="#88ff88"
                    strokeWidth={2}
                    opacity={0.6}
                />
                <text x={margin - 8} y={margin - 20} fill="#88ff88" fontSize={16}>Y</text>

                {/* Origin label */}
                <text x={margin - 20} y={canvasSize - margin + 25} fill="white" fontSize={14} opacity={0.7}>0</text>

                {/* x=1 label (at right edge of square, along X axis) */}
                <text x={canvasSize - margin} y={canvasSize - margin + 25} fill="white" fontSize={14} opacity={0.7} textAnchor="middle">1</text>

                {/* y=1 label (at top edge of square, along Y axis) */}
                <text x={margin - 20} y={margin + 5} fill="white" fontSize={14} opacity={0.7}>1</text>

                {/* Cross-section visualization */}
                {isOnFace && (
                    // Solid square (on cube face) - filled with face color
                    <>
                        <rect
                            x={margin}
                            y={margin}
                            width={squareSize}
                            height={squareSize}
                            fill={isOnBackFace ? C_Back : C_Front}
                            opacity={0.7}
                        />
                        {/* Colored edges */}
                        {/* Bottom edge (-Y) */}
                        <line x1={margin} y1={canvasSize - margin} x2={canvasSize - margin} y2={canvasSize - margin} stroke={C_Bottom} strokeWidth={edgeWidth} />
                        {/* Top edge (+Y) */}
                        <line x1={margin} y1={margin} x2={canvasSize - margin} y2={margin} stroke={C_Top} strokeWidth={edgeWidth} />
                        {/* Left edge (-X) */}
                        <line x1={margin} y1={margin} x2={margin} y2={canvasSize - margin} stroke={C_Left} strokeWidth={edgeWidth} />
                        {/* Right edge (+X) */}
                        <line x1={canvasSize - margin} y1={margin} x2={canvasSize - margin} y2={canvasSize - margin} stroke={C_Right} strokeWidth={edgeWidth} />
                    </>
                )}

                {isInside && !isOnFace && (
                    // Hollow square (inside cube) - edges only with face colors
                    <>
                        {/* Bottom edge (-Y) */}
                        <line x1={margin} y1={canvasSize - margin} x2={canvasSize - margin} y2={canvasSize - margin} stroke={C_Bottom} strokeWidth={edgeWidth} />
                        {/* Top edge (+Y) */}
                        <line x1={margin} y1={margin} x2={canvasSize - margin} y2={margin} stroke={C_Top} strokeWidth={edgeWidth} />
                        {/* Left edge (-X) */}
                        <line x1={margin} y1={margin} x2={margin} y2={canvasSize - margin} stroke={C_Left} strokeWidth={edgeWidth} />
                        {/* Right edge (+X) */}
                        <line x1={canvasSize - margin} y1={margin} x2={canvasSize - margin} y2={canvasSize - margin} stroke={C_Right} strokeWidth={edgeWidth} />
                    </>
                )}

                {isOutside && (
                    // Empty - show dashed outline to indicate potential position
                    <rect
                        x={margin}
                        y={margin}
                        width={squareSize}
                        height={squareSize}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth={1}
                        strokeDasharray="5,5"
                    />
                )}

                {/* State label */}
                <text
                    x={canvasSize / 2}
                    y={canvasSize - 12}
                    fill="white"
                    fontSize={14}
                    textAnchor="middle"
                    opacity={0.7}
                >
                    {isOutside ? 'Empty (outside cube)' : isOnFace ? 'Solid Square (face)' : 'Hollow Square (interior)'}
                </text>
            </svg>
        </div>
    )
}

// Main Scene 4 component - split view
export function Scene4({ z }: Scene4Props) {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
        }}>
            {/* Left side - 3D View */}
            <div style={{ flex: 1, height: '100%' }}>
                <Canvas camera={{ position: [3, 3, 3], fov: 60 }}>
                    <Scene4_3DView z={z} />
                </Canvas>
            </div>

            {/* Right side - 2D Cross-section */}
            <div style={{ flex: 1, height: '100%' }}>
                <CrossSection2D z={z} />
            </div>
        </div>
    )
}

// Scene 4 UI Overlay
interface Scene4UIProps {
    z: number
    setZ: (value: number) => void
}

export function Scene4UI({ z, setZ }: Scene4UIProps) {
    return (
        <>
            <div className="glass-card title-card">
                <h1>Z-Axis Slice Viewer</h1>
                <p>Left: 3D cube with slice plane</p>
                <p>Right: 2D cross-section result</p>
                <p>Arrow keys adjust Z-axis</p>
            </div>

            <div className="glass-card">
                <div className="control-group">
                    <div className="slider-label">
                        <span>Z-axis value</span>
                        <span className={`slider-value ${z === 0 || z === 1 ? 'highlight' : ''}`}>
                            {z.toFixed(2)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="-0.5"
                        max="1.5"
                        step="0.05"
                        value={z}
                        onChange={(e) => setZ(parseFloat(e.target.value))}
                        className="custom-slider"
                    />
                </div>
            </div>
        </>
    )
}
