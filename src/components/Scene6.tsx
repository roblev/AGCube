import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Animation duration for each sweep (in seconds)
const SWEEP_DURATION = 2.0
const W_AXIS_DURATION = 4.0  // Slower duration for W-axis stages (4-5)

// Face colors matching Scene1/Scene5
const FACE_COLORS = {
    posX: '#f39494',  // +X face (light red)
    negX: '#c40707',  // -X face (dark red)
    posY: '#57f157',  // +Y face (light green)
    negY: '#048004',  // -Y face (dark green)
    posZ: '#7185f1',  // +Z face (light blue)
    negZ: '#00008b',  // -Z face (dark blue)
    posW: '#ffffff',  // +W face (white) - for w=1.0
    negW: '#888888',  // -W face (dark grey) - for w=0.0
}

// Stage names for UI (0-5, 6 total stages)
const STAGE_NAMES = ['Point', 'Line', 'Square', 'Cube', 'Cube → Grid', 'Tesseract Fill']

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

interface Scene6Props {
    stage: number
    animProgress: number
    setAnimProgress: (value: number) => void
}

// Mini axes component for grid cells
function MiniAxes({ scale = 1, showLabels = true, showNumberLabels = false }: {
    scale?: number,
    showLabels?: boolean,
    showNumberLabels?: boolean
}) {
    const axisLength = 1.2 * scale
    const axisRadius = 0.015 * scale

    return (
        <group>
            {/* X axis - Red */}
            <mesh position={[axisLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
                <meshStandardMaterial color="red" transparent opacity={0.7} />
            </mesh>
            {/* Y axis - Green */}
            <mesh position={[0, axisLength / 2, 0]}>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
                <meshStandardMaterial color="green" transparent opacity={0.7} />
            </mesh>
            {/* Z axis - Blue */}
            <mesh position={[0, 0, axisLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
                <meshStandardMaterial color="blue" transparent opacity={0.7} />
            </mesh>

            {/* X/Y/Z letter labels */}
            {showLabels && (
                <>
                    <Billboard position={[axisLength + 0.1 * scale, 0, 0]}>
                        <Text fontSize={0.15 * scale} color="#ff8888">X</Text>
                    </Billboard>
                    <Billboard position={[0, axisLength + 0.1 * scale, 0]}>
                        <Text fontSize={0.15 * scale} color="#88ff88">Y</Text>
                    </Billboard>
                    <Billboard position={[0, 0, axisLength + 0.1 * scale]}>
                        <Text fontSize={0.15 * scale} color="#8888ff">Z</Text>
                    </Billboard>
                </>
            )}

            {/* Number labels (0, 1) at coordinate positions */}
            {showNumberLabels && (
                <>
                    {/* Origin - slight offset for visibility */}
                    <Billboard position={[-0.08, -0.08, -0.08]}>
                        <Text fontSize={0.12} color="white">0</Text>
                    </Billboard>

                    {/* X axis: "1" at position 1 */}
                    <Billboard position={[1, -0.08, 0]}>
                        <Text fontSize={0.1} color="white">1</Text>
                    </Billboard>

                    {/* Y axis: "1" at position 1 */}
                    <Billboard position={[-0.08, 1, 0]}>
                        <Text fontSize={0.1} color="white">1</Text>
                    </Billboard>

                    {/* Z axis: "1" at position 1 */}
                    <Billboard position={[0, -0.08, 1]}>
                        <Text fontSize={0.1} color="white">1</Text>
                    </Billboard>
                </>
            )}
        </group>
    )
}

// Animated point (sphere)
function AnimatedPoint({ visible }: { visible: boolean }) {
    if (!visible) return null

    return (
        <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="white" emissive="#444444" />
        </mesh>
    )
}

// Animated line (sweeping from point)
function AnimatedLine({ progress, visible }: { progress: number, visible: boolean }) {
    if (!visible) return null

    const length = Math.max(0.001, progress)

    return (
        <group>
            {/* Line cylinder - white with glow for visibility against red axis */}
            <mesh position={[length / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, length, 8]} />
                <meshStandardMaterial color="white" emissive="#ffcccc" emissiveIntensity={0.5} />
            </mesh>
            {/* End point */}
            <mesh position={[length, 0, 0]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshStandardMaterial color="white" emissive="#666666" />
            </mesh>
            {/* Start point */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshStandardMaterial color="white" emissive="#666666" />
            </mesh>
        </group>
    )
}

// Animated square (sweeping from line)
function AnimatedSquare({ progress, visible }: { progress: number, visible: boolean }) {
    const texture = useScene1Texture()
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: FACE_COLORS.posY,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8,
        bumpMap: texture,
        bumpScale: 0.3,
        roughnessMap: texture,
        transparent: true,
        opacity: 0.9,
    }), [texture])

    if (!visible) return null

    const height = Math.max(0.001, progress)

    // Create a plane geometry with proper dimensions
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, height)
        geo.translate(0.5, height / 2, 0)
        return geo
    }, [height])

    return (
        <group>
            {/* Square face with Scene 1 style material */}
            <mesh geometry={geometry} material={material} />
            {/* Edge lines */}
            {/* Bottom edge */}
            <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
                <meshStandardMaterial color={FACE_COLORS.posX} metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Top edge */}
            <mesh position={[0.5, height, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
                <meshStandardMaterial color={FACE_COLORS.posX} metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Left edge */}
            <mesh position={[0, height / 2, 0]}>
                <cylinderGeometry args={[0.01, 0.01, height, 8]} />
                <meshStandardMaterial color={FACE_COLORS.posY} metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Right edge */}
            <mesh position={[1, height / 2, 0]}>
                <cylinderGeometry args={[0.01, 0.01, height, 8]} />
                <meshStandardMaterial color={FACE_COLORS.posY} metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Corner points */}
            {[
                [0, 0, 0], [1, 0, 0],
                [0, height, 0], [1, height, 0]
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="white" emissive="#444444" metalness={0.6} roughness={0.3} />
                </mesh>
            ))}
        </group>
    )
}

// Animated cube (sweeping from square)
function AnimatedCube({ progress, visible, opacity = 1 }: { progress: number, visible: boolean, opacity?: number }) {
    const texture = useScene1Texture()

    // Create materials for each face with Scene 1 style
    const materials = useMemo(() => ({
        posZ: new THREE.MeshStandardMaterial({ color: FACE_COLORS.posZ, side: THREE.DoubleSide, roughness: 0.2, metalness: 0.8, bumpMap: texture, bumpScale: 0.3, roughnessMap: texture, transparent: true, opacity: opacity * 0.9 }),
        negZ: new THREE.MeshStandardMaterial({ color: FACE_COLORS.negZ, side: THREE.DoubleSide, roughness: 0.2, metalness: 0.8, bumpMap: texture, bumpScale: 0.3, roughnessMap: texture, transparent: true, opacity: opacity * 0.9 }),
        posX: new THREE.MeshStandardMaterial({ color: FACE_COLORS.posX, side: THREE.DoubleSide, roughness: 0.2, metalness: 0.8, bumpMap: texture, bumpScale: 0.3, roughnessMap: texture, transparent: true, opacity: opacity * 0.9 }),
        negX: new THREE.MeshStandardMaterial({ color: FACE_COLORS.negX, side: THREE.DoubleSide, roughness: 0.2, metalness: 0.8, bumpMap: texture, bumpScale: 0.3, roughnessMap: texture, transparent: true, opacity: opacity * 0.9 }),
        posY: new THREE.MeshStandardMaterial({ color: FACE_COLORS.posY, side: THREE.DoubleSide, roughness: 0.2, metalness: 0.8, bumpMap: texture, bumpScale: 0.3, roughnessMap: texture, transparent: true, opacity: opacity * 0.9 }),
        negY: new THREE.MeshStandardMaterial({ color: FACE_COLORS.negY, side: THREE.DoubleSide, roughness: 0.2, metalness: 0.8, bumpMap: texture, bumpScale: 0.3, roughnessMap: texture, transparent: true, opacity: opacity * 0.9 }),
    }), [texture, opacity])

    if (!visible) return null

    const depth = Math.max(0.001, progress)

    return (
        <group>
            {/* Front face (Z=depth) */}
            <mesh position={[0.5, 0.5, depth]} material={materials.posZ}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Back face (Z=0) */}
            <mesh position={[0.5, 0.5, 0]} rotation={[0, Math.PI, 0]} material={materials.negZ}>
                <planeGeometry args={[1, 1]} />
            </mesh>
            {/* Right face (X=1) */}
            <mesh position={[1, 0.5, depth / 2]} rotation={[0, Math.PI / 2, 0]} material={materials.posX}>
                <planeGeometry args={[depth, 1]} />
            </mesh>
            {/* Left face (X=0) */}
            <mesh position={[0, 0.5, depth / 2]} rotation={[0, -Math.PI / 2, 0]} material={materials.negX}>
                <planeGeometry args={[depth, 1]} />
            </mesh>
            {/* Top face (Y=1) */}
            <mesh position={[0.5, 1, depth / 2]} rotation={[-Math.PI / 2, 0, 0]} material={materials.posY}>
                <planeGeometry args={[1, depth]} />
            </mesh>
            {/* Bottom face (Y=0) */}
            <mesh position={[0.5, 0, depth / 2]} rotation={[Math.PI / 2, 0, 0]} material={materials.negY}>
                <planeGeometry args={[1, depth]} />
            </mesh>

            {/* Edges - 12 edges of the cube */}
            {/* Bottom square */}
            <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0.5, 0, depth]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, depth / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, depth, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[1, 0, depth / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, depth, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Top square */}
            <mesh position={[0.5, 1, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0.5, 1, depth]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 1, depth / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, depth, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[1, 1, depth / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, depth, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Vertical edges */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[1, 0.5, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.5, depth]}>
                <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[1, 0.5, depth]}>
                <cylinderGeometry args={[0.008, 0.008, 1, 8]} />
                <meshStandardMaterial color="white" transparent opacity={opacity} metalness={0.5} roughness={0.4} />
            </mesh>

            {/* Corner vertices - 8 corners of the cube */}
            {[
                [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
                [0, 0, depth], [1, 0, depth], [0, 1, depth], [1, 1, depth]
            ].map((pos, i) => (
                <mesh key={`corner-${i}`} position={pos as [number, number, number]}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="white" emissive="#444444" metalness={0.6} roughness={0.3} />
                </mesh>
            ))}
        </group>
    )
}

// Grid cell for tesseract visualization
function TesseractGridCell({ wValue, showCube, position, scale }: {
    wValue: number,
    showCube: boolean,
    position: [number, number, number],
    scale: number
}) {
    const texture = useScene1Texture()

    // Determine if this is a W-boundary cube (w=0.0 or w=1.0)
    const isWBoundary = wValue === 0.0 || wValue === 1.0
    const wColor = wValue === 0.0 ? FACE_COLORS.negW : (wValue === 1.0 ? FACE_COLORS.posW : null)

    // Create materials with Scene 1 style (only when showCube is true)
    const materials = useMemo(() => {
        const baseMaterial = (color: string) => new THREE.MeshStandardMaterial({
            color,
            side: THREE.DoubleSide,
            roughness: 0.2,
            metalness: 0.8,
            bumpMap: texture,
            bumpScale: 0.3,
            roughnessMap: texture,
        })
        return {
            posX: baseMaterial(isWBoundary && wColor ? wColor : FACE_COLORS.posX),
            negX: baseMaterial(isWBoundary && wColor ? wColor : FACE_COLORS.negX),
            posY: baseMaterial(isWBoundary && wColor ? wColor : FACE_COLORS.posY),
            negY: baseMaterial(isWBoundary && wColor ? wColor : FACE_COLORS.negY),
            posZ: baseMaterial(isWBoundary && wColor ? wColor : FACE_COLORS.posZ),
            negZ: baseMaterial(isWBoundary && wColor ? wColor : FACE_COLORS.negZ),
        }
    }, [texture, isWBoundary, wColor])

    return (
        <group position={position} scale={[scale, scale, scale]}>
            <MiniAxes scale={1} showLabels={false} />
            {showCube && (
                <group>
                    {/* Colored unit cube with 6 faces - Scene 1 style */}
                    {/* +X face (right) */}
                    <mesh position={[1, 0.5, 0.5]} rotation={[0, Math.PI / 2, 0]} material={materials.posX}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>
                    {/* -X face (left) */}
                    <mesh position={[0, 0.5, 0.5]} rotation={[0, -Math.PI / 2, 0]} material={materials.negX}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>
                    {/* +Y face (top) */}
                    <mesh position={[0.5, 1, 0.5]} rotation={[-Math.PI / 2, 0, 0]} material={materials.posY}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>
                    {/* -Y face (bottom) */}
                    <mesh position={[0.5, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={materials.negY}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>
                    {/* +Z face (front) */}
                    <mesh position={[0.5, 0.5, 1]} material={materials.posZ}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>
                    {/* -Z face (back) */}
                    <mesh position={[0.5, 0.5, 0]} rotation={[0, Math.PI, 0]} material={materials.negZ}>
                        <planeGeometry args={[1, 1]} />
                    </mesh>

                    {/* Corner vertices - only at w=0 and w=1 (actual tesseract vertices) */}
                    {isWBoundary && [
                        [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
                        [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]
                    ].map((pos, i) => (
                        <mesh key={`corner-${i}`} position={pos as [number, number, number]}>
                            <sphereGeometry args={[0.03, 16, 16]} />
                            <meshStandardMaterial color="white" emissive="#444444" metalness={0.6} roughness={0.3} />
                        </mesh>
                    ))}
                </group>
            )}
            {/* W label - larger for visibility */}
            <Billboard position={[0.5, -0.4, 0]}>
                <Text fontSize={0.25} color="white" fontWeight="bold">w={wValue.toFixed(1)}</Text>
            </Billboard>
        </group>
    )
}

// Tesseract grid view (Stages 4 & 5)
function TesseractGrid({ animProgress, showCubes }: { animProgress: number, showCubes: boolean }) {
    // Grid layout: 4 columns x 3 rows = 12 cells (we use 11: w=0.0 to w=1.0)
    const gridCols = 4
    const gridRows = 3
    const cellSpacing = 3.5
    const cellScale = 0.6

    // Calculate how many cells to show based on animation progress (for grid setup animation)
    // When showCubes is true (stage 5), all 12 cells (indices 0-11) should be visible
    const maxVisibleCells = showCubes ? 13 : Math.floor(animProgress * 13) // Use 13 to ensure 0-11 all pass

    // Calculate which w-slices should show the cube based on animation progress (for cube fill animation)
    // When animProgress = 0, show cube at index 0. When animProgress = 1, show all cubes (index 0-10)
    const maxVisibleW = showCubes ? Math.min(10, Math.floor(animProgress * 11)) : -1

    const cells = []
    // Loop includes w=1.1 (index 11) which will never have a cube
    for (let i = 0; i <= 11; i++) {
        // Don't show this cell yet during grid setup animation
        if (i >= maxVisibleCells) continue

        const wValue = i / 10
        const col = i % gridCols
        const row = Math.floor(i / gridCols)

        // Position in 3D space (arranged in XY plane)
        const x = (col - gridCols / 2 + 0.5) * cellSpacing
        const y = (gridRows / 2 - row - 0.5) * cellSpacing
        const z = 0

        // Only indices 0-10 can have cubes (w=0.0 to w=1.0), index 11 (w=1.1) stays empty
        const canHaveCube = i <= 10

        cells.push(
            <TesseractGridCell
                key={i}
                wValue={wValue}
                showCube={showCubes && canHaveCube && i <= maxVisibleW}
                position={[x, y, z]}
                scale={cellScale}
            />
        )
    }

    return <group>{cells}</group>
}

// Transition from cube to grid: cube shrinks and moves to w=0 position, then other axes appear
function CubeToGridTransition({ animProgress }: { animProgress: number }) {
    const gridCols = 4
    const gridRows = 3
    const cellSpacing = 3.5
    const cellScale = 0.6

    // Calculate w=0 position (first cell position in the grid)
    const w0X = (0 - gridCols / 2 + 0.5) * cellSpacing  // col 0
    const w0Y = (gridRows / 2 - 0 - 0.5) * cellSpacing  // row 0
    const w0Z = 0

    // First half: cube shrinks and moves (0 to 0.5)
    // Second half: other grid cells appear (0.5 to 1.0)
    const transitionPhase = Math.min(1, animProgress * 2) // 0-1 during first half
    const gridPhase = Math.max(0, (animProgress - 0.5) * 2) // 0-1 during second half

    // Interpolate cube position and scale
    // Start: center (0.5, 0.5, 0.5) at scale 2
    // End: w=0 grid position at scale 0.6
    const startScale = 2
    const endScale = cellScale
    const currentScale = startScale + (endScale - startScale) * transitionPhase

    // Center cube starts at (0,0,0) in group coordinates, needs to move to w0 position
    // At scale=2, the cube occupies more space. We interpolate the group position.
    const startX = 0
    const startY = 0
    const startZ = 0
    const currentX = startX + (w0X - startX) * transitionPhase
    const currentY = startY + (w0Y - startY) * transitionPhase
    const currentZ = startZ + (w0Z - startZ) * transitionPhase

    // How many grid cells (excluding w=0) to show based on gridPhase
    // Now includes up to w=1.1 (index 11)
    const maxVisibleCells = Math.floor(gridPhase * 12) // 1 to 11 (cells 1-11)

    const otherCells = []
    for (let i = 1; i <= 11; i++) {
        if (i > maxVisibleCells) continue

        const wValue = i / 10
        const col = i % gridCols
        const row = Math.floor(i / gridCols)
        const x = (col - gridCols / 2 + 0.5) * cellSpacing
        const y = (gridRows / 2 - row - 0.5) * cellSpacing
        const z = 0

        otherCells.push(
            <group key={i} position={[x, y, z]} scale={[cellScale, cellScale, cellScale]}>
                <MiniAxes scale={1} showLabels={false} />
                <Billboard position={[0.5, -0.4, 0]}>
                    <Text fontSize={0.25} color="white" fontWeight="bold">w={wValue.toFixed(1)}</Text>
                </Billboard>
            </group>
        )
    }

    return (
        <group>
            {/* The transitioning cube with axes - shrinks from center to w=0 position */}
            <group position={[currentX, currentY, currentZ]} scale={[currentScale, currentScale, currentScale]}>
                <MiniAxes scale={1} showLabels={false} />
                <AnimatedCube progress={1} visible={true} />
                {/* W label appears as cube settles into grid */}
                {transitionPhase > 0.5 && (
                    <Billboard position={[0.5, -0.4, 0]}>
                        <Text fontSize={0.25} color="white" fontWeight="bold">w=0.0</Text>
                    </Billboard>
                )}
            </group>

            {/* Other grid cells appear after cube has moved */}
            {otherCells}
        </group>
    )
}

export function Scene6({ stage, animProgress: _animProgress, setAnimProgress }: Scene6Props) {
    const groupRef = useRef<THREE.Group>(null)
    const lastStageRef = useRef(stage)
    const localProgressRef = useRef(0)

    // When stage changes, IMMEDIATELY reset local progress 
    if (stage !== lastStageRef.current) {
        localProgressRef.current = 0
        lastStageRef.current = stage
    }

    // Animation loop - uses local ref as source of truth
    useFrame((_, delta) => {
        // Use slower duration for W-axis stages (4-5)
        const duration = stage >= 4 ? W_AXIS_DURATION : SWEEP_DURATION
        // Animate progress from 0 to 1
        if (localProgressRef.current < 1) {
            localProgressRef.current = Math.min(1, localProgressRef.current + delta / duration)
            // Sync to external state for UI display (fire and forget)
            setAnimProgress(localProgressRef.current)
        }
    })

    // Always use the local ref value - this is immediately reset when stage changes
    const effectiveProgress = localProgressRef.current

    // Calculate eased progress for smooth animation
    const easedProgress = 1 - Math.pow(1 - effectiveProgress, 3) // Ease out cubic

    return (
        <group ref={groupRef}>
            {/* Scene lighting */}
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <directionalLight position={[-3, -3, 2]} intensity={0.3} />
            <hemisphereLight intensity={0.5} groundColor="#444" />
            <Environment preset="city" />

            {/* Stage 0: Point - scaled 2x for visual size */}
            {stage === 0 && (
                <group scale={[2, 2, 2]}>
                    <MiniAxes scale={1} showNumberLabels={true} />
                    <AnimatedPoint visible={effectiveProgress > 0.1} />
                </group>
            )}

            {/* Stage 1: Line (point sweeps X) - scaled 2x */}
            {stage === 1 && (
                <group scale={[2, 2, 2]}>
                    <MiniAxes scale={1} showNumberLabels={true} />
                    <AnimatedLine progress={easedProgress} visible={true} />
                </group>
            )}

            {/* Stage 2: Square (line sweeps Y) - scaled 2x */}
            {stage === 2 && (
                <group scale={[2, 2, 2]}>
                    <MiniAxes scale={1} showNumberLabels={true} />
                    <AnimatedSquare progress={easedProgress} visible={true} />
                </group>
            )}

            {/* Stage 3: Cube (square sweeps Z) - scaled 2x */}
            {stage === 3 && (
                <group scale={[2, 2, 2]}>
                    <MiniAxes scale={1} showNumberLabels={true} />
                    <AnimatedCube progress={easedProgress} visible={true} />
                </group>
            )}

            {/* Stage 4: Cube-to-Grid Transition (cube shrinks to w=0, then other axes appear) */}
            {stage === 4 && (
                <CubeToGridTransition animProgress={easedProgress} />
            )}

            {/* Stage 5: Tesseract Fill (cubes appear in sequence) - use eased progress like other animations */}
            {stage === 5 && (
                <TesseractGrid animProgress={easedProgress} showCubes={true} />
            )}
        </group>
    )
}

// Scene 6 UI Overlay
interface Scene6UIProps {
    stage: number
}

export function Scene6UI({ stage }: Scene6UIProps) {
    return (
        <div className="glass-card title-card">
            <h1>Dimensional Generation</h1>
            <p>Stage {stage}: <strong>{STAGE_NAMES[stage]}</strong></p>
            <p style={{ opacity: 0.6, fontSize: '12px' }}>Space: next dimension</p>
        </div>
    )
}
