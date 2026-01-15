import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Animation duration for each stage (in seconds)
const ANIMATION_DURATION = 2.0

// Stage names for UI
const STAGE_NAMES = ['Line 1: +∞ → [0,1]', 'Lines 2-3: → 3 segments', 'Line 4: → 4 segments', 'Rotate All', 'Close Square', 'Fill Square']

// Create bump/roughness texture like Scene 1 for metallic panel look
function useScene1Texture() {
    return useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        // Fill with high-contrast noise for visible bump effect
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
}

interface Scene7Props {
    stage: number
    animProgress: number
    setAnimProgress: (value: number) => void
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

export function Scene7({ stage, animProgress: _animProgress, setAnimProgress }: Scene7Props) {
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

            {/* Stage 0: Line 1 animates in from +∞ */}
            {stage === 0 && <Stage0Line progress={effectiveProgress} />}

            {/* Stage 1: Lines 2 & 3 animate in, plus completed Line 1 */}
            {stage === 1 && (
                <>
                    {/* Line 1: already arrived at [0, 1] */}
                    <LineSegment start={[0, 0, 0]} end={[1, 0, 0]} color="#ffcc00" />
                    {/* Lines 2 & 3 animating */}
                    <Stage1Lines progress={effectiveProgress} />
                </>
            )}

            {/* Stage 2: Line 4 animates in, plus all previous lines */}
            {stage === 2 && (
                <>
                    {/* Lines 1-3: already in place */}
                    <LineSegment start={[0, 0, 0]} end={[1, 0, 0]} color="#ffcc00" />
                    <LineSegment start={[-1, 0, 0]} end={[0, 0, 0]} color="#ff6600" />
                    <LineSegment start={[1, 0, 0]} end={[2, 0, 0]} color="#00ff66" />
                    {/* Line 4 animating */}
                    <Stage2Line progress={effectiveProgress} />
                </>
            )}

            {/* Stage 3: All lines rotate around their pivot points */}
            {stage === 3 && <Stage3Rotation progress={effectiveProgress} />}

            {/* Stage 4: Line 4 rotates 90° CCW to close the square */}
            {stage === 4 && <Stage4Rotation progress={effectiveProgress} />}

            {/* Stage 5: Filled solid square */}
            {stage >= 5 && <SolidSquare />}
        </group>
    )
}

// Scene 7 UI Overlay
interface Scene7UIProps {
    stage: number
}

export function Scene7UI({ stage }: Scene7UIProps) {
    return (
        <div className="glass-card title-card">
            <h1>Square from Rotations</h1>
            <p>Stage {stage}: <strong>{STAGE_NAMES[stage] || 'Complete'}</strong></p>
            <p style={{ opacity: 0.6, fontSize: '12px' }}>Space: next stage</p>
        </div>
    )
}
