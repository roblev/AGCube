import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Tesseract (4D hypercube) vertices - 16 corners at ±1 in each of 4 dimensions
const TESSERACT_VERTICES_4D: [number, number, number, number][] = []
for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
        for (const z of [-1, 1]) {
            for (const w of [-1, 1]) {
                TESSERACT_VERTICES_4D.push([x, y, z, w])
            }
        }
    }
}

// Tesseract edges - connect vertices that differ in exactly one coordinate
const TESSERACT_EDGES: [number, number][] = []
for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
        let diff = 0
        for (let k = 0; k < 4; k++) {
            if (TESSERACT_VERTICES_4D[i][k] !== TESSERACT_VERTICES_4D[j][k]) diff++
        }
        if (diff === 1) {
            TESSERACT_EDGES.push([i, j])
        }
    }
}

// Rotation mode labels
export const ROTATION_MODES = [
    { xw: true, yw: false, zw: false, label: 'XW only' },
    { xw: false, yw: true, zw: false, label: 'YW only' },
    { xw: false, yw: false, zw: true, label: 'ZW only' },
    { xw: true, yw: true, zw: false, label: 'XW + YW' },
    { xw: true, yw: false, zw: true, label: 'XW + ZW' },
    { xw: false, yw: true, zw: true, label: 'YW + ZW' },
    { xw: true, yw: true, zw: true, label: 'XW + YW + ZW' },
]

// 4D rotation matrix (rotation in XW plane)
function rotateXW(v: [number, number, number, number], angle: number): [number, number, number, number] {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return [
        v[0] * cos - v[3] * sin,
        v[1],
        v[2],
        v[0] * sin + v[3] * cos
    ]
}

// 4D rotation matrix (rotation in YW plane)
function rotateYW(v: [number, number, number, number], angle: number): [number, number, number, number] {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return [
        v[0],
        v[1] * cos - v[3] * sin,
        v[2],
        v[1] * sin + v[3] * cos
    ]
}

// 4D rotation matrix (rotation in ZW plane)
function rotateZW(v: [number, number, number, number], angle: number): [number, number, number, number] {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return [
        v[0],
        v[1],
        v[2] * cos - v[3] * sin,
        v[2] * sin + v[3] * cos
    ]
}

// Project 4D to 3D using perspective projection
function project4Dto3D(v: [number, number, number, number], distance: number = 2): THREE.Vector3 {
    const w = 1 / (distance - v[3])
    return new THREE.Vector3(v[0] * w, v[1] * w, v[2] * w)
}

interface Scene2Props {
    rotationMode: number
    isPaused: boolean
    resetTrigger: number
}

export function Scene2({ rotationMode, isPaused, resetTrigger }: Scene2Props) {
    const groupRef = useRef<THREE.Group>(null)
    const angleRef = useRef({ xw: 0, yw: 0, zw: 0 })

    // Reset angles when resetTrigger changes
    useEffect(() => {
        angleRef.current = { xw: 0, yw: 0, zw: 0 }
    }, [resetTrigger])

    // Memoize materials
    const nodeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00ffff',
        emissive: '#004444',
        roughness: 0.3,
        metalness: 0.8
    }), [])

    const edgeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.6,
        roughness: 0.5
    }), [])

    const nodeGeometry = useMemo(() => new THREE.SphereGeometry(0.08, 16, 16), [])

    // Animation state
    const nodesRef = useRef<THREE.Mesh[]>([])
    const edgesRef = useRef<THREE.Mesh[]>([])

    // Base sizes (these will be scaled by camera distance)
    const BASE_NODE_SIZE = 0.012  // Base sphere radius
    const BASE_ROD_THICKNESS = 0.004  // Base cylinder radius

    useFrame((state, delta) => {
        const mode = ROTATION_MODES[rotationMode]

        // Only update rotation angles if not paused
        if (!isPaused) {
            if (mode.xw) angleRef.current.xw += delta * 0.5
            if (mode.yw) angleRef.current.yw += delta * 0.3
            if (mode.zw) angleRef.current.zw += delta * 0.4
        }

        // Calculate camera distance for size scaling
        const cameraDistance = state.camera.position.length()
        const sizeScale = cameraDistance

        // Calculate rotated and projected vertices
        const projectedVertices: THREE.Vector3[] = TESSERACT_VERTICES_4D.map(v => {
            let rotated = v
            if (mode.xw) rotated = rotateXW(rotated, angleRef.current.xw)
            if (mode.yw) rotated = rotateYW(rotated, angleRef.current.yw)
            if (mode.zw) rotated = rotateZW(rotated, angleRef.current.zw)
            return project4Dto3D(rotated, 4) // Smaller distance = stronger perspective
        })

        // Update node positions and scale
        nodesRef.current.forEach((node, i) => {
            if (node && projectedVertices[i]) {
                node.position.copy(projectedVertices[i])
                // Scale uniformly to maintain fixed visual size
                const nodeScale = BASE_NODE_SIZE * sizeScale
                node.scale.setScalar(nodeScale / 0.08) // Divide by geometry's base radius
            }
        })

        // Update edge positions, orientations, and thickness
        edgesRef.current.forEach((edge, i) => {
            if (edge) {
                const [a, b] = TESSERACT_EDGES[i]
                const start = projectedVertices[a]
                const end = projectedVertices[b]

                // Position at midpoint
                edge.position.lerpVectors(start, end, 0.5)

                // Scale: X and Z for thickness (fixed visual), Y for length (adapts)
                const distance = start.distanceTo(end)
                const thicknessScale = (BASE_ROD_THICKNESS * sizeScale) / 0.02 // Divide by geometry's base radius
                edge.scale.set(thicknessScale, distance, thicknessScale)

                // Orient towards end point
                edge.lookAt(end)
                edge.rotateX(Math.PI / 2)
            }
        })
    })

    return (
        <group ref={groupRef}>
            {/* Lighting for Scene 2 */}
            <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
            <pointLight position={[-5, -5, -5]} intensity={0.5} color="#0088ff" />

            {/* Nodes (vertices) */}
            {TESSERACT_VERTICES_4D.map((_, i) => (
                <mesh
                    key={`node-${i}`}
                    ref={(el) => { if (el) nodesRef.current[i] = el }}
                    geometry={nodeGeometry}
                    material={nodeMaterial}
                />
            ))}

            {/* Edges */}
            {TESSERACT_EDGES.map((_, i) => (
                <mesh
                    key={`edge-${i}`}
                    ref={(el) => { if (el) edgesRef.current[i] = el }}
                    material={edgeMaterial}
                >
                    <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
                </mesh>
            ))}
        </group>
    )
}

// Scene 2 UI
interface Scene2UIProps {
    rotationMode: number
    isPaused: boolean
}

export function Scene2UI({ rotationMode, isPaused }: Scene2UIProps) {
    return (
        <div className="glass-card title-card">
            <h1>Rotating Tesseract</h1>
            <p>4D hypercube projected to 3D</p>
            <p>Rotation: <strong>{ROTATION_MODES[rotationMode].label}</strong></p>
            {isPaused && <p style={{ color: '#fbbf24', fontWeight: 600 }}>⏸ PAUSED</p>}
            <p style={{ opacity: 0.6, fontSize: '12px' }}>Space: planes | P: pause | R: reset</p>
        </div>
    )
}
