import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { ROTATION_MODES } from './Scene2'

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

// Tesseract edges - connect vertices that differ in exactly one coordinate (32 edges)
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

// 8 cubic cells of the tesseract - each defined by fixing one coordinate
// Cell structure: { fixedDim, fixedValue, vertices (8 indices) }
interface TesseractCell {
    fixedDim: number  // Which dimension is fixed (0=x, 1=y, 2=z, 3=w)
    fixedValue: number  // The fixed value (-1 or +1)
    vertices: number[]  // 8 vertex indices forming the cube
    faceColor: string  // Color based on which face this cell represents
}

const TESSERACT_CELLS: TesseractCell[] = []

// Scene 1 cube colors
const FACE_COLORS = {
    posX: '#f39494',  // +X face (light red)
    negX: '#c40707',  // -X face (dark red)
    posY: '#57f157',  // +Y face (light green)
    negY: '#048004',  // -Y face (dark green)
    posZ: '#7185f1',  // +Z face (light blue)
    negZ: '#00008b',  // -Z face (dark blue)
    posW: '#ffffff',  // +W (white)
    negW: '#888888',  // -W (gray)
}

// Generate the 8 cells
for (let dim = 0; dim < 4; dim++) {
    for (const val of [-1, 1]) {
        const cellVertices: number[] = []
        TESSERACT_VERTICES_4D.forEach((v, i) => {
            if (v[dim] === val) {
                cellVertices.push(i)
            }
        })

        // Assign color based on dimension and sign
        let color: string
        if (dim === 0) color = val > 0 ? FACE_COLORS.posX : FACE_COLORS.negX
        else if (dim === 1) color = val > 0 ? FACE_COLORS.posY : FACE_COLORS.negY
        else if (dim === 2) color = val > 0 ? FACE_COLORS.posZ : FACE_COLORS.negZ
        else color = val > 0 ? FACE_COLORS.posW : FACE_COLORS.negW

        TESSERACT_CELLS.push({
            fixedDim: dim,
            fixedValue: val,
            vertices: cellVertices,
            faceColor: color
        })
    }
}

// 4D rotation matrices
function rotateXW(v: [number, number, number, number], angle: number): [number, number, number, number] {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return [v[0] * cos - v[3] * sin, v[1], v[2], v[0] * sin + v[3] * cos]
}

function rotateYW(v: [number, number, number, number], angle: number): [number, number, number, number] {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return [v[0], v[1] * cos - v[3] * sin, v[2], v[1] * sin + v[3] * cos]
}

function rotateZW(v: [number, number, number, number], angle: number): [number, number, number, number] {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return [v[0], v[1], v[2] * cos - v[3] * sin, v[2] * sin + v[3] * cos]
}

// Get the edges of a cube cell (12 edges connecting 8 vertices)
function getCellEdges(cellVertices: number[]): [number, number][] {
    const edges: [number, number][] = []
    for (let i = 0; i < cellVertices.length; i++) {
        for (let j = i + 1; j < cellVertices.length; j++) {
            const vi = cellVertices[i]
            const vj = cellVertices[j]
            // Check if these two tesseract vertices are connected by an edge
            if (TESSERACT_EDGES.some(e => (e[0] === vi && e[1] === vj) || (e[0] === vj && e[1] === vi))) {
                edges.push([vi, vj])
            }
        }
    }
    return edges
}

// Sort points in a polygon by angle around centroid
function sortPolygonPoints(points: THREE.Vector3[]): THREE.Vector3[] {
    if (points.length < 3) return points

    // Calculate centroid
    const centroid = new THREE.Vector3()
    points.forEach(p => centroid.add(p))
    centroid.divideScalar(points.length)

    // Calculate normal from first 3 points
    const v1 = points[1].clone().sub(points[0])
    const v2 = points[2].clone().sub(points[0])
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize()

    // Create a local 2D coordinate system
    const u = points[0].clone().sub(centroid).normalize()
    const v = new THREE.Vector3().crossVectors(normal, u).normalize()

    // Sort by angle
    return points.slice().sort((a, b) => {
        const relA = a.clone().sub(centroid)
        const relB = b.clone().sub(centroid)
        const angleA = Math.atan2(relA.dot(v), relA.dot(u))
        const angleB = Math.atan2(relB.dot(v), relB.dot(u))
        return angleA - angleB
    })
}

interface Scene5Props {
    w: number
    setW: (value: number) => void
    isPaused: boolean
    rotationMode: number
    resetTrigger: number
}

export function Scene5({ w, isPaused, rotationMode, resetTrigger }: Scene5Props) {
    const groupRef = useRef<THREE.Group>(null)
    const angleRef = useRef({ xw: 0, yw: 0, zw: 0 })
    const meshRef = useRef<THREE.Mesh>(null)

    // Reset angles when resetTrigger changes (spacebar was pressed)
    useEffect(() => {
        angleRef.current = { xw: 0, yw: 0, zw: 0 }
    }, [resetTrigger])

    // Fixed axis length - axes always meet at origin
    const axisLength = 2.5
    const axisCenter = axisLength / 2

    useFrame((_, delta) => {
        const mode = ROTATION_MODES[rotationMode]

        // Update rotation angles if not paused, based on current mode
        if (!isPaused) {
            if (mode.xw) angleRef.current.xw += delta * 0.5
            if (mode.yw) angleRef.current.yw += delta * 0.3
            if (mode.zw) angleRef.current.zw += delta * 0.4
        }

        if (!meshRef.current) return

        // Rotate tesseract vertices
        const rotatedVertices = TESSERACT_VERTICES_4D.map(v => {
            let rotated = v
            rotated = rotateXW(rotated, angleRef.current.xw)
            rotated = rotateYW(rotated, angleRef.current.yw)
            rotated = rotateZW(rotated, angleRef.current.zw)
            return rotated
        })

        // Convert w value from [0,1] to tesseract space [-1,1]
        const sliceW = (w - 0.5) * 2

        // Build geometry from cell slices
        const positions: number[] = []
        const colors: number[] = []
        const normals: number[] = []
        const uvs: number[] = []
        const color = new THREE.Color()

        // For each cell, find where its edges intersect the w-slice plane
        TESSERACT_CELLS.forEach(cell => {
            const cellEdges = getCellEdges(cell.vertices)
            const intersectionPoints: THREE.Vector3[] = []

            cellEdges.forEach(([vi, vj]) => {
                const v1 = rotatedVertices[vi]
                const v2 = rotatedVertices[vj]

                // Check if edge crosses the slice plane
                if ((v1[3] - sliceW) * (v2[3] - sliceW) < 0) {
                    // Edge crosses - compute intersection
                    const t = (sliceW - v1[3]) / (v2[3] - v1[3])
                    const x = v1[0] + t * (v2[0] - v1[0])
                    const y = v1[1] + t * (v2[1] - v1[1])
                    const z = v1[2] + t * (v2[2] - v1[2])
                    // Scale and translate to [0,1] range
                    intersectionPoints.push(new THREE.Vector3(
                        x * 0.5 + 0.5,
                        y * 0.5 + 0.5,
                        z * 0.5 + 0.5
                    ))
                }
            })

            // Also check if any cell vertices are exactly on the slice plane
            cell.vertices.forEach(vi => {
                const v = rotatedVertices[vi]
                if (Math.abs(v[3] - sliceW) < 0.001) {
                    intersectionPoints.push(new THREE.Vector3(
                        v[0] * 0.5 + 0.5,
                        v[1] * 0.5 + 0.5,
                        v[2] * 0.5 + 0.5
                    ))
                }
            })

            // Need at least 3 points to form a face
            if (intersectionPoints.length >= 3) {
                // Remove duplicate points
                const uniquePoints: THREE.Vector3[] = []
                intersectionPoints.forEach(p => {
                    const isDuplicate = uniquePoints.some(up => up.distanceTo(p) < 0.001)
                    if (!isDuplicate) uniquePoints.push(p)
                })

                if (uniquePoints.length >= 3) {
                    // Sort points to form proper polygon
                    const sorted = sortPolygonPoints(uniquePoints)

                    // Calculate face normal
                    const v1 = sorted[1].clone().sub(sorted[0])
                    const v2 = sorted[2].clone().sub(sorted[0])
                    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize()

                    // Use cell color
                    color.set(cell.faceColor)

                    // Triangulate as a fan
                    for (let i = 1; i < sorted.length - 1; i++) {
                        const p1 = sorted[0]
                        const p2 = sorted[i]
                        const p3 = sorted[i + 1]

                        positions.push(p1.x, p1.y, p1.z)
                        positions.push(p2.x, p2.y, p2.z)
                        positions.push(p3.x, p3.y, p3.z)

                        colors.push(color.r, color.g, color.b)
                        colors.push(color.r, color.g, color.b)
                        colors.push(color.r, color.g, color.b)

                        normals.push(normal.x, normal.y, normal.z)
                        normals.push(normal.x, normal.y, normal.z)
                        normals.push(normal.x, normal.y, normal.z)

                        // Generate UVs based on position (use xy, xz, or yz depending on normal)
                        const absNx = Math.abs(normal.x)
                        const absNy = Math.abs(normal.y)
                        const absNz = Math.abs(normal.z)

                        let getUV: (p: THREE.Vector3) => [number, number]
                        if (absNx >= absNy && absNx >= absNz) {
                            // X-facing: use Y and Z
                            getUV = (p) => [p.y, p.z]
                        } else if (absNy >= absNx && absNy >= absNz) {
                            // Y-facing: use X and Z
                            getUV = (p) => [p.x, p.z]
                        } else {
                            // Z-facing: use X and Y
                            getUV = (p) => [p.x, p.y]
                        }

                        const uv1 = getUV(p1)
                        const uv2 = getUV(p2)
                        const uv3 = getUV(p3)

                        uvs.push(uv1[0], uv1[1])
                        uvs.push(uv2[0], uv2[1])
                        uvs.push(uv3[0], uv3[1])
                    }
                }
            }
        })

        // Update mesh geometry
        const geo = meshRef.current.geometry as THREE.BufferGeometry
        if (positions.length > 0) {
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
            geo.computeBoundingSphere()
        } else {
            // Clear geometry if no slice
            geo.deleteAttribute('position')
            geo.deleteAttribute('color')
            geo.deleteAttribute('normal')
            geo.deleteAttribute('uv')
        }
    })

    // Create bump/roughness map with high contrast for visible texture (same as Cube.tsx)
    const textureMap = useMemo(() => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        // Fill with high-contrast noise for visible bump effect
        const imageData = ctx.createImageData(size, size)
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 255 // Full range for maximum contrast
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)

        const tex = new THREE.CanvasTexture(canvas)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(4, 4) // Tile the noise
        return tex
    }, [])

    // Material with vertex colors and bump map
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: textureMap,
        bumpScale: 0.5,
        roughnessMap: textureMap,
    }), [textureMap])

    return (
        <group ref={groupRef}>
            {/* Scene lighting */}
            <directionalLight position={[0.5, -2, 0.5]} intensity={0.5} />
            <hemisphereLight intensity={0.4} groundColor="#444" />
            <Environment preset="city" />

            {/* Sliced tesseract mesh */}
            <mesh ref={meshRef} material={material}>
                <bufferGeometry />
            </mesh>

            {/* Axes */}
            {/* X axis - Red */}
            <mesh position={[axisCenter, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, axisLength, 8]} />
                <meshStandardMaterial color="red" transparent opacity={0.5} />
            </mesh>
            {/* Y axis - Green */}
            <mesh position={[0, axisCenter, 0]}>
                <cylinderGeometry args={[0.01, 0.01, axisLength, 8]} />
                <meshStandardMaterial color="green" transparent opacity={0.5} />
            </mesh>
            {/* Z axis - Blue */}
            <mesh position={[0, 0, axisCenter]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.01, axisLength, 8]} />
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
        </group>
    )
}

interface Scene5UIProps {
    w: number
    setW: (value: number) => void
    isPaused: boolean
    rotationMode: number
}

export function Scene5UI({ w, setW, isPaused, rotationMode }: Scene5UIProps) {
    return (
        <>
            <div className="glass-card title-card">
                <h1>Rotating Tesseract Slice</h1>
                <p>W-slice of a 4D hypercube rotating in 4D</p>
                <p>Rotation: <strong>{ROTATION_MODES[rotationMode].label}</strong></p>
                {isPaused && <p style={{ color: '#fbbf24', fontWeight: 600 }}>⏸ PAUSED</p>}
                <p style={{ opacity: 0.6, fontSize: '12px' }}>Space: planes | P: pause | ←→: W-axis</p>
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

