import { useRef, useState, useMemo, useEffect } from 'react'
import { Mesh, DoubleSide, MeshStandardMaterial, BufferGeometry, Float32BufferAttribute, Color, CanvasTexture, RepeatWrapping } from 'three'

export const Cube = ({ w }: { w: number }) => {
    const meshRef = useRef<Mesh>(null!)
    const [showCut, setShowCut] = useState(true) // Toggle cut visibility with spacebar
    const [showColors, setShowColors] = useState(false) // Toggle colored mode at w=0 or w=1 with C key

    // Calculate state flags (needed for hooks before conditional return)
    const isZero = Math.abs(w - 0) < 0.001
    const isOne = Math.abs(w - 1) < 0.001
    const isSolid = isZero || isOne
    const isVisible = w >= 0 && w <= 1

    // Keyboard listener for spacebar and C key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault()
                setShowCut(prev => !prev)
            }
            // C key toggles colors (visual change only at w=0 or w=1)
            if (e.code === 'KeyC') {
                e.preventDefault()
                setShowColors(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])



    // Geometry Generation - must be called unconditionally (React hooks rule)
    const geometry = useMemo(() => {
        const cut = 0.5

        const positions: number[] = []
        const colors: number[] = []
        const normals: number[] = []
        const uvs: number[] = [] // Add UVs for bump mapping

        const _color = new Color()

        const pushTri = (p1: number[], p2: number[], p3: number[], colHex: string, norm: number[], uv1: number[], uv2: number[], uv3: number[]) => {
            positions.push(...p1, ...p2, ...p3)
            _color.set(colHex)
            colors.push(_color.r, _color.g, _color.b)
            colors.push(_color.r, _color.g, _color.b)
            colors.push(_color.r, _color.g, _color.b)
            normals.push(...norm, ...norm, ...norm)
            uvs.push(...uv1, ...uv2, ...uv3)
        }

        const pushQuad = (p1: number[], p2: number[], p3: number[], p4: number[], col: string, norm: number[]) => {
            // Two triangles: p1-p2-p4 and p2-p3-p4
            pushTri(p1, p2, p4, col, norm, [0, 0], [1, 0], [0, 1])
            pushTri(p2, p3, p4, col, norm, [1, 0], [1, 1], [0, 1])
        }

        const pushPent = (p1: number[], p2: number[], p3: number[], p4: number[], p5: number[], col: string, norm: number[]) => {
            // Fan from p1: 3 triangles
            // Use position-based UVs to ensure consistent texture alignment across all triangles
            // For each vertex, project onto the face's 2D coordinate system based on the normal
            const getUV = (p: number[]) => {
                // Determine which axes to use for UV based on face normal
                if (Math.abs(norm[0]) > 0.5) {
                    // X-facing face: use Y and Z for UV
                    return [p[1], p[2]]
                } else if (Math.abs(norm[1]) > 0.5) {
                    // Y-facing face: use X and Z for UV
                    return [p[0], p[2]]
                } else {
                    // Z-facing face: use X and Y for UV
                    return [p[0], p[1]]
                }
            }
            pushTri(p1, p2, p3, col, norm, getUV(p1), getUV(p2), getUV(p3))
            pushTri(p1, p3, p4, col, norm, getUV(p1), getUV(p3), getUV(p4))
            pushTri(p1, p4, p5, col, norm, getUV(p1), getUV(p4), getUV(p5))
        }

        // Colors
        const C_Right = '#f39494'
        const C_Left = '#c40707'
        const C_Top = '#57f157'
        const C_Bottom = '#048004'
        const C_Back = '#00008b'
        const C_Front = '#7185f1'

        // Cut coordinates
        const cutC1 = [1, 1, cut]
        const cutC2 = [1, cut, 1]
        const cutC3 = [cut, 1, 1]

        // --- FACES ---
        if (showCut) {
            // Sliced cube - 6 faces with pentagons for the cut faces
            pushQuad([0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0], C_Left, [-1, 0, 0])
            pushQuad([0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], C_Bottom, [0, -1, 0])
            pushQuad([0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0], C_Back, [0, 0, -1])
            pushPent([1, 0, 0], [1, 1, 0], cutC1, cutC2, [1, 0, 1], C_Right, [1, 0, 0])
            pushPent([0, 1, 0], [0, 1, 1], cutC3, cutC1, [1, 1, 0], C_Top, [0, 1, 0])
            pushPent([0, 0, 1], [1, 0, 1], cutC2, cutC3, [0, 1, 1], C_Front, [0, 0, 1])

            // Cut face: Only include for solid cubes (to close the hole)
            // Always use grey color for cut face, even when showColors is on
            if (isSolid) {
                const cutColor = isZero ? '#666666' : '#eeeeee'
                pushTri(cutC1, cutC3, cutC2, cutColor, [0.577, 0.577, 0.577], [0, 0], [1, 0], [0.5, 1])
            }
        } else {
            // Full cube - standard 6 quads
            pushQuad([0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0], C_Left, [-1, 0, 0])
            pushQuad([0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], C_Bottom, [0, -1, 0])
            pushQuad([0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0], C_Back, [0, 0, -1])
            pushQuad([1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1], C_Right, [1, 0, 0])
            pushQuad([0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0], C_Top, [0, 1, 0])
            pushQuad([0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1], C_Front, [0, 0, 1])
        }

        const geo = new BufferGeometry()
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
        geo.setAttribute('color', new Float32BufferAttribute(colors, 3))
        geo.setAttribute('normal', new Float32BufferAttribute(normals, 3))
        geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2)) // Add UV attribute
        return geo
    }, [isSolid, isZero, showCut])

    // Create bump/roughness map with high contrast for visible texture
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

        const tex = new CanvasTexture(canvas)
        tex.wrapS = RepeatWrapping
        tex.wrapT = RepeatWrapping
        tex.repeat.set(4, 4) // Tile the noise
        return tex
    }, [])

    // Material - must be called unconditionally
    const materialHelper = useMemo(() => {
        const mat = new MeshStandardMaterial({
            side: DoubleSide,
            vertexColors: true,
            roughness: 0.2,
            metalness: 0.8,
            bumpMap: textureMap,
            bumpScale: 0.5,
            roughnessMap: textureMap,
            depthWrite: false
        })
        return mat
    }, [textureMap])

    // Update material props based on w logic
    if (isZero) {
        if (showColors) {
            // Colored mode at w=0
            materialHelper.color.set('white')
            materialHelper.vertexColors = true
        } else {
            // Grey mode at w=0
            materialHelper.color.set('#666666')
            materialHelper.vertexColors = false
        }
        materialHelper.opacity = 1
        materialHelper.transparent = false
        materialHelper.depthWrite = true
    } else if (isOne) {
        if (showColors) {
            // Colored mode at w=1
            materialHelper.color.set('white')
            materialHelper.vertexColors = true
        } else {
            // Grey mode at w=1
            materialHelper.color.set('#eeeeee')
            materialHelper.vertexColors = false
        }
        materialHelper.opacity = 1
        materialHelper.transparent = false
        materialHelper.depthWrite = true
    } else {
        materialHelper.color.set('white')
        materialHelper.vertexColors = true
        materialHelper.opacity = 0.95
        materialHelper.transparent = true
        materialHelper.depthWrite = false
    }
    materialHelper.needsUpdate = true

    // Conditional render AFTER all hooks
    if (!isVisible) {
        return null
    }

    return (
        <mesh
            ref={meshRef}
            position={[0, 0, 0]}
            geometry={geometry}
            material={materialHelper}
        >
        </mesh>
    )
}
