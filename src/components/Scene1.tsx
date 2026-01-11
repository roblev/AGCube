import { useEffect, useMemo } from 'react'
import { Text, Billboard, Environment } from '@react-three/drei'
import { Cube } from './Cube'
import * as THREE from 'three'

interface Scene1Props {
    w: number
    setW: (value: number) => void
    showArrows?: boolean
}

// 6 face centers of the unit cube - these are the targets for arrows
const FACE_CENTERS = [
    [1, 0.5, 0.5],   // +X face
    [0, 0.5, 0.5],   // -X face
    [0.5, 1, 0.5],   // +Y face
    [0.5, 0, 0.5],   // -Y face
    [0.5, 0.5, 1],   // +Z face
    [0.5, 0.5, 0],   // -Z face
]
const CUBE_CENTER = new THREE.Vector3(0.5, 0.5, 0.5)

// Arrow component: cylindrical shaft + ring-based conical head
// Radius shrinks based on w distance from 0.5 using: sqrt(original_radius² - distance²)
// The cone is simulated with stacked rings, each shrinking independently
function Arrow({ from, to, w }: { from: THREE.Vector3, to: THREE.Vector3, w: number }) {
    const direction = new THREE.Vector3().subVectors(to, from)
    const fullLength = direction.length()
    const dirNorm = direction.clone().normalize()

    // Base dimensions at w=0.5
    const baseHeadLength = fullLength * 0.25
    const baseRodRadius = 0.04
    const baseConeRadius = 0.1
    const ringCount = 100 // Number of rings to simulate the cone

    // Calculate distance from w=0.5
    const distFrom05 = Math.abs(w - 0.5)

    // Apply Pythagorean formula for rod
    const rodRadius = Math.sqrt(Math.max(0, baseRodRadius * baseRodRadius - distFrom05 * distFrom05))

    // Check if the largest ring (at cone base) is still visible
    const baseConeRadiusAdjusted = Math.sqrt(Math.max(0, baseConeRadius * baseConeRadius - distFrom05 * distFrom05))
    if (baseConeRadiusAdjusted <= 0) return null

    // Shaft length stays constant at 0.75 of full length
    const shaftLength = fullLength * 0.75

    // Shaft position (centered on shaft)
    const shaftMidpoint = new THREE.Vector3().addVectors(from, dirNorm.clone().multiplyScalar(shaftLength / 2))

    // Cone base position
    const coneBasePos = new THREE.Vector3().addVectors(from, dirNorm.clone().multiplyScalar(shaftLength))

    // Calculate rotation to align with direction
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)

    // Generate disc rings for the cone shape using thin cylinders
    const rings = []
    const discThickness = baseHeadLength / ringCount // Discs touch each other

    for (let i = 0; i < ringCount; i++) {
        // t goes from 0 (base) to 1 (tip)
        const t = (i + 0.5) / ringCount

        // Original cone radius at this position (linear interpolation from base to tip)
        const originalRingRadius = baseConeRadius * (1 - t)

        // Apply Pythagorean formula to this ring's radius
        const adjustedRingRadius = Math.sqrt(Math.max(0, originalRingRadius * originalRingRadius - distFrom05 * distFrom05))

        // Skip this ring if it's too small
        if (adjustedRingRadius <= 0) continue

        // Position along the cone (from base to tip)
        const ringPosition = coneBasePos.clone().add(dirNorm.clone().multiplyScalar(t * baseHeadLength))

        rings.push(
            <mesh key={i} position={ringPosition} rotation={euler} renderOrder={-1}>
                <cylinderGeometry args={[adjustedRingRadius * (1 - 0.5 / ringCount), adjustedRingRadius * (1 + 0.5 / ringCount), discThickness, 24]} />
                <meshStandardMaterial color="white" />
            </mesh>
        )
    }

    return (
        <group>
            {/* Shaft - only render if rod has positive radius */}
            {rodRadius > 0 && (
                <mesh position={shaftMidpoint} rotation={euler} renderOrder={-1}>
                    <cylinderGeometry args={[rodRadius, rodRadius, shaftLength, 8]} />
                    <meshStandardMaterial color="white" />
                </mesh>
            )}
            {/* Ring-based arrowhead */}
            {rings}
        </group>
    )
}

export function Scene1({ w, setW, showArrows = false }: Scene1Props) {
    // Arrow key navigation for w-axis (Scene 1 only)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                e.preventDefault() // Prevent native slider behavior

                if (e.code === 'ArrowLeft') {
                    const newVal = Math.max(-0.5, w - 0.01)
                    setW(Math.round(newVal * 100) / 100)
                } else if (e.code === 'ArrowRight') {
                    const newVal = Math.min(1.5, w + 0.01)
                    setW(Math.round(newVal * 100) / 100)
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [w, setW])

    // Dynamic axis length based on w value
    const { length, center } = useMemo(() => {
        const extendToOrigin = w < 0 || w > 1
        return {
            length: extendToOrigin ? 2.5 : 1.5,
            center: extendToOrigin ? 1.25 : 1.75
        }
    }, [w])

    // Calculate center sphere radius for W dimension representation
    // w=0.2 to 0.8: constant size (rod radius)
    // At w=0.2 and w=0.8: step-change to cone base size
    // w=0 to 0.2: shrinks from cone radius at w=0.2 to 0 at w=0
    // w=0.8 to 1.0: shrinks from cone radius at w=0.8 to 0 at w=1.0
    const centerSphereRadius = useMemo(() => {
        const rodRadius = 0.04
        const coneRadius = 0.1

        if (w <= 0 || w >= 1.0) return 0 // Hidden outside 0-1 range

        if (w > 0.2 && w < 0.8) {
            // Constant at rodRadius in the middle range
            return rodRadius
        } else if (w <= 0.2) {
            // Linear from 0 at w=0 to coneRadius at w=0.2
            return (w / 0.2) * coneRadius
        } else {
            // Linear from coneRadius at w=0.8 to 0 at w=1.0
            return ((1.0 - w) / 0.2) * coneRadius
        }
    }, [w])

    return (
        <>
            {/* Scene 1 specific lights */}
            <pointLight position={[0.5, 0.5, 0.5]} intensity={1.5} distance={5} decay={1} />
            <directionalLight position={[0.5, -2, 0.5]} intensity={0.5} target-position={[0.5, 0, 0.5]} /> {/* Diffuse light below dark green face */}
            <hemisphereLight intensity={0.4} groundColor="#444" />
            <Environment preset="city" />

            {/* Cube */}
            <Cube w={w} />

            {/* Center sphere representing W dimension */}
            {showArrows && centerSphereRadius > 0 && (
                <mesh position={[0.5, 0.5, 0.5]} renderOrder={-1}>
                    <sphereGeometry args={[centerSphereRadius, 24, 24]} />
                    <meshStandardMaterial color="white" />
                </mesh>
            )}

            {/* Arrows from center to face centers */}
            {showArrows && FACE_CENTERS.map((faceCenter, i) => (
                <Arrow
                    key={`arrow-${i}`}
                    from={CUBE_CENTER}
                    to={new THREE.Vector3(faceCenter[0], faceCenter[1], faceCenter[2])}
                    w={w}
                />
            ))}

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
        </>
    )
}

// Scene 1 UI Overlay
interface Scene1UIProps {
    w: number
    setW: (value: number) => void
    showArrows?: boolean
}

export function Scene1UI({ w, setW, showArrows }: Scene1UIProps) {
    return (
        <>
            <div className="glass-card title-card">
                <h1>4D Cube Viewer</h1>
                <p>Left click + drag rotates</p>
                <p>Right click + drag pans</p>
                <p>Scroll zooms</p>
                <p>Arrow keys adjust W-axis</p>
                <p>Space bar slices corner</p>
                <p>A: toggle arrows {showArrows ? '(ON)' : '(OFF)'}</p>
                <p>C: toggle cube colors (at w=0,1)</p>
            </div>

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
                        min="-0.5"
                        max="1.5"
                        step="0.05"
                        value={w}
                        onChange={(e) => setW(parseFloat(e.target.value))}
                        className="custom-slider"
                    />
                </div>
            </div>
        </>
    )
}

