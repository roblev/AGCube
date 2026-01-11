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

// Arrow component: cylindrical shaft + conical head
// thicknessScale affects radius AND cone height to maintain the same angle
// Cone base stays fixed, cone tip moves inward when scale < 1
function Arrow({ from, to, thicknessScale }: { from: THREE.Vector3, to: THREE.Vector3, thicknessScale: number }) {
    if (thicknessScale <= 0) return null

    const direction = new THREE.Vector3().subVectors(to, from)
    const fullLength = direction.length()
    const dirNorm = direction.clone().normalize()

    // Base dimensions at thicknessScale = 1
    const baseHeadLength = fullLength * 0.25
    const baseRodRadius = 0.03
    const baseConeRadius = 0.08

    // Scale both radius and cone height to maintain angle
    const rodRadius = baseRodRadius * thicknessScale
    const coneRadius = baseConeRadius * thicknessScale
    const headLength = baseHeadLength * thicknessScale  // Scaled so tip moves back

    // Shaft length stays constant at 0.75 of full length
    const shaftLength = fullLength * 0.75

    // Shaft position (centered on shaft)
    const shaftMidpoint = new THREE.Vector3().addVectors(from, dirNorm.clone().multiplyScalar(shaftLength / 2))

    // Cone base stays at the same position (end of shaft = 0.75 of fullLength)
    // Cone is positioned with its base at shaftLength, extending TOWARD the target
    // Three.js cone has origin at center, so position = base + headLength/2
    const coneBasePos = new THREE.Vector3().addVectors(from, dirNorm.clone().multiplyScalar(shaftLength))
    const headPosition = coneBasePos.clone().add(dirNorm.clone().multiplyScalar(headLength / 2))

    // Calculate rotation to align with direction
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)

    return (
        <group>
            {/* Shaft */}
            <mesh position={shaftMidpoint} rotation={euler} renderOrder={-1}>
                <cylinderGeometry args={[rodRadius, rodRadius, shaftLength, 8]} />
                <meshStandardMaterial color="white" />
            </mesh>
            {/* Arrowhead */}
            <mesh position={headPosition} rotation={euler} renderOrder={-1}>
                <coneGeometry args={[coneRadius, headLength, 24]} />
                <meshStandardMaterial color="white" />
            </mesh>
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
                    const newVal = Math.max(-0.5, w - 0.05)
                    setW(Math.round(newVal * 100) / 100)
                } else if (e.code === 'ArrowRight') {
                    const newVal = Math.min(1.5, w + 0.05)
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

    // Calculate arrow thickness scale based on w
    // w=0.5: full thickness (1.0)
    // w=0.45 or w=0.55: 2/3 thickness
    // w=0.4 or w=0.6 and beyond: hidden (0)
    const arrowThicknessScale = useMemo(() => {
        const distFrom05 = Math.abs(w - 0.5)
        if (distFrom05 >= 0.1) return 0 // Gone at 0.4 and 0.6
        if (distFrom05 <= 0.0) return 1 // Full at 0.5
        // At dist=0.05 (w=0.45 or 0.55), scale = 2/3
        // Linear from 1.0 at dist=0 to 0 at dist=0.1
        // But we want 2/3 at dist=0.05, so: 1 - (dist / 0.15)
        // But we want 2/3 at 0.05: scale = 1 - (dist / 0.15)
        // Actually for 2/3 at 0.05: scale = 1 - (distFrom05 / 0.15) clamped to 0
        return Math.max(0, 1 - (distFrom05 / 0.15))
    }, [w])

    // Calculate center sphere radius for W dimension representation
    // Visible for w between 0.05 and 0.95
    // w=0.25 to 0.75: constant = rod diameter (radius 0.03)
    // w=0.2, w=0.8: cone base size (radius 0.08)
    // w=0 to 0.2: fade from 0 to 0.08
    // w=0.8 to 1.0: fade from 0.08 to 0
    const centerSphereRadius = useMemo(() => {
        const rodRadius = 0.03
        const coneRadius = 0.08

        if (w < 0.05 || w > 0.95) return 0 // Outside visible range

        if (w <= 0.2) {
            // Linear from 0 at w=0 to coneRadius at w=0.2
            return (w / 0.2) * coneRadius
        } else if (w <= 0.25) {
            // Linear from coneRadius at w=0.2 to rodRadius at w=0.25
            const t = (w - 0.2) / 0.05
            return coneRadius + t * (rodRadius - coneRadius)
        } else if (w <= 0.75) {
            // Constant at rodRadius
            return rodRadius
        } else if (w <= 0.8) {
            // Linear from rodRadius at w=0.75 to coneRadius at w=0.8
            const t = (w - 0.75) / 0.05
            return rodRadius + t * (coneRadius - rodRadius)
        } else {
            // Linear from coneRadius at w=0.8 to 0 at w=1.0
            const t = (w - 0.8) / 0.2
            return coneRadius * (1 - t)
        }
    }, [w])

    return (
        <>
            {/* Scene 1 specific lights */}
            <pointLight position={[0.5, 0.5, 0.5]} intensity={1.5} distance={5} decay={1} />
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
            {showArrows && arrowThicknessScale > 0 && FACE_CENTERS.map((faceCenter, i) => (
                <Arrow
                    key={`arrow-${i}`}
                    from={CUBE_CENTER}
                    to={new THREE.Vector3(faceCenter[0], faceCenter[1], faceCenter[2])}
                    thicknessScale={arrowThicknessScale}
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
            </div>

            <div className="glass-card">
                <div className="control-group">
                    <div className="slider-label">
                        <span>W-axis value</span>
                        <span className={`slider-value ${Math.abs(w) < 0.05 || Math.abs(w - 1) < 0.05 ? 'highlight' : ''}`}>
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

