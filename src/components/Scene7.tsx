import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Animation duration for each stage (in seconds)
const ANIMATION_DURATION = 2.0

// Stage names for UI
const STAGE_NAMES = ['Ready', 'Line 1: +∞ → [0,1]', 'Lines 2-3: → 3 segments', 'Line 4: → 4 segments', 'Rotate All', 'Close Square', 'Fill Square', 'Add 4 Squares', '6th Square', 'Fold into Cube', 'Close Cube', 'Solid Cube', 'Add 6 Cubes', '8th Cube', 'Fold into Tesseract', 'Close Tesseract']

// Face color for solid square (dark blue - matching Scene 1 back face)
const SQUARE_COLOR = '#00008b'

// Face color for solid cube (dark grey)
const CUBE_COLOR = '#666666'

interface Scene7Props {
    stage: number
    animProgress: number
    setAnimProgress: (value: number) => void
    w: number
    setW: (value: number) => void
}

// Axes component (similar to Scene6 but without the central vertex)
function Axes({ scale = 1 }: { scale?: number }) {
    // All axes go from -1.5 to 3.5
    const axisStart = -1.5 * scale
    const axisEnd = 3.5 * scale
    const axisLength = axisEnd - axisStart
    const axisCenter = (axisStart + axisEnd) / 2
    const axisRadius = 0.015 * scale

    return (
        <group>
            {/* X axis - Red (from -1.5 to 3.5) */}
            <mesh position={[axisCenter, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
                <meshStandardMaterial color="red" transparent opacity={0.5} />
            </mesh>
            {/* Y axis - Green (from -1.5 to 3.5) */}
            <mesh position={[0, axisCenter, 0]}>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
                <meshStandardMaterial color="green" transparent opacity={0.5} />
            </mesh>
            {/* Z axis - Blue (from -1.5 to 3.5) */}
            <mesh position={[0, 0, axisCenter]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
                <meshStandardMaterial color="blue" transparent opacity={0.5} />
            </mesh>

            {/* X/Y/Z letter labels */}
            <Billboard position={[axisEnd + 0.15 * scale, 0, 0]}>
                <Text fontSize={0.2 * scale} color="#ff8888">X</Text>
            </Billboard>
            <Billboard position={[0, axisEnd + 0.15 * scale, 0]}>
                <Text fontSize={0.2 * scale} color="#88ff88">Y</Text>
            </Billboard>
            <Billboard position={[0, 0, axisEnd + 0.15 * scale]}>
                <Text fontSize={0.2 * scale} color="#8888ff">Z</Text>
            </Billboard>

            {/* Number labels along X axis */}
            {[-1, 0, 1, 2, 3].map((x) => (
                <Billboard key={`x-${x}`} position={[x, -0.15, 0]}>
                    <Text fontSize={0.12 * scale} color="white">{x}</Text>
                </Billboard>
            ))}
            {/* Number labels along Y axis */}
            {[-1, 0, 1, 2, 3].filter(y => y !== 0).map((y) => (
                <Billboard key={`y-${y}`} position={[-0.15, y, 0]}>
                    <Text fontSize={0.12 * scale} color="white">{y}</Text>
                </Billboard>
            ))}
            {/* Number labels along Z axis */}
            {[-1, 0, 1, 2, 3].filter(z => z !== 0).map((z) => (
                <Billboard key={`z-${z}`} position={[0, -0.15, z]}>
                    <Text fontSize={0.12 * scale} color="white">{z}</Text>
                </Billboard>
            ))}
        </group>
    )
}

// A line segment with endpoints
function LineSegment({
    start,
    end,
    color = 'white',
    showEndpoints = true
}: {
    start: [number, number, number]
    end: [number, number, number]
    color?: string
    showEndpoints?: boolean
}) {
    const direction = new THREE.Vector3().subVectors(
        new THREE.Vector3(...end),
        new THREE.Vector3(...start)
    )
    const length = direction.length()
    const center: [number, number, number] = [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
        (start[2] + end[2]) / 2
    ]

    // Calculate rotation to align cylinder with line direction
    const axis = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion()
    if (length > 0.001) {
        const normalizedDir = direction.clone().normalize()
        quaternion.setFromUnitVectors(axis, normalizedDir)
    }
    const euler = new THREE.Euler().setFromQuaternion(quaternion)

    if (length < 0.001) return null

    return (
        <group>
            {/* Line cylinder */}
            <mesh position={center} rotation={euler}>
                <cylinderGeometry args={[0.025, 0.025, length, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
            </mesh>
            {/* Endpoints */}
            {showEndpoints && (
                <>
                    <mesh position={start}>
                        <sphereGeometry args={[0.05, 16, 16]} />
                        <meshStandardMaterial color="white" emissive="#444444" />
                    </mesh>
                    <mesh position={end}>
                        <sphereGeometry args={[0.05, 16, 16]} />
                        <meshStandardMaterial color="white" emissive="#444444" />
                    </mesh>
                </>
            )}
        </group>
    )
}

// Stage 0: Line 1 eases in from +∞ to [0,1] on X-axis
function Stage0Line({ progress }: { progress: number }) {
    // Ease out cubic for smooth deceleration as line arrives
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // Line starts far away (simulating infinity at x=10) and arrives at [0,1]
    // The "position" of the line segment is interpolated
    const startInfinity = 10 // Simulated +∞ position
    const finalStart = 0
    const finalEnd = 1

    // Calculate current position: lerp from infinity to final position
    const currentStart = startInfinity + (finalStart - startInfinity) * easedProgress
    const currentEnd = startInfinity + 1 + (finalEnd - (startInfinity + 1)) * easedProgress

    return (
        <LineSegment
            start={[currentStart, 0, 0]}
            end={[currentEnd, 0, 0]}
            color="#ffcc00"
        />
    )
}

// Stage 1: Lines 2 & 3 ease in from both directions → [-1,0,1,2] (3 segments)
// Line 2 comes from -∞ to form [-1, 0]
// Line 3 comes from +∞ to form [1, 2]
function Stage1Lines({ progress }: { progress: number }) {
    // Ease out cubic for smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // Line 2: comes from left (-∞) to [-1, 0]
    const line2StartInfinity = -10
    const line2FinalStart = -1
    const line2FinalEnd = 0
    const line2CurrentStart = line2StartInfinity + (line2FinalStart - line2StartInfinity) * easedProgress
    const line2CurrentEnd = line2StartInfinity + 1 + (line2FinalEnd - (line2StartInfinity + 1)) * easedProgress

    // Line 3: comes from right (+∞) to [1, 2]
    const line3StartInfinity = 10
    const line3FinalStart = 1
    const line3FinalEnd = 2
    const line3CurrentStart = line3StartInfinity + (line3FinalStart - line3StartInfinity) * easedProgress
    const line3CurrentEnd = line3StartInfinity + 1 + (line3FinalEnd - (line3StartInfinity + 1)) * easedProgress

    return (
        <>
            {/* Line 2: [-1, 0] from left */}
            <LineSegment
                start={[line2CurrentStart, 0, 0]}
                end={[line2CurrentEnd, 0, 0]}
                color="#ff6600"
            />
            {/* Line 3: [1, 2] from right */}
            <LineSegment
                start={[line3CurrentStart, 0, 0]}
                end={[line3CurrentEnd, 0, 0]}
                color="#00ff66"
            />
        </>
    )
}

// Stage 2: Line 4 eases in from +∞ → [-1,0,1,2,3] (4 segments)
// Line 4 comes from +∞ to form [2, 3]
function Stage2Line({ progress }: { progress: number }) {
    // Ease out cubic for smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // Line 4: comes from right (+∞) to [2, 3]
    const startInfinity = 10
    const finalStart = 2
    const finalEnd = 3

    const currentStart = startInfinity + (finalStart - startInfinity) * easedProgress
    const currentEnd = startInfinity + 1 + (finalEnd - (startInfinity + 1)) * easedProgress

    return (
        <LineSegment
            start={[currentStart, 0, 0]}
            end={[currentEnd, 0, 0]}
            color="#6666ff"
        />
    )
}

// Helper function to rotate a point CCW around a pivot in the XY plane
function rotatePointCCW(
    point: [number, number, number],
    pivot: [number, number, number],
    angleDegrees: number
): [number, number, number] {
    const angleRad = (angleDegrees * Math.PI) / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    // Translate point to origin
    const dx = point[0] - pivot[0]
    const dy = point[1] - pivot[1]

    // Rotate CCW
    const rotatedX = dx * cos - dy * sin
    const rotatedY = dx * sin + dy * cos

    // Translate back
    return [
        pivot[0] + rotatedX,
        pivot[1] + rotatedY,
        point[2]
    ]
}

// Stage 3: All lines rotate around their pivot points
// Line 1: stays fixed at (0,0) to (1,0)
// Line 2: rotates CLOCKWISE 90° around (0,0) → (0,0) to (0,1)
// Line 3: rotates CCW 90° around (1,0) → (1,0) to (1,1)
// Line 4: rotates CCW 90° around (1,0) → (1,1) to (1,2)
function Stage3Rotation({ progress }: { progress: number }) {
    // Ease in-out for smooth rotation
    const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

    const rotationAngle = easedProgress * 90 // 0 to 90 degrees

    // Line 1: Fixed at bottom (no rotation)
    const line1Start: [number, number, number] = [0, 0, 0]
    const line1End: [number, number, number] = [1, 0, 0]

    // Line 2: Rotates CLOCKWISE around (0,0) - starts at (-1,0) to (0,0)
    // Clockwise = negative angle
    const line2Pivot: [number, number, number] = [0, 0, 0]
    const line2StartInitial: [number, number, number] = [-1, 0, 0]
    const line2Start = rotatePointCCW(line2StartInitial, line2Pivot, -rotationAngle)
    const line2End: [number, number, number] = [0, 0, 0]

    // Line 3: Rotates CCW around (1,0) - starts at (1,0) to (2,0)
    const line3Pivot: [number, number, number] = [1, 0, 0]
    const line3Start: [number, number, number] = [1, 0, 0]
    const line3EndInitial: [number, number, number] = [2, 0, 0]
    const line3End = rotatePointCCW(line3EndInitial, line3Pivot, rotationAngle)

    // Line 4: Rotates CCW around (1,0) - starts at (2,0) to (3,0)
    // Both endpoints rotate around the same pivot as Line 3
    const line4StartInitial: [number, number, number] = [2, 0, 0]
    const line4EndInitial: [number, number, number] = [3, 0, 0]
    const line4Start = rotatePointCCW(line4StartInitial, line3Pivot, rotationAngle)
    const line4End = rotatePointCCW(line4EndInitial, line3Pivot, rotationAngle)

    return (
        <>
            <LineSegment start={line1Start} end={line1End} color="#ffcc00" />
            <LineSegment start={line2Start} end={line2End} color="#ff6600" />
            <LineSegment start={line3Start} end={line3End} color="#00ff66" />
            <LineSegment start={line4Start} end={line4End} color="#6666ff" />
        </>
    )
}

// Stage 4: Line 4 rotates 90° CCW around (1,1) to close the square
// Lines 1-3 stay in their post-Stage-3 positions
// Line 4: rotates CCW 90° around (1,1) → from (1,1)-(1,2) to (1,1)-(0,1)
function Stage4Rotation({ progress }: { progress: number }) {
    // Ease in-out for smooth rotation
    const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

    const rotationAngle = easedProgress * 90 // 0 to 90 degrees CCW

    // Lines 1-3: Fixed in their post-Stage-3 positions
    const line1Start: [number, number, number] = [0, 0, 0]
    const line1End: [number, number, number] = [1, 0, 0]
    const line2Start: [number, number, number] = [0, 0, 0]
    const line2End: [number, number, number] = [0, 1, 0]
    const line3Start: [number, number, number] = [1, 0, 0]
    const line3End: [number, number, number] = [1, 1, 0]

    // Line 4: Rotates CCW around (1,1) - starts at (1,1) to (1,2)
    const line4Pivot: [number, number, number] = [1, 1, 0]
    const line4Start: [number, number, number] = [1, 1, 0]
    const line4EndInitial: [number, number, number] = [1, 2, 0]
    const line4End = rotatePointCCW(line4EndInitial, line4Pivot, rotationAngle)

    return (
        <>
            <LineSegment start={line1Start} end={line1End} color="#ffcc00" />
            <LineSegment start={line2Start} end={line2End} color="#ff6600" />
            <LineSegment start={line3Start} end={line3End} color="#00ff66" />
            <LineSegment start={line4Start} end={line4End} color="#6666ff" />
        </>
    )
}

// Solid filled square with Scene1-style material
function SolidSquare() {
    // Create bump/roughness texture for metallic panel look
    const texture = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4)
        return tex
    }, [])

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: SQUARE_COLOR,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
        transparent: true,
        opacity: 0.9,
    }), [texture])

    return (
        <group>
            {/* Filled square face */}
            <mesh position={[0.5, 0.5, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>

            {/* Edge lines */}
            {/* Bottom edge */}
            <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.015, 0.015, 1, 8]} />
                <meshStandardMaterial color="#ffcc00" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Top edge */}
            <mesh position={[0.5, 1, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.015, 0.015, 1, 8]} />
                <meshStandardMaterial color="#6666ff" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Left edge */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 1, 8]} />
                <meshStandardMaterial color="#ff6600" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Right edge */}
            <mesh position={[1, 0.5, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 1, 8]} />
                <meshStandardMaterial color="#00ff66" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Corner vertices */}
            {[
                [0, 0, 0], [1, 0, 0],
                [0, 1, 0], [1, 1, 0]
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshStandardMaterial color="white" emissive="#444444" metalness={0.6} roughness={0.3} />
                </mesh>
            ))}
        </group>
    )
}

// A single solid square at a given position
function PositionedSquare({ position, color }: { position: [number, number, number], color: string }) {
    const texture = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4)
        return tex
    }, [])

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
        transparent: true,
        opacity: 0.9,
    }), [texture, color])

    return (
        <group position={position}>
            {/* Filled square face */}
            <mesh position={[0.5, 0.5, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>

            {/* Edge lines */}
            <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                <meshStandardMaterial color="white" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0.5, 1, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                <meshStandardMaterial color="white" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                <meshStandardMaterial color="white" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[1, 0.5, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                <meshStandardMaterial color="white" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Corner vertices */}
            {[
                [0, 0, 0], [1, 0, 0],
                [0, 1, 0], [1, 1, 0]
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                    <sphereGeometry args={[0.04, 16, 16]} />
                    <meshStandardMaterial color="white" emissive="#444444" metalness={0.6} roughness={0.3} />
                </mesh>
            ))}
        </group>
    )
}

// Stage 6: 4 squares easing in from infinity, each touching a side of the central square
function Stage6Squares({ progress }: { progress: number }) {
    // Ease out cubic for smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // Distance from infinity (starts at 10, ends at 0)
    const offset = 10 * (1 - easedProgress)

    // Final positions for each square (corner positions):
    // +X square: (1, 0) to (2, 1) - touching right side
    // -X square: (-1, 0) to (0, 1) - touching left side
    // +Y square: (0, 1) to (1, 2) - touching top side
    // -Y square: (0, -1) to (1, 0) - touching bottom side

    return (
        <>
            {/* Central square stays in place */}
            <SolidSquare />

            {/* +X square easing from right */}
            <PositionedSquare position={[1 + offset, 0, 0]} color="#f39494" />

            {/* -X square easing from left */}
            <PositionedSquare position={[-1 - offset, 0, 0]} color="#c40707" />

            {/* +Y square easing from top */}
            <PositionedSquare position={[0, 1 + offset, 0]} color="#57f157" />

            {/* -Y square easing from bottom */}
            <PositionedSquare position={[0, -1 - offset, 0]} color="#048004" />
        </>
    )
}

// Stage 7: 6th square easing from +X to position (2,0)-(3,1)
function Stage7Square({ progress }: { progress: number }) {
    // Ease out cubic for smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // Distance from infinity (starts at 10, ends at 0)
    const offset = 10 * (1 - easedProgress)

    return (
        <>
            {/* All 5 squares from Stage 6 stay in place */}
            <SolidSquare />
            <PositionedSquare position={[1, 0, 0]} color="#f39494" />
            <PositionedSquare position={[-1, 0, 0]} color="#c40707" />
            <PositionedSquare position={[0, 1, 0]} color="#57f157" />
            <PositionedSquare position={[0, -1, 0]} color="#048004" />

            {/* 6th square easing from +X to (2,0)-(3,1) */}
            <PositionedSquare position={[2 + offset, 0, 0]} color="#7185f1" />
        </>
    )
}

// A rotating square that folds about an axis
function RotatingSquare({
    basePosition,
    pivotOffset,
    rotationAxis,
    angle,
    color
}: {
    basePosition: [number, number, number]
    pivotOffset: [number, number, number]
    rotationAxis: 'x' | 'y'
    angle: number
    color: string
}) {
    const texture = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4)
        return tex
    }, [])

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
        transparent: true,
        opacity: 0.9,
    }), [texture, color])

    const angleRad = (angle * Math.PI) / 180
    const rotation: [number, number, number] = rotationAxis === 'x'
        ? [angleRad, 0, 0]
        : [0, -angleRad, 0]

    return (
        <group position={basePosition}>
            <group position={pivotOffset} rotation={rotation}>
                <group position={[-pivotOffset[0], -pivotOffset[1], -pivotOffset[2]]}>
                    {/* Filled square face */}
                    <mesh position={[0.5, 0.5, 0]} material={material}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>

                    {/* Edge lines */}
                    <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                        <meshStandardMaterial color="white" metalness={0.6} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.5, 1, 0]} rotation={[0, 0, -Math.PI / 2]}>
                        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                        <meshStandardMaterial color="white" metalness={0.6} roughness={0.3} />
                    </mesh>
                    <mesh position={[0, 0.5, 0]}>
                        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                        <meshStandardMaterial color="white" metalness={0.6} roughness={0.3} />
                    </mesh>
                    <mesh position={[1, 0.5, 0]}>
                        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                        <meshStandardMaterial color="white" metalness={0.6} roughness={0.3} />
                    </mesh>

                    {/* Corner vertices */}
                    {[
                        [0, 0, 0], [1, 0, 0],
                        [0, 1, 0], [1, 1, 0]
                    ].map((pos, i) => (
                        <mesh key={i} position={pos as [number, number, number]}>
                            <sphereGeometry args={[0.04, 16, 16]} />
                            <meshStandardMaterial color="white" emissive="#444444" metalness={0.6} roughness={0.3} />
                        </mesh>
                    ))}
                </group>
            </group>
        </group>
    )
}

// Stage 8: All 5 surrounding squares fold 90° into Z-axis
function Stage8Rotation({ progress }: { progress: number }) {
    // Ease in-out for smooth rotation
    const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

    const rotationAngle = easedProgress * 90 // 0 to 90 degrees

    return (
        <>
            {/* Central square stays flat */}
            <SolidSquare />

            {/* +X square at (1,0)-(2,1): rotates about X=1 line (left edge) */}
            <RotatingSquare
                basePosition={[1, 0, 0]}
                pivotOffset={[0, 0.5, 0]}
                rotationAxis="y"
                angle={rotationAngle}
                color="#f39494"
            />

            {/* -X square at (-1,0)-(0,1): rotates about X=0 line (right edge) */}
            <RotatingSquare
                basePosition={[-1, 0, 0]}
                pivotOffset={[1, 0.5, 0]}
                rotationAxis="y"
                angle={-rotationAngle}
                color="#c40707"
            />

            {/* +Y square at (0,1)-(1,2): rotates about Y=1 line (bottom edge) into +Z */}
            <RotatingSquare
                basePosition={[0, 1, 0]}
                pivotOffset={[0.5, 0, 0]}
                rotationAxis="x"
                angle={rotationAngle}
                color="#57f157"
            />

            {/* -Y square at (0,-1)-(1,0): rotates about Y=0 line (top edge) into +Z */}
            <RotatingSquare
                basePosition={[0, -1, 0]}
                pivotOffset={[0.5, 1, 0]}
                rotationAxis="x"
                angle={-rotationAngle}
                color="#048004"
            />

            {/* 6th square at (2,0)-(3,1): rotates about X=1 line */}
            <RotatingSquare
                basePosition={[2, 0, 0]}
                pivotOffset={[-1, 0.5, 0]}
                rotationAxis="y"
                angle={rotationAngle}
                color="#7185f1"
            />
        </>
    )
}

// Stage 9: Final square rotates 90° more to close the cube
// After Stage 8, the 6th square is in the XZ plane at x=1, z=0 to z=1
// It needs to rotate 90° about the line (x=1, z=1) to become the top face
function Stage9Rotation({ progress }: { progress: number }) {
    // Ease in-out for smooth rotation
    const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

    const rotationAngle = easedProgress * 90 // 0 to 90 degrees

    return (
        <>
            {/* Central square stays flat (bottom face) */}
            <SolidSquare />

            {/* +X square: already folded 90° into Z (now at z=0 to z=1, x=1) */}
            <RotatingSquare
                basePosition={[1, 0, 0]}
                pivotOffset={[0, 0.5, 0]}
                rotationAxis="y"
                angle={90}
                color="#f39494"
            />

            {/* -X square: already folded 90° into Z (now at z=0 to z=1, x=0) */}
            <RotatingSquare
                basePosition={[-1, 0, 0]}
                pivotOffset={[1, 0.5, 0]}
                rotationAxis="y"
                angle={-90}
                color="#c40707"
            />

            {/* +Y square: already folded 90° into Z (now at z=0 to z=1, y=1) */}
            <RotatingSquare
                basePosition={[0, 1, 0]}
                pivotOffset={[0.5, 0, 0]}
                rotationAxis="x"
                angle={90}
                color="#57f157"
            />

            {/* -Y square: already folded 90° into Z (now at z=0 to z=1, y=0) */}
            <RotatingSquare
                basePosition={[0, -1, 0]}
                pivotOffset={[0.5, 1, 0]}
                rotationAxis="x"
                angle={-90}
                color="#048004"
            />

            {/* 6th square: rotates from XZ plane (after 90° from Stage 8) to XY plane at z=1 */}
            {/* After Stage 8 it's at: x=1 to x=2, z=0 to z=1 (in XZ plane) */}
            {/* It needs to fold onto z=1 plane, rotating about the Y-axis line at x=1, z=1 */}
            <group position={[1, 0, 1]}>
                <group rotation={[0, -rotationAngle * Math.PI / 180, 0]}>
                    <group position={[-1, 0, -1]}>
                        <RotatingSquare
                            basePosition={[2, 0, 0]}
                            pivotOffset={[-1, 0.5, 0]}
                            rotationAxis="y"
                            angle={90}
                            color="#7185f1"
                        />
                    </group>
                </group>
            </group>
        </>
    )
}

// Solid cube with metallic material - single color, no edges or vertices
function SolidCube() {
    const texture = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4)
        return tex
    }, [])

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: CUBE_COLOR,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
    }), [texture])

    // Cube faces: centered at (0.5, 0.5, 0.5) with size 1
    return (
        <group>
            {/* Bottom face (z=0) */}
            <mesh position={[0.5, 0.5, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Top face (z=1) */}
            <mesh position={[0.5, 0.5, 1]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Front face (y=0) */}
            <mesh position={[0.5, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Back face (y=1) */}
            <mesh position={[0.5, 1, 0.5]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Left face (x=0) */}
            <mesh position={[0, 0.5, 0.5]} rotation={[0, -Math.PI / 2, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Right face (x=1) */}
            <mesh position={[1, 0.5, 0.5]} rotation={[0, Math.PI / 2, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
        </group>
    )
}

// A positioned cube at a given offset
function PositionedCube({ position, color }: { position: [number, number, number], color: string }) {
    const texture = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4)
        return tex
    }, [])

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
    }), [texture, color])

    return (
        <group position={position}>
            {/* Bottom face (z=0) */}
            <mesh position={[0.5, 0.5, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Top face (z=1) */}
            <mesh position={[0.5, 0.5, 1]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Front face (y=0) */}
            <mesh position={[0.5, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Back face (y=1) */}
            <mesh position={[0.5, 1, 0.5]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Left face (x=0) */}
            <mesh position={[0, 0.5, 0.5]} rotation={[0, -Math.PI / 2, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Right face (x=1) */}
            <mesh position={[1, 0.5, 0.5]} rotation={[0, Math.PI / 2, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
        </group>
    )
}

// Stage 11: 6 cubes ease in from infinity to touch each face
function Stage11Cubes({ progress }: { progress: number }) {
    // Ease out cubic for smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // Distance from infinity (starts at 10, ends at 0)
    const offset = 10 * (1 - easedProgress)

    return (
        <>
            {/* Central cube stays in place */}
            <SolidCube />

            {/* +X cube easing from right */}
            <PositionedCube position={[1 + offset, 0, 0]} color="#f39494" />

            {/* -X cube easing from left */}
            <PositionedCube position={[-1 - offset, 0, 0]} color="#c40707" />

            {/* +Y cube easing from back */}
            <PositionedCube position={[0, 1 + offset, 0]} color="#57f157" />

            {/* -Y cube easing from front */}
            <PositionedCube position={[0, -1 - offset, 0]} color="#048004" />

            {/* +Z cube easing from top */}
            <PositionedCube position={[0, 0, 1 + offset]} color="#7185f1" />

            {/* -Z cube easing from bottom */}
            <PositionedCube position={[0, 0, -1 - offset]} color="#00008b" />
        </>
    )
}

// Stage 12: 8th cube easing from +X to position (2,0,0)-(3,1,1)
// Only shows cubes when w=0, blank for all other w values
function Stage12Cube({ progress, w }: { progress: number, w: number }) {
    // Ease out cubic for smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // Distance from infinity (starts at 10, ends at 0)
    const offset = 10 * (1 - easedProgress)

    // Only show cubes when w is exactly 0
    const showCubes = Math.abs(w - 0) < 0.01

    if (!showCubes) return null

    return (
        <>
            {/* All 7 cubes from Stage 11 stay in place */}
            <SolidCube />
            <PositionedCube position={[1, 0, 0]} color="#f39494" />
            <PositionedCube position={[-1, 0, 0]} color="#c40707" />
            <PositionedCube position={[0, 1, 0]} color="#57f157" />
            <PositionedCube position={[0, -1, 0]} color="#048004" />
            <PositionedCube position={[0, 0, 1]} color="#7185f1" />
            <PositionedCube position={[0, 0, -1]} color="#00008b" />

            {/* 8th cube easing from +X to (2,0,0)-(3,1,1) */}
            <PositionedCube position={[2 + offset, 0, 0]} color="#eeeeee" />
        </>
    )
}

// A cube that can be "rotated" into the W dimension
// This is visualized by translating/morphing the cube
function WRotatingCube({
    basePosition,
    rotationAxis,
    angle,
    color
}: {
    basePosition: [number, number, number]
    rotationAxis: 'x' | 'y' | 'z'
    angle: number // 0 to 90
    color: string
}) {
    const texture = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4)
        return tex
    }, [])

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
        transparent: true,
        opacity: 0.9,
    }), [texture, color])

    // As the cube rotates into W, we simulate this by:
    // 1. Shrinking along the rotation axis
    // 2. Moving toward the central cube
    const progress = angle / 90 // 0 to 1
    const scale = 1 - progress // Shrink to 0 as it rotates into W

    // Calculate position offset - move toward center as it rotates
    let position: [number, number, number] = [...basePosition]
    let scaleVec: [number, number, number] = [1, 1, 1]

    if (rotationAxis === 'x') {
        position[0] = basePosition[0] * (1 - progress)
        scaleVec = [scale, 1, 1]
    } else if (rotationAxis === 'y') {
        position[1] = basePosition[1] * (1 - progress)
        scaleVec = [1, scale, 1]
    } else {
        position[2] = basePosition[2] * (1 - progress)
        scaleVec = [1, 1, scale]
    }

    if (scale < 0.01) return null // Don't render when fully rotated

    return (
        <group position={position} scale={scaleVec}>
            {/* Bottom face (z=0) */}
            <mesh position={[0.5, 0.5, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Top face (z=1) */}
            <mesh position={[0.5, 0.5, 1]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Front face (y=0) */}
            <mesh position={[0.5, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Back face (y=1) */}
            <mesh position={[0.5, 1, 0.5]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Left face (x=0) */}
            <mesh position={[0, 0.5, 0.5]} rotation={[0, -Math.PI / 2, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Right face (x=1) */}
            <mesh position={[1, 0.5, 0.5]} rotation={[0, Math.PI / 2, 0]} material={material}>
                <planeGeometry args={[1, 1]} />
            </mesh>
        </group>
    )
}

// Stage 13: All 7 surrounding cubes fold 90° into W-axis to form tesseract
// Shows cubes based on w value - as cubes fold into W, they appear at different w values
function Stage13Rotation({ progress, w }: { progress: number, w: number }) {
    // Ease in-out for smooth rotation
    const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

    const rotationAngle = easedProgress * 90 // 0 to 90 degrees

    // Create bump texture for metallic look
    const texture = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4)
        return tex
    }, [])

    // Face colors matching the folding cubes
    const faceColors = {
        right: '#f39494',   // +X: light red
        left: '#c40707',    // -X: dark red  
        top: '#57f157',     // +Y: light green
        bottom: '#048004',  // -Y: dark green
        front: '#7185f1',   // +Z: light blue
        back: '#00008b',    // -Z: dark blue
    }

    // Create materials for each face
    const createMaterial = (color: string, opacity: number = 0.9) => new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
        transparent: true,
        opacity,
    })

    // Render colored cube with 6 faces (for w between 0 and 1)
    const renderColoredCube = () => (
        <group>
            {/* Bottom face (z=0) - dark blue */}
            <mesh position={[0.5, 0.5, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.back).clone()} />
            </mesh>
            {/* Top face (z=1) - light blue */}
            <mesh position={[0.5, 0.5, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.front).clone()} />
            </mesh>
            {/* Front face (y=0) - dark green */}
            <mesh position={[0.5, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.bottom).clone()} />
            </mesh>
            {/* Back face (y=1) - light green */}
            <mesh position={[0.5, 1, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.top).clone()} />
            </mesh>
            {/* Left face (x=0) - dark red */}
            <mesh position={[0, 0.5, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.left).clone()} />
            </mesh>
            {/* Right face (x=1) - light red */}
            <mesh position={[1, 0.5, 0.5]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.right).clone()} />
            </mesh>
        </group>
    )

    // Render single light grey face in +X position (for w between 1 and 2) - transparent like other faces
    const renderGreyFace = () => (
        <group>
            {/* Single light grey face at x=1 position (where light red face was) */}
            <mesh position={[1, 0.5, 0.5]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial('#eeeeee', 0.9).clone()} />
            </mesh>
        </group>
    )

    // Determine what to show based on w value
    const showAtW0 = Math.abs(w - 0) < 0.01
    const showBetween0And1 = w > 0.01 && w < 0.99
    const showBetween1And2 = w >= 0.99 && w < 2

    return (
        <>
            {/* At w=0: Show central cube with folding animation */}
            {showAtW0 && (
                <>
                    <SolidCube />

                    {/* +X cube: folds into W about x=1 */}
                    <WRotatingCube
                        basePosition={[1, 0, 0]}
                        rotationAxis="x"
                        angle={rotationAngle}
                        color="#f39494"
                    />

                    {/* -X cube: folds into W about x=0 */}
                    <WRotatingCube
                        basePosition={[-1, 0, 0]}
                        rotationAxis="x"
                        angle={rotationAngle}
                        color="#c40707"
                    />

                    {/* +Y cube: folds into W about y=1 */}
                    <WRotatingCube
                        basePosition={[0, 1, 0]}
                        rotationAxis="y"
                        angle={rotationAngle}
                        color="#57f157"
                    />

                    {/* -Y cube: folds into W about y=0 */}
                    <WRotatingCube
                        basePosition={[0, -1, 0]}
                        rotationAxis="y"
                        angle={rotationAngle}
                        color="#048004"
                    />

                    {/* +Z cube: folds into W about z=1 */}
                    <WRotatingCube
                        basePosition={[0, 0, 1]}
                        rotationAxis="z"
                        angle={rotationAngle}
                        color="#7185f1"
                    />

                    {/* -Z cube: folds into W about z=0 */}
                    <WRotatingCube
                        basePosition={[0, 0, -1]}
                        rotationAxis="z"
                        angle={rotationAngle}
                        color="#00008b"
                    />

                    {/* 8th cube: folds into W about x=1 (like +X cube) */}
                    <WRotatingCube
                        basePosition={[2, 0, 0]}
                        rotationAxis="x"
                        angle={rotationAngle}
                        color="#eeeeee"
                    />
                </>
            )}

            {/* Between w=0 and w=1: Show colored cube similar to Scene 1 */}
            {showBetween0And1 && renderColoredCube()}

            {/* Between w=1 and w=2: Show only light grey face at +X position */}
            {showBetween1And2 && renderGreyFace()}
        </>
    )
}

// Stage 14: Closed tesseract - shows completed tesseract structure
// At w=0: colored cube, at w=1: light grey solid cube, w>1: blank
function Stage14Complete({ w }: { w: number }) {
    // Create bump texture for metallic look
    const texture = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4)
        return tex
    }, [])

    // Face colors matching the folding cubes
    const faceColors = {
        right: '#f39494',   // +X: light red
        left: '#c40707',    // -X: dark red  
        top: '#57f157',     // +Y: light green
        bottom: '#048004',  // -Y: dark green
        front: '#7185f1',   // +Z: light blue
        back: '#00008b',    // -Z: dark blue
    }

    // Create material for a face
    const createMaterial = (color: string, opacity: number = 0.9) => new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
        transparent: opacity < 1,
        opacity,
    })

    // Light grey solid cube material
    const greyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#eeeeee',
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
    }), [texture])

    // Render colored cube with 6 faces (for w between 0 and 1)
    const renderColoredCube = () => (
        <group>
            {/* Bottom face (z=0) - dark blue */}
            <mesh position={[0.5, 0.5, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.back).clone()} />
            </mesh>
            {/* Top face (z=1) - light blue */}
            <mesh position={[0.5, 0.5, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.front).clone()} />
            </mesh>
            {/* Front face (y=0) - dark green */}
            <mesh position={[0.5, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.bottom).clone()} />
            </mesh>
            {/* Back face (y=1) - light green */}
            <mesh position={[0.5, 1, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.top).clone()} />
            </mesh>
            {/* Left face (x=0) - dark red */}
            <mesh position={[0, 0.5, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.left).clone()} />
            </mesh>
            {/* Right face (x=1) - light red */}
            <mesh position={[1, 0.5, 0.5]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...createMaterial(faceColors.right).clone()} />
            </mesh>
        </group>
    )

    // Render solid light grey cube (for w = 1)
    const renderGreyCube = () => (
        <group>
            {/* Bottom face (z=0) */}
            <mesh position={[0.5, 0.5, 0]} material={greyMaterial}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Top face (z=1) */}
            <mesh position={[0.5, 0.5, 1]} material={greyMaterial}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Front face (y=0) */}
            <mesh position={[0.5, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={greyMaterial}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Back face (y=1) */}
            <mesh position={[0.5, 1, 0.5]} rotation={[-Math.PI / 2, 0, 0]} material={greyMaterial}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Left face (x=0) */}
            <mesh position={[0, 0.5, 0.5]} rotation={[0, -Math.PI / 2, 0]} material={greyMaterial}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Right face (x=1) */}
            <mesh position={[1, 0.5, 0.5]} rotation={[0, Math.PI / 2, 0]} material={greyMaterial}>
                <planeGeometry args={[1, 1]} />
            </mesh>
        </group>
    )

    // Determine what to show based on w value
    const showAtW0 = Math.abs(w - 0) < 0.01
    const showBetween0And1 = w > 0.01 && w < 0.99
    const showAtW1 = Math.abs(w - 1) < 0.01

    // w > 1 shows nothing (blank)
    if (w > 1.01) return null

    return (
        <>
            {/* At w=0: Show colored cube (central cube of tesseract) */}
            {showAtW0 && <SolidCube />}

            {/* Between w=0 and w=1: Show colored cube similar to Scene 1 */}
            {showBetween0And1 && renderColoredCube()}

            {/* At w=1: Show solid light grey cube (the 8th cube that closed the tesseract) */}
            {showAtW1 && renderGreyCube()}
        </>
    )
}

export function Scene7({ stage, animProgress: _animProgress, setAnimProgress, w }: Scene7Props) {
    const groupRef = useRef<THREE.Group>(null)
    const lastStageRef = useRef(stage)
    const localProgressRef = useRef(0)

    // When stage changes, reset local progress
    if (stage !== lastStageRef.current) {
        localProgressRef.current = 0
        lastStageRef.current = stage
    }

    // Animation loop
    useFrame((_, delta) => {
        // Animate progress from 0 to 1
        if (localProgressRef.current < 1) {
            localProgressRef.current = Math.min(1, localProgressRef.current + delta / ANIMATION_DURATION)
            // Sync to external state for UI display
            setAnimProgress(localProgressRef.current)
        }
    })

    const effectiveProgress = localProgressRef.current

    return (
        <group ref={groupRef}>
            {/* Scene lighting */}
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <directionalLight position={[-3, -3, 2]} intensity={0.3} />
            <hemisphereLight intensity={0.5} groundColor="#444" />
            <Environment preset="city" />

            {/* Axes */}
            <Axes scale={1} />

            {/* Stage 0: Blank - waiting for spacebar */}
            {/* (No content rendered for stage 0) */}

            {/* Stage 1: Line 1 animates in from +∞ */}
            {stage === 1 && <Stage0Line progress={effectiveProgress} />}

            {/* Stage 2: Lines 2 & 3 animate in, plus completed Line 1 */}
            {stage === 2 && (
                <>
                    {/* Line 1: already arrived at [0, 1] */}
                    <LineSegment start={[0, 0, 0]} end={[1, 0, 0]} color="#ffcc00" />
                    {/* Lines 2 & 3 animating */}
                    <Stage1Lines progress={effectiveProgress} />
                </>
            )}

            {/* Stage 3: Line 4 animates in, plus all previous lines */}
            {stage === 3 && (
                <>
                    {/* Lines 1-3: already in place */}
                    <LineSegment start={[0, 0, 0]} end={[1, 0, 0]} color="#ffcc00" />
                    <LineSegment start={[-1, 0, 0]} end={[0, 0, 0]} color="#ff6600" />
                    <LineSegment start={[1, 0, 0]} end={[2, 0, 0]} color="#00ff66" />
                    {/* Line 4 animating */}
                    <Stage2Line progress={effectiveProgress} />
                </>
            )}

            {/* Stage 4: All lines rotate around their pivot points */}
            {stage === 4 && <Stage3Rotation progress={effectiveProgress} />}

            {/* Stage 5: Line 4 rotates 90° CCW to close the square */}
            {stage === 5 && <Stage4Rotation progress={effectiveProgress} />}

            {/* Stage 6: Solid filled square */}
            {stage === 6 && <SolidSquare />}

            {/* Stage 7: 4 squares easing in from infinity */}
            {stage === 7 && <Stage6Squares progress={effectiveProgress} />}

            {/* Stage 8: 6th square easing from +X */}
            {stage === 8 && <Stage7Square progress={effectiveProgress} />}

            {/* Stage 9: All squares fold into Z-axis forming cube */}
            {stage === 9 && <Stage8Rotation progress={effectiveProgress} />}

            {/* Stage 10: Final square rotates to close the cube */}
            {stage === 10 && <Stage9Rotation progress={effectiveProgress} />}

            {/* Stage 11: Solid single-color cube */}
            {stage === 11 && <SolidCube />}

            {/* Stage 12: 6 cubes ease in from infinity */}
            {stage === 12 && <Stage11Cubes progress={effectiveProgress} />}

            {/* Stage 13: 8th cube easing from +X */}
            {stage === 13 && <Stage12Cube progress={effectiveProgress} w={w} />}

            {/* Stage 14: Cubes fold into W-axis forming tesseract */}
            {stage === 14 && <Stage13Rotation progress={effectiveProgress} w={w} />}

            {/* Stage 15: Closed tesseract - light grey cube at w=1, blank for w>1 */}
            {stage >= 15 && <Stage14Complete w={w} />}
        </group>
    )
}

// Scene 7 UI Overlay
interface Scene7UIProps {
    stage: number
    w: number
    setW: (value: number) => void
}

export function Scene7UI({ stage, w, setW }: Scene7UIProps) {
    return (
        <>
            <div className="glass-card title-card">
                <h1>Point to Tesseract</h1>
                <p>Stage {stage}: <strong>{STAGE_NAMES[stage] || 'Complete'}</strong></p>
                <p style={{ opacity: 0.6, fontSize: '12px' }}>Space: next stage</p>
                {stage >= 13 && <p style={{ opacity: 0.6, fontSize: '12px' }}>Arrow keys: adjust W-axis</p>}
            </div>

            {/* W-axis slider (only shown for stage >= 13) */}
            {stage >= 13 && (
                <div className="glass-card">
                    <div className="control-group">
                        <div className="slider-label">
                            <span>W-axis value</span>
                            <span className={`slider-value ${w === 0 || w === 1 ? 'highlight' : ''}`}>
                                {w.toFixed(2)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="-1"
                            max="3"
                            step="0.05"
                            value={w}
                            onChange={(e) => setW(parseFloat(e.target.value))}
                            className="custom-slider"
                        />
                    </div>
                </div>
            )}
        </>
    )
}
