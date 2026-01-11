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

// Tesseract faces - 24 square faces, each connecting 4 vertices that share 2 fixed coordinates
// Each face is defined by 4 vertex indices forming a square
const TESSERACT_FACES: [number, number, number, number][] = []

// Helper to find vertex index by coordinates
function findVertexIndex(x: number, y: number, z: number, w: number): number {
    return TESSERACT_VERTICES_4D.findIndex(v => v[0] === x && v[1] === y && v[2] === z && v[3] === w)
}

// Generate faces: fix 2 dimensions, vary the other 2
const dims = [0, 1, 2, 3] // x, y, z, w
for (let d1 = 0; d1 < 4; d1++) {
    for (let d2 = d1 + 1; d2 < 4; d2++) {
        // d1 and d2 are the varying dimensions
        // The other 2 are fixed
        const fixedDims = dims.filter(d => d !== d1 && d !== d2)
        for (const v1 of [-1, 1]) {
            for (const v2 of [-1, 1]) {
                // Create a face with fixed values for fixedDims
                const coords: number[][] = []
                for (const a of [-1, 1]) {
                    for (const b of [-1, 1]) {
                        const coord = [0, 0, 0, 0]
                        coord[d1] = a
                        coord[d2] = b
                        coord[fixedDims[0]] = v1
                        coord[fixedDims[1]] = v2
                        coords.push(coord)
                    }
                }
                // Reorder to form a proper quad (not a bowtie)
                const [c0, c1, c2, c3] = coords
                const i0 = findVertexIndex(c0[0], c0[1], c0[2], c0[3])
                const i1 = findVertexIndex(c1[0], c1[1], c1[2], c1[3])
                const i2 = findVertexIndex(c3[0], c3[1], c3[2], c3[3]) // swap 2 and 3 for proper winding
                const i3 = findVertexIndex(c2[0], c2[1], c2[2], c2[3])
                if (i0 >= 0 && i1 >= 0 && i2 >= 0 && i3 >= 0) {
                    TESSERACT_FACES.push([i0, i1, i2, i3])
                }
            }
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

    const faceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#4488ff',
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false
    }), [])

    const nodeGeometry = useMemo(() => new THREE.SphereGeometry(0.08, 16, 16), [])

    // Animation state
    const nodesRef = useRef<THREE.Mesh[]>([])
    const edgesRef = useRef<THREE.Mesh[]>([])
    const facesRef = useRef<THREE.Mesh[]>([])

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

        // Update face geometries
        facesRef.current.forEach((faceMesh, i) => {
            if (faceMesh && faceMesh.geometry) {
                const [v0, v1, v2, v3] = TESSERACT_FACES[i]
                const p0 = projectedVertices[v0]
                const p1 = projectedVertices[v1]
                const p2 = projectedVertices[v2]
                const p3 = projectedVertices[v3]

                // Update buffer geometry positions (2 triangles for quad)
                const positions = faceMesh.geometry.attributes.position
                if (positions) {
                    const arr = positions.array as Float32Array
                    // Triangle 1: v0, v1, v2
                    arr[0] = p0.x; arr[1] = p0.y; arr[2] = p0.z
                    arr[3] = p1.x; arr[4] = p1.y; arr[5] = p1.z
                    arr[6] = p2.x; arr[7] = p2.y; arr[8] = p2.z
                    // Triangle 2: v0, v2, v3
                    arr[9] = p0.x; arr[10] = p0.y; arr[11] = p0.z
                    arr[12] = p2.x; arr[13] = p2.y; arr[14] = p2.z
                    arr[15] = p3.x; arr[16] = p3.y; arr[17] = p3.z
                    positions.needsUpdate = true
                }
            }
        })
    })

    return (
        <group ref={groupRef}>
            {/* Lighting for Scene 2 */}
            <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
            <pointLight position={[-5, -5, -5]} intensity={0.5} color="#0088ff" />

            {/* Faces (transparent) */}
            {TESSERACT_FACES.map((_, i) => (
                <mesh
                    key={`face-${i}`}
                    ref={(el) => { if (el) facesRef.current[i] = el }}
                    material={faceMaterial}
                >
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            args={[new Float32Array(18), 3]}
                        />
                    </bufferGeometry>
                </mesh>
            ))}

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
