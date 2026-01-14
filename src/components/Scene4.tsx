import { Canvas } from '@react-three/fiber'
import { Text, Billboard, OrbitControls, Environment, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Cube } from './Cube'
import { useMemo } from 'react'

interface Scene4Props {
    z: number
    setZ: (value: number) => void
    rotation: [number, number, number]
}

// Cube face colors from Cube.tsx
const C_Right = '#f39494'   // +X face (light red)
const C_Left = '#c40707'    // -X face (dark red)
const C_Top = '#57f157'     // +Y face (light green)
const C_Bottom = '#048004'  // -Y face (dark green)
const C_Back = '#00008b'    // z=0 face (dark blue)
const C_Front = '#7185f1'   // z=1 face (light blue)

// Cube vertices (corners of unit cube from [0,0,0] to [1,1,1])
const CUBE_VERTICES = [
    [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],  // Back face (z=0)
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],  // Front face (z=1)
]

// Face definitions: which vertices belong to which face, and the face color
const CUBE_FACES = [
    { vertices: [0, 1, 2, 3], color: C_Back },   // Back face (z=0)
    { vertices: [4, 5, 6, 7], color: C_Front },  // Front face (z=1)
    { vertices: [0, 1, 5, 4], color: C_Bottom }, // Bottom face (y=0)
    { vertices: [2, 3, 7, 6], color: C_Top },    // Top face (y=1)
    { vertices: [0, 3, 7, 4], color: C_Left },   // Left face (x=0)
    { vertices: [1, 2, 6, 5], color: C_Right },  // Right face (x=1)
]

// Cube edges: each edge belongs to exactly two faces
// We'll compute which faces share each edge
interface CubeEdge {
    v1: number
    v2: number
    faces: string[]  // Two face colors this edge belongs to
}

function getEdgeFaces(v1: number, v2: number): string[] {
    const faces: string[] = []
    for (const face of CUBE_FACES) {
        const hasV1 = face.vertices.includes(v1)
        const hasV2 = face.vertices.includes(v2)
        if (hasV1 && hasV2) {
            faces.push(face.color)
        }
    }
    return faces
}

const CUBE_EDGES: CubeEdge[] = [
    // Back face edges (z=0)
    { v1: 0, v2: 1, faces: getEdgeFaces(0, 1) },
    { v1: 1, v2: 2, faces: getEdgeFaces(1, 2) },
    { v1: 2, v2: 3, faces: getEdgeFaces(2, 3) },
    { v1: 3, v2: 0, faces: getEdgeFaces(3, 0) },
    // Front face edges (z=1)
    { v1: 4, v2: 5, faces: getEdgeFaces(4, 5) },
    { v1: 5, v2: 6, faces: getEdgeFaces(5, 6) },
    { v1: 6, v2: 7, faces: getEdgeFaces(6, 7) },
    { v1: 7, v2: 4, faces: getEdgeFaces(7, 4) },
    // Connecting edges (z-direction)
    { v1: 0, v2: 4, faces: getEdgeFaces(0, 4) },
    { v1: 1, v2: 5, faces: getEdgeFaces(1, 5) },
    { v1: 2, v2: 6, faces: getEdgeFaces(2, 6) },
    { v1: 3, v2: 7, faces: getEdgeFaces(3, 7) },
]

// Helper: Apply Euler rotation around a center point using THREE.js Matrix4
function rotatePoint(point: number[], rotation: [number, number, number], center: number[]): number[] {
    const [cx, cy, cz] = center

    // Create a THREE.js Vector3 and apply proper Euler rotation
    const vec = new THREE.Vector3(point[0] - cx, point[1] - cy, point[2] - cz)

    // Use THREE.js Euler with XYZ order (matches the group rotation)
    const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
    vec.applyEuler(euler)

    // Translate back
    return [vec.x + cx, vec.y + cy, vec.z + cz]
}

// Compute the cross-section polygon from slicing the rotated cube at z=zSlice
interface IntersectionPoint {
    x: number
    y: number
    faces: string[]  // Which cube faces this point lies on (the edge's two faces)
}

interface SliceResult {
    points: Array<{ x: number, y: number, color: string }>
    isFace: boolean  // True if this is exactly on a cube face
}

function computeSlice(zSlice: number, rotation: [number, number, number]): SliceResult {
    const center = [0.5, 0.5, 0.5]
    const epsilon = 0.001

    // Rotate all cube vertices
    const rotatedVertices = CUBE_VERTICES.map(v => rotatePoint(v, rotation, center))

    // First check if we're slicing exactly through a cube face
    // This avoids the edge case where parallel edges create extra intersection points
    for (const cubeFace of CUBE_FACES) {
        const faceZ = rotatedVertices[cubeFace.vertices[0]][2]
        const allSameZ = cubeFace.vertices.every(vi => Math.abs(rotatedVertices[vi][2] - faceZ) < epsilon)
        if (allSameZ && Math.abs(faceZ - zSlice) < epsilon) {
            // Slice is exactly on this face - return the face vertices directly
            const facePoints = cubeFace.vertices.map(vi => ({
                x: rotatedVertices[vi][0],
                y: rotatedVertices[vi][1],
                color: cubeFace.color
            }))
            // Sort by angle to form proper polygon
            const cx = facePoints.reduce((sum, p) => sum + p.x, 0) / facePoints.length
            const cy = facePoints.reduce((sum, p) => sum + p.y, 0) / facePoints.length
            facePoints.sort((a, b) => {
                const angleA = Math.atan2(a.y - cy, a.x - cx)
                const angleB = Math.atan2(b.y - cy, b.x - cx)
                return angleA - angleB
            })
            return { points: facePoints, isFace: true }
        }
    }

    // Find all intersection points with z=zSlice plane
    const intersections: IntersectionPoint[] = []

    for (const edge of CUBE_EDGES) {
        const p1 = rotatedVertices[edge.v1]
        const p2 = rotatedVertices[edge.v2]

        const z1 = p1[2]
        const z2 = p2[2]

        // Check if edge crosses the z=zSlice plane
        if ((z1 <= zSlice && z2 >= zSlice) || (z1 >= zSlice && z2 <= zSlice)) {
            // Edge crosses the plane or touches it
            if (Math.abs(z2 - z1) < epsilon) {
                // Edge is parallel to plane - if on plane, add its midpoint
                if (Math.abs(z1 - zSlice) < epsilon) {
                    intersections.push({
                        x: (p1[0] + p2[0]) / 2,
                        y: (p1[1] + p2[1]) / 2,
                        faces: edge.faces
                    })
                }
            } else {
                // Linear interpolation to find intersection point
                const t = (zSlice - z1) / (z2 - z1)
                intersections.push({
                    x: p1[0] + t * (p2[0] - p1[0]),
                    y: p1[1] + t * (p2[1] - p1[1]),
                    faces: edge.faces
                })
            }
        }
    }

    // Remove duplicate points (within epsilon)
    const uniquePoints: IntersectionPoint[] = []
    for (const pt of intersections) {
        const isDuplicate = uniquePoints.some(
            existing => Math.abs(existing.x - pt.x) < epsilon && Math.abs(existing.y - pt.y) < epsilon
        )
        if (!isDuplicate) {
            uniquePoints.push(pt)
        }
    }

    // Sort points by angle around centroid to form convex polygon
    if (uniquePoints.length > 2) {
        const cx = uniquePoints.reduce((sum, p) => sum + p.x, 0) / uniquePoints.length
        const cy = uniquePoints.reduce((sum, p) => sum + p.y, 0) / uniquePoints.length
        uniquePoints.sort((a, b) => {
            const angleA = Math.atan2(a.y - cy, a.x - cx)
            const angleB = Math.atan2(b.y - cy, b.x - cx)
            return angleA - angleB
        })
    }

    // Determine if this is exactly on a cube face (z=0 or z=1 in original cube space)
    // Check if the slice plane passes through exactly 4 coplanar original vertices
    let isFace = false
    if (uniquePoints.length === 4) {
        // Check if we're slicing through an original face by checking if all 4 vertices
        // of any face have the same z after rotation
        const faceIndices = [
            [0, 1, 2, 3], // Back face
            [4, 5, 6, 7], // Front face
            [0, 1, 5, 4], // Bottom face
            [2, 3, 7, 6], // Top face
            [0, 3, 7, 4], // Left face
            [1, 2, 6, 5], // Right face
        ]

        for (const face of faceIndices) {
            const faceZ = rotatedVertices[face[0]][2]
            const allSameZ = face.every(vi => Math.abs(rotatedVertices[vi][2] - faceZ) < epsilon)
            if (allSameZ && Math.abs(faceZ - zSlice) < epsilon) {
                isFace = true
                break
            }
        }
    }

    // Convert to output format: for each polygon edge (between adjacent points),
    // find the common face color between the two endpoint intersections
    const outputPoints: Array<{ x: number, y: number, color: string }> = []
    for (let i = 0; i < uniquePoints.length; i++) {
        const current = uniquePoints[i]
        const next = uniquePoints[(i + 1) % uniquePoints.length]

        // Find a face color that both edges share
        let edgeColor = '#888888' // fallback grey
        for (const face of current.faces) {
            if (next.faces.includes(face)) {
                edgeColor = face
                break
            }
        }

        outputPoints.push({
            x: current.x,
            y: current.y,
            color: edgeColor
        })
    }

    return { points: outputPoints, isFace }
}

// Slice plane component - circular gradient with concentric rings
function SlicePlane({ z }: { z: number }) {
    const ringCount = 100
    const maxRadius = 2
    const solidRadius = 1.5
    const rings = []

    for (let i = 0; i < ringCount; i++) {
        const innerRadius = (i / ringCount) * maxRadius
        const outerRadius = ((i + 1) / ringCount) * maxRadius
        const midRadius = (innerRadius + outerRadius) / 2

        // Opacity: fully opaque (0.7) up to solidRadius, then fade to 0 at maxRadius
        let opacity: number
        if (midRadius <= solidRadius) {
            opacity = 0.7  // Solid within solidRadius
        } else {
            // Linear fade from 0.7 at solidRadius to 0 at maxRadius
            opacity = 0.7 * (1 - (midRadius - solidRadius) / (maxRadius - solidRadius))
        }

        rings.push(
            <mesh key={i} position={[0.5, 0.5, z]} renderOrder={-1}>
                <ringGeometry args={[innerRadius, outerRadius, 32]} />
                <meshStandardMaterial
                    color="#ddecec"
                    transparent
                    opacity={opacity}
                    side={THREE.DoubleSide}
                    emissive="#00ffff"
                    emissiveIntensity={0}
                    depthWrite={false}
                    depthTest={false}
                />
            </mesh>
        )
    }

    return <group>{rings}</group>
}

// 3D slice lines showing where slice plane intersects the rotated cube
function SliceLines3D({ slicePoints }: { slicePoints: Array<{ x: number, y: number, color: string }>, z: number }) {
    if (slicePoints.length < 2) return null

    const lineRadius = 0.008

    return (
        <group>
            {slicePoints.map((point, i) => {
                const nextPoint = slicePoints[(i + 1) % slicePoints.length]
                const dx = nextPoint.x - point.x
                const dy = nextPoint.y - point.y
                const length = Math.sqrt(dx * dx + dy * dy)
                const angle = Math.atan2(dy, dx)
                const midX = (point.x + nextPoint.x) / 2
                const midY = (point.y + nextPoint.y) / 2

                return (
                    <mesh
                        key={i}
                        position={[midX, midY, arguments[0].z]}
                        rotation={[0, 0, angle]}
                        renderOrder={2}
                    >
                        <boxGeometry args={[length, lineRadius * 2, lineRadius * 2]} />
                        <meshBasicMaterial color={point.color} transparent opacity={0.8} depthTest={false} />
                    </mesh>
                )
            })}
        </group>
    )
}

// 3D View component (left side)
function Scene4_3DView({ z, rotation }: { z: number, rotation: [number, number, number] }) {
    // Use same axis dimensions as Scene 1 (at w=0.5)
    const length = 1.5
    const center = 1.75

    // Compute slice for 3D visualization
    const sliceResult = useMemo(() => computeSlice(z, rotation), [z, rotation])

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

            {/* Rotated Cube Group */}
            <group
                position={[0.5, 0.5, 0.5]}
                rotation={rotation}
            >
                <group position={[-0.5, -0.5, -0.5]}>
                    <Cube w={0.5} />
                </group>
            </group>

            {/* Slice Plane (in world coordinates) */}
            <SlicePlane z={z} />

            {/* Slice intersection lines on the rotated cube */}
            <SliceLines3D slicePoints={sliceResult.points} z={z} />

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
                <Billboard position={[2.7, 0, 0]}>
                    <Text fontSize={0.3} color="#ff8888">X</Text>
                </Billboard>

                {/* Y Axis Labels */}
                <Billboard position={[-0.1, 1, 0]}>
                    <Text fontSize={0.15} color="white">1</Text>
                </Billboard>
                <Billboard position={[-0.1, 2, 0]}>
                    <Text fontSize={0.15} color="white">2</Text>
                </Billboard>
                <Billboard position={[0, 2.7, 0]}>
                    <Text fontSize={0.3} color="#88ff88">Y</Text>
                </Billboard>

                {/* Z Axis Labels */}
                <Billboard position={[0, -0.1, 1]}>
                    <Text fontSize={0.15} color="white">1</Text>
                </Billboard>
                <Billboard position={[0, -0.1, 2]}>
                    <Text fontSize={0.15} color="white">2</Text>
                </Billboard>
                <Billboard position={[0, 0, 2.7]}>
                    <Text fontSize={0.3} color="#8888ff">Z</Text>
                </Billboard>
            </group>

            {/* Orbit Controls */}
            <OrbitControls makeDefault />
        </>
    )
}

// 2D Cross-section View component
function CrossSection2D({ z, rotation }: { z: number, rotation: [number, number, number] }) {
    const sliceResult = useMemo(() => computeSlice(z, rotation), [z, rotation])
    const { points, isFace } = sliceResult

    const canvasSize = 400
    const margin = 100
    const squareSize = canvasSize - margin * 2
    const edgeWidth = 8

    // Convert world coordinates to SVG coordinates
    // Cube goes from 0 to 1, map to margin to margin+squareSize
    const toSvgX = (x: number) => margin + x * squareSize
    const toSvgY = (y: number) => canvasSize - margin - y * squareSize // Flip Y

    // Get state description
    const getStateLabel = () => {
        if (points.length === 0) return 'Empty (outside cube)'
        if (points.length === 1) return 'Point (vertex)'
        if (points.length === 2) return 'Line (edge)'
        if (isFace) return 'Solid Square (face)'
        if (points.length === 3) return 'Triangle (interior)'
        if (points.length === 4) return 'Quadrilateral (interior)'
        if (points.length === 5) return 'Pentagon (interior)'
        if (points.length === 6) return 'Hexagon (interior)'
        return `${points.length}-gon (interior)`
    }

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

                {/* x=1 label */}
                <text x={canvasSize - margin} y={canvasSize - margin + 25} fill="white" fontSize={14} opacity={0.7} textAnchor="middle">1</text>

                {/* y=1 label */}
                <text x={margin - 20} y={margin + 5} fill="white" fontSize={14} opacity={0.7}>1</text>

                {/* Reference square outline (dashed) */}
                <rect
                    x={margin}
                    y={margin}
                    width={squareSize}
                    height={squareSize}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth={1}
                    strokeDasharray="5,5"
                />

                {/* Cross-section visualization */}
                {points.length === 0 && (
                    // Empty - already showing dashed outline
                    null
                )}

                {points.length === 1 && (
                    // Single point (vertex)
                    <circle
                        cx={toSvgX(points[0].x)}
                        cy={toSvgY(points[0].y)}
                        r={8}
                        fill={points[0].color}
                        stroke="white"
                        strokeWidth={2}
                    />
                )}

                {points.length === 2 && (
                    // Line segment
                    <line
                        x1={toSvgX(points[0].x)}
                        y1={toSvgY(points[0].y)}
                        x2={toSvgX(points[1].x)}
                        y2={toSvgY(points[1].y)}
                        stroke={points[0].color}
                        strokeWidth={edgeWidth}
                        strokeLinecap="round"
                    />
                )}

                {points.length >= 3 && (
                    <>
                        {/* Fill only if it's a cube face */}
                        {isFace && (
                            <polygon
                                points={points.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
                                fill={C_Front}
                                opacity={0.5}
                            />
                        )}

                        {/* Colored edges */}
                        {points.map((point, i) => {
                            const nextPoint = points[(i + 1) % points.length]
                            return (
                                <line
                                    key={i}
                                    x1={toSvgX(point.x)}
                                    y1={toSvgY(point.y)}
                                    x2={toSvgX(nextPoint.x)}
                                    y2={toSvgY(nextPoint.y)}
                                    stroke={point.color}
                                    strokeWidth={edgeWidth}
                                    strokeLinecap="round"
                                />
                            )
                        })}
                    </>
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
                    {getStateLabel()}
                </text>
            </svg>
        </div>
    )
}

// Main Scene 4 component - split view
export function Scene4({ z, rotation }: Scene4Props) {
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
                    <Scene4_3DView z={z} rotation={rotation} />
                </Canvas>
            </div>

            {/* Right side - 2D Cross-section */}
            <div style={{ flex: 1, height: '100%' }}>
                <CrossSection2D z={z} rotation={rotation} />
            </div>
        </div>
    )
}

// Scene 4 UI Overlay
interface Scene4UIProps {
    z: number
    setZ: (value: number) => void
    rotation: [number, number, number]
}

export function Scene4UI({ z, setZ, rotation }: Scene4UIProps) {
    const rotDeg = rotation.map(r => Math.round(r * 180 / Math.PI))

    return (
        <>
            <div className="glass-card title-card">
                <h1>Z-Axis Slice Viewer</h1>
                <p>Left: 3D cube with slice plane</p>
                <p>Right: 2D cross-section result</p>
                <p>←→ move cross-section slice on Z-axis</p>
                <p>Z/X A/S Q/W rotate XYZ · R Reset</p>
                <p>Space Bar toggle cube corner slice</p>
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

                <div className="control-group" style={{ marginTop: '10px' }}>
                    <div className="slider-label">
                        <span>Rotation (X, Y, Z)</span>
                        <span className="slider-value">
                            {rotDeg[0]}° {rotDeg[1]}° {rotDeg[2]}°
                        </span>
                    </div>
                </div>
            </div>
        </>
    )
}
