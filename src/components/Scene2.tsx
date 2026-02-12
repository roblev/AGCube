import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POLYTOPES_4D } from './polytopes4d'

type Vec4 = [number, number, number, number]

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

// 4D rotation functions
function rotateXW(v: Vec4, angle: number): Vec4 {
    const cos = Math.cos(angle), sin = Math.sin(angle)
    return [v[0] * cos - v[3] * sin, v[1], v[2], v[0] * sin + v[3] * cos]
}

function rotateYW(v: Vec4, angle: number): Vec4 {
    const cos = Math.cos(angle), sin = Math.sin(angle)
    return [v[0], v[1] * cos - v[3] * sin, v[2], v[1] * sin + v[3] * cos]
}

function rotateZW(v: Vec4, angle: number): Vec4 {
    const cos = Math.cos(angle), sin = Math.sin(angle)
    return [v[0], v[1], v[2] * cos - v[3] * sin, v[2] * sin + v[3] * cos]
}

// Project 4D to 3D using perspective projection
function project4Dto3D(v: Vec4, distance: number = 2): THREE.Vector3 {
    const w = 1 / (distance - v[3])
    return new THREE.Vector3(v[0] * w, v[1] * w, v[2] * w)
}

// Max counts for InstancedMesh allocation
const MAX_VERTICES = 600
const MAX_EDGES = 1200
const MAX_FACE_TRIS = 2200  // Enough for any polytope's triangulated faces

interface Scene2Props {
    rotationMode: number
    isPaused: boolean
    resetTrigger: number
    solidIndex: number
}

export function Scene2({ rotationMode, isPaused, resetTrigger, solidIndex }: Scene2Props) {
    const groupRef = useRef<THREE.Group>(null)
    const angleRef = useRef({ xw: 0, yw: 0, zw: 0 })
    const vertexMeshRef = useRef<THREE.InstancedMesh>(null)
    const edgeMeshRef = useRef<THREE.InstancedMesh>(null)
    const faceMeshRef = useRef<THREE.Mesh>(null)

    const polytope = POLYTOPES_4D[solidIndex]

    // Reset angles when resetTrigger changes
    useEffect(() => {
        angleRef.current = { xw: 0, yw: 0, zw: 0 }
    }, [resetTrigger])

    // Memoize geometries
    const sphereGeom = useMemo(() => new THREE.SphereGeometry(1, 12, 12), [])
    const cylGeom = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 6), [])

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

    // Pre-allocate face geometry buffer
    const faceGeometry = useMemo(() => {
        const geom = new THREE.BufferGeometry()
        const positions = new Float32Array(MAX_FACE_TRIS * 3 * 3) // 3 verts per triangle, 3 coords each
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geom.setDrawRange(0, 0)
        return geom
    }, [])

    // Reusable objects for per-frame updates
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const zeroMatrix = useMemo(() => {
        const m = new THREE.Matrix4()
        m.makeScale(0, 0, 0)
        return m
    }, [])

    // When solidIndex changes, clear instances that won't be used
    useEffect(() => {
        if (vertexMeshRef.current) {
            for (let i = 0; i < MAX_VERTICES; i++) {
                vertexMeshRef.current.setMatrixAt(i, zeroMatrix)
            }
            vertexMeshRef.current.instanceMatrix.needsUpdate = true
            vertexMeshRef.current.count = polytope.vertices.length
        }
        if (edgeMeshRef.current) {
            for (let i = 0; i < MAX_EDGES; i++) {
                edgeMeshRef.current.setMatrixAt(i, zeroMatrix)
            }
            edgeMeshRef.current.instanceMatrix.needsUpdate = true
            edgeMeshRef.current.count = polytope.edges.length
        }
    }, [solidIndex, polytope, zeroMatrix])

    // Base sizes
    const BASE_NODE_SIZE = 0.012
    const BASE_ROD_THICKNESS = 0.004

    // Temp vectors for edge orientation
    const _dir = useMemo(() => new THREE.Vector3(), [])
    const _up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
    const _quat = useMemo(() => new THREE.Quaternion(), [])

    useFrame((state, delta) => {
        const mode = ROTATION_MODES[rotationMode]

        // Update rotation angles if not paused
        if (!isPaused) {
            if (mode.xw) angleRef.current.xw += delta * 0.5
            if (mode.yw) angleRef.current.yw += delta * 0.3
            if (mode.zw) angleRef.current.zw += delta * 0.4
        }

        const cameraDistance = state.camera.position.length()
        const sizeScale = cameraDistance

        // Rotate and project all vertices
        const projected: THREE.Vector3[] = polytope.vertices.map(v => {
            let rotated: Vec4 = v
            if (mode.xw) rotated = rotateXW(rotated, angleRef.current.xw)
            if (mode.yw) rotated = rotateYW(rotated, angleRef.current.yw)
            if (mode.zw) rotated = rotateZW(rotated, angleRef.current.zw)
            return project4Dto3D(rotated, 4)
        })

        // ── Update vertex instances ──
        if (vertexMeshRef.current) {
            const nodeScale = BASE_NODE_SIZE * sizeScale
            projected.forEach((p, i) => {
                dummy.position.copy(p)
                dummy.scale.setScalar(nodeScale)
                dummy.rotation.set(0, 0, 0)
                dummy.updateMatrix()
                vertexMeshRef.current!.setMatrixAt(i, dummy.matrix)
            })
            vertexMeshRef.current.instanceMatrix.needsUpdate = true
        }

        // ── Update edge instances ──
        if (edgeMeshRef.current) {
            const thickness = BASE_ROD_THICKNESS * sizeScale
            polytope.edges.forEach(([a, b], i) => {
                const start = projected[a]
                const end = projected[b]
                const dist = start.distanceTo(end)

                // Position at midpoint
                dummy.position.lerpVectors(start, end, 0.5)

                // Orient: compute direction and find quaternion
                _dir.subVectors(end, start).normalize()
                _quat.setFromUnitVectors(_up, _dir)
                dummy.quaternion.copy(_quat)

                // Scale: thickness for X/Z, distance for Y
                dummy.scale.set(thickness, dist, thickness)

                dummy.updateMatrix()
                edgeMeshRef.current!.setMatrixAt(i, dummy.matrix)
            })
            edgeMeshRef.current.instanceMatrix.needsUpdate = true
        }

        // ── Update face geometry ──
        if (faceMeshRef.current && polytope.faces.length > 0) {
            const positions = faceGeometry.attributes.position as THREE.BufferAttribute
            const arr = positions.array as Float32Array
            let triIdx = 0

            for (const face of polytope.faces) {
                // Triangulate: fan from first vertex
                const p0 = projected[face[0]]
                for (let i = 1; i < face.length - 1; i++) {
                    const p1 = projected[face[i]]
                    const p2 = projected[face[i + 1]]
                    const base = triIdx * 9
                    arr[base] = p0.x; arr[base + 1] = p0.y; arr[base + 2] = p0.z
                    arr[base + 3] = p1.x; arr[base + 4] = p1.y; arr[base + 5] = p1.z
                    arr[base + 6] = p2.x; arr[base + 7] = p2.y; arr[base + 8] = p2.z
                    triIdx++
                }
            }

            faceGeometry.setDrawRange(0, triIdx * 3)
            positions.needsUpdate = true
        } else if (faceMeshRef.current) {
            faceGeometry.setDrawRange(0, 0)
        }
    })

    return (
        <group ref={groupRef}>
            {/* Lighting */}
            <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
            <pointLight position={[-5, -5, -5]} intensity={0.5} color="#0088ff" />

            {/* Faces (transparent) */}
            <mesh ref={faceMeshRef} geometry={faceGeometry} material={faceMaterial} />

            {/* Vertices (instanced spheres) */}
            <instancedMesh ref={vertexMeshRef} args={[sphereGeom, nodeMaterial, MAX_VERTICES]} />

            {/* Edges (instanced cylinders) */}
            <instancedMesh ref={edgeMeshRef} args={[cylGeom, edgeMaterial, MAX_EDGES]} />
        </group>
    )
}

// Scene 2 UI
interface Scene2UIProps {
    rotationMode: number
    isPaused: boolean
    solidIndex: number
}

export function Scene2UI({ rotationMode, isPaused, solidIndex }: Scene2UIProps) {
    const polytope = POLYTOPES_4D[solidIndex]
    return (
        <div className="glass-card title-card">
            <h1>{polytope.name}</h1>
            <p>{polytope.description}</p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>
                {polytope.vertices.length} vertices · {polytope.edges.length} edges
                {polytope.faces.length > 0 && ` · ${polytope.faces.length} faces`}
            </p>
            <p>Rotation: <strong>{ROTATION_MODES[rotationMode].label}</strong></p>
            {isPaused && <p style={{ color: '#fbbf24', fontWeight: 600 }}>⏸ PAUSED</p>}
            <p style={{ opacity: 0.6, fontSize: '12px' }}>S: solids | Space: planes | P: pause | R: reset</p>
        </div>
    )
}
