// polytopes4d.ts
// Data for all 6 regular 4-polytopes (4D Platonic solids)
// Each polytope has vertices in 4D, edges, and faces.

type Vec4 = [number, number, number, number]

export interface Polytope4D {
    name: string
    description: string
    vertices: Vec4[]
    edges: [number, number][]
    faces: number[][]     // Each face is a list of vertex indices (3 for triangles, 4 for quads, 5 for pentagons)
    faceSize: number      // 3, 4, or 5
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHI = (1 + Math.sqrt(5)) / 2  // Golden ratio ≈ 1.618
const PHI_INV = 1 / PHI             // ≈ 0.618
const PHI_SQ = PHI * PHI            // ≈ 2.618
const PHI_INV_SQ = PHI_INV * PHI_INV // ≈ 0.382
const SQRT5 = Math.sqrt(5)

function dist4Sq(a: Vec4, b: Vec4): number {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 + (a[3] - b[3]) ** 2
}

/** Find edges by connecting vertex pairs at the minimum nonzero distance */
function findEdges(vertices: Vec4[], tolerance = 1e-6): [number, number][] {
    // Find minimum distance
    let minDist = Infinity
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            const d = dist4Sq(vertices[i], vertices[j])
            if (d > tolerance && d < minDist) minDist = d
        }
    }
    // Collect all edges at that distance
    const edges: [number, number][] = []
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            if (Math.abs(dist4Sq(vertices[i], vertices[j]) - minDist) < tolerance * minDist) {
                edges.push([i, j])
            }
        }
    }
    return edges
}

/** Find triangular faces: all 3-cliques in the edge graph */
function findTriangles(vertices: Vec4[], edges: [number, number][]): number[][] {
    const adj = new Map<number, Set<number>>()
    for (let i = 0; i < vertices.length; i++) adj.set(i, new Set())
    for (const [a, b] of edges) {
        adj.get(a)!.add(b)
        adj.get(b)!.add(a)
    }
    const faces: number[][] = []
    for (let i = 0; i < vertices.length; i++) {
        const ni = adj.get(i)!
        for (const j of ni) {
            if (j <= i) continue
            const nj = adj.get(j)!
            for (const k of nj) {
                if (k <= j) continue
                if (ni.has(k)) {
                    faces.push([i, j, k])
                }
            }
        }
    }
    return faces
}

/** Generate all permutations of a 4D coordinate (with sign variations already applied) */
function allPermutations(v: Vec4): Vec4[] {
    const result: Vec4[] = []
    const indices = [0, 1, 2, 3]
    // Generate all 24 permutations of 4 elements
    function permute(arr: number[], start: number) {
        if (start === arr.length) {
            result.push([v[arr[0]], v[arr[1]], v[arr[2]], v[arr[3]]])
            return
        }
        for (let i = start; i < arr.length; i++) {
            [arr[start], arr[i]] = [arr[i], arr[start]]
            permute(arr, start + 1);
            [arr[start], arr[i]] = [arr[i], arr[start]]
        }
    }
    permute(indices, 0)
    return result
}

/** Generate all even permutations of a 4D coordinate */
function evenPermutations(v: Vec4): Vec4[] {
    const result: Vec4[] = []
    const indices = [0, 1, 2, 3]
    function permute(arr: number[], start: number, parity: number) {
        if (start === arr.length) {
            if (parity % 2 === 0) {
                result.push([v[arr[0]], v[arr[1]], v[arr[2]], v[arr[3]]])
            }
            return
        }
        for (let i = start; i < arr.length; i++) {
            [arr[start], arr[i]] = [arr[i], arr[start]]
            permute(arr, start + 1, parity + (i === start ? 0 : 1));
            [arr[start], arr[i]] = [arr[i], arr[start]]
        }
    }
    permute(indices, 0, 0)
    return result
}

/** Generate all sign variations of a coordinate */
function allSignVariations(v: Vec4): Vec4[] {
    const result: Vec4[] = []
    for (let mask = 0; mask < 16; mask++) {
        const sv: Vec4 = [
            (mask & 1) ? -v[0] : v[0],
            (mask & 2) ? -v[1] : v[1],
            (mask & 4) ? -v[2] : v[2],
            (mask & 8) ? -v[3] : v[3],
        ]
        result.push(sv)
    }
    return result
}

/** Deduplicate vertices */
function dedup(vertices: Vec4[], tol = 1e-8): Vec4[] {
    const result: Vec4[] = []
    for (const v of vertices) {
        let found = false
        for (const r of result) {
            if (dist4Sq(v, r) < tol) { found = true; break }
        }
        if (!found) result.push(v)
    }
    return result
}

/** Scale all vertices so circumradius ≈ target */
function scaleToRadius(vertices: Vec4[], target: number): Vec4[] {
    let maxR = 0
    for (const v of vertices) {
        const r = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2 + v[3] ** 2)
        if (r > maxR) maxR = r
    }
    const s = target / maxR
    return vertices.map(v => [v[0] * s, v[1] * s, v[2] * s, v[3] * s])
}

// ─── 1. Five-cell (Pentachoron) ───────────────────────────────────────────────

function makeFiveCell(): Polytope4D {
    const s = 1 / Math.sqrt(5)
    let vertices: Vec4[] = [
        [1, 1, 1, -s],
        [1, -1, -1, -s],
        [-1, 1, -1, -s],
        [-1, -1, 1, -s],
        [0, 0, 0, 4 * s],
    ]
    vertices = scaleToRadius(vertices, 1.5)

    // Complete graph K5: all 10 pairs are edges
    const edges: [number, number][] = []
    for (let i = 0; i < 5; i++)
        for (let j = i + 1; j < 5; j++)
            edges.push([i, j])

    // All C(5,3) = 10 triples are faces
    const faces: number[][] = []
    for (let i = 0; i < 5; i++)
        for (let j = i + 1; j < 5; j++)
            for (let k = j + 1; k < 5; k++)
                faces.push([i, j, k])

    return { name: '5-cell', description: 'Pentachoron (hyper-tetrahedron)', vertices, edges, faces, faceSize: 3 }
}

// ─── 2. Eight-cell (Tesseract) ────────────────────────────────────────────────

function makeTesseract(): Polytope4D {
    const vertices: Vec4[] = []
    for (const x of [-1, 1])
        for (const y of [-1, 1])
            for (const z of [-1, 1])
                for (const w of [-1, 1])
                    vertices.push([x, y, z, w])

    // Edges: differ in exactly 1 coordinate
    const edges: [number, number][] = []
    for (let i = 0; i < 16; i++)
        for (let j = i + 1; j < 16; j++) {
            let diff = 0
            for (let k = 0; k < 4; k++)
                if (vertices[i][k] !== vertices[j][k]) diff++
            if (diff === 1) edges.push([i, j])
        }

    // 24 square faces: fix 2 dims, vary 2
    const faces: number[][] = []
    const findIdx = (x: number, y: number, z: number, w: number) =>
        vertices.findIndex(v => v[0] === x && v[1] === y && v[2] === z && v[3] === w)
    const dims = [0, 1, 2, 3]
    for (let d1 = 0; d1 < 4; d1++) {
        for (let d2 = d1 + 1; d2 < 4; d2++) {
            const fixedDims = dims.filter(d => d !== d1 && d !== d2)
            for (const v1 of [-1, 1]) {
                for (const v2 of [-1, 1]) {
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
                    const [c0, c1, c2, c3] = coords
                    const i0 = findIdx(c0[0], c0[1], c0[2], c0[3])
                    const i1 = findIdx(c1[0], c1[1], c1[2], c1[3])
                    const i2 = findIdx(c3[0], c3[1], c3[2], c3[3])
                    const i3 = findIdx(c2[0], c2[1], c2[2], c2[3])
                    if (i0 >= 0 && i1 >= 0 && i2 >= 0 && i3 >= 0) {
                        faces.push([i0, i1, i2, i3])
                    }
                }
            }
        }
    }

    return { name: '8-cell', description: 'Tesseract (hyper-cube)', vertices, edges, faces, faceSize: 4 }
}

// ─── 3. Sixteen-cell ──────────────────────────────────────────────────────────

function makeSixteenCell(): Polytope4D {
    let vertices: Vec4[] = [
        [1, 0, 0, 0], [-1, 0, 0, 0],
        [0, 1, 0, 0], [0, -1, 0, 0],
        [0, 0, 1, 0], [0, 0, -1, 0],
        [0, 0, 0, 1], [0, 0, 0, -1],
    ]
    vertices = scaleToRadius(vertices, 1.5)

    const edges = findEdges(vertices)
    const faces = findTriangles(vertices, edges)

    return { name: '16-cell', description: 'Hexadecachoron (hyper-octahedron)', vertices, edges, faces, faceSize: 3 }
}

// ─── 4. Twenty-four-cell ──────────────────────────────────────────────────────

function makeTwentyFourCell(): Polytope4D {
    // All permutations of (±1, ±1, 0, 0)
    const raw: Vec4[] = []
    for (let d1 = 0; d1 < 4; d1++) {
        for (let d2 = d1 + 1; d2 < 4; d2++) {
            for (const s1 of [-1, 1]) {
                for (const s2 of [-1, 1]) {
                    const v: Vec4 = [0, 0, 0, 0]
                    v[d1] = s1
                    v[d2] = s2
                    raw.push(v)
                }
            }
        }
    }
    let vertices = scaleToRadius(raw, 1.5)
    const edges = findEdges(vertices)
    const faces = findTriangles(vertices, edges)

    return { name: '24-cell', description: 'Icositetrachoron (self-dual)', vertices, edges, faces, faceSize: 3 }
}

// ─── 5. One-hundred-twenty-cell ───────────────────────────────────────────────

function makeOneHundredTwentyCell(): Polytope4D {
    // 600 vertices using the 7 coordinate families (Wolfram MathWorld)
    // Circumradius = 2√2
    let raw: Vec4[] = []

    // Group 1: 24 vertices — all permutations of (0, 0, ±2, ±2)
    for (const s1 of [-1, 1]) {
        for (const s2 of [-1, 1]) {
            const base: Vec4 = [0, 0, 2 * s1, 2 * s2]
            raw.push(...allPermutations(base))
        }
    }

    // Group 2: 64 vertices — all permutations of (±√5, ±1, ±1, ±1) (only position of √5 varies)
    for (const sv of allSignVariations([SQRT5, 1, 1, 1] as Vec4)) {
        raw.push(...allPermutations([sv[0], sv[1], sv[2], sv[3]] as Vec4).filter(
            p => Math.abs(Math.abs(p[0]) - SQRT5) < 0.01 ||
                Math.abs(Math.abs(p[1]) - SQRT5) < 0.01 ||
                Math.abs(Math.abs(p[2]) - SQRT5) < 0.01 ||
                Math.abs(Math.abs(p[3]) - SQRT5) < 0.01
        ))
    }

    // Group 3: 64 vertices — all permutations of (±φ⁻², ±φ, ±φ, ±φ) (only position of φ⁻² varies)
    for (const sv of allSignVariations([PHI_INV_SQ, PHI, PHI, PHI] as Vec4)) {
        raw.push(...allPermutations(sv))
    }

    // Group 4: 64 vertices — all permutations of (±φ², ±φ⁻¹, ±φ⁻¹, ±φ⁻¹)
    for (const sv of allSignVariations([PHI_SQ, PHI_INV, PHI_INV, PHI_INV] as Vec4)) {
        raw.push(...allPermutations(sv))
    }

    // Group 5: 96 vertices — all even permutations of (±φ², ±φ⁻², ±1, 0)
    for (const sv of allSignVariations([PHI_SQ, PHI_INV_SQ, 1, 0] as Vec4)) {
        raw.push(...evenPermutations(sv))
    }

    // Group 6: 96 vertices — all even permutations of (±√5, ±φ⁻¹, ±φ, 0)
    for (const sv of allSignVariations([SQRT5, PHI_INV, PHI, 0] as Vec4)) {
        raw.push(...evenPermutations(sv))
    }

    // Group 7: 192 vertices — all even permutations of (±2, ±1, ±φ, ±φ⁻¹)
    for (const sv of allSignVariations([2, 1, PHI, PHI_INV] as Vec4)) {
        raw.push(...evenPermutations(sv))
    }

    let vertices = dedup(raw)
    vertices = scaleToRadius(vertices, 1.5)

    const edges = findEdges(vertices)
    // Skip face computation for performance — too many (720 pentagonal faces)

    return { name: '120-cell', description: 'Hecatonicosachoron (hyper-dodecahedron)', vertices, edges, faces: [], faceSize: 5 }
}

// ─── 6. Six-hundred-cell ──────────────────────────────────────────────────────

function makeSixHundredCell(): Polytope4D {
    // 120 vertices in 3 groups (circumradius 2)
    let raw: Vec4[] = []

    // Group 1: 8 vertices — permutations of (±2, 0, 0, 0)
    for (const s of [-1, 1]) {
        for (let d = 0; d < 4; d++) {
            const v: Vec4 = [0, 0, 0, 0]
            v[d] = 2 * s
            raw.push(v)
        }
    }

    // Group 2: 16 vertices — (±1, ±1, ±1, ±1)
    for (const sv of allSignVariations([1, 1, 1, 1] as Vec4)) {
        raw.push(sv)
    }

    // Group 3: 96 vertices — all even permutations of (0, ±φ⁻¹, ±1, ±φ)
    for (const sv of allSignVariations([0, PHI_INV, 1, PHI] as Vec4)) {
        raw.push(...evenPermutations(sv))
    }

    let vertices = dedup(raw)
    vertices = scaleToRadius(vertices, 1.5)

    const edges = findEdges(vertices)
    const faces = findTriangles(vertices, edges)

    return { name: '600-cell', description: 'Hexacosichoron (hyper-icosahedron)', vertices, edges, faces, faceSize: 3 }
}

// ─── Export all polytopes ─────────────────────────────────────────────────────

export const POLYTOPES_4D: Polytope4D[] = [
    makeFiveCell(),
    makeTesseract(),
    makeSixteenCell(),
    makeTwentyFourCell(),
    makeOneHundredTwentyCell(),
    makeSixHundredCell(),
]
