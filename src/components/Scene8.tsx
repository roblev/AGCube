// Scene 8: 2D Graph of Hypercube Element Counts (Log2 Scale)
import { useMemo } from 'react'

// Calculate the number of m-dimensional elements in an n-dimensional hypercube
// Formula: C(n, m) * 2^(n-m) where C(n,m) is binomial coefficient
function hypercubeElements(n: number, m: number): number {
    if (m > n || m < 0 || n < 0) return 0
    if (m === 0) return Math.pow(2, n) // vertices = 2^n
    // C(n, m) * 2^(n-m)
    return binomial(n, m) * Math.pow(2, n - m)
}

// Binomial coefficient C(n, k)
function binomial(n: number, k: number): number {
    if (k > n || k < 0) return 0
    if (k === 0 || k === n) return 1
    let result = 1
    for (let i = 0; i < k; i++) {
        result = result * (n - i) / (i + 1)
    }
    return Math.round(result)
}

// Color palette for 15 lines - using a rainbow-like gradient
const LINE_COLORS = [
    '#FF0000', // Red (n=0)
    '#FF4500', // OrangeRed (n=1)
    '#FF8C00', // DarkOrange (n=2)
    '#FFD700', // Gold (n=3)
    '#ADFF2F', // GreenYellow (n=4)
    '#32CD32', // LimeGreen (n=5)
    '#00CED1', // DarkTurquoise (n=6)
    '#1E90FF', // DodgerBlue (n=7)
    '#4169E1', // RoyalBlue (n=8)
    '#8A2BE2', // BlueViolet (n=9)
    '#9932CC', // DarkOrchid (n=10)
    '#FF1493', // DeepPink (n=11)
    '#FF69B4', // HotPink (n=12)
    '#C71585', // MediumVioletRed (n=13)
    '#DB7093', // PaleVioletRed (n=14)
]

interface Scene8Props {
    // Scene 8 is UI-only, no props needed for the 3D canvas
}

export function Scene8(_props: Scene8Props) {
    // Scene 8 is UI-only, no 3D content needed
    return null
}

// Scene 8 UI - 2D Graph display
interface Scene8UIProps {
    visibleCurves: number
}

export function Scene8UI({ visibleCurves }: Scene8UIProps) {
    // Graph dimensions
    const graphWidth = 700
    const graphHeight = 500
    const padding = { top: 40, right: 40, bottom: 60, left: 70 }
    const plotWidth = graphWidth - padding.left - padding.right
    const plotHeight = graphHeight - padding.top - padding.bottom

    // Generate data for all 15 rows (n = 0 to 14)
    const graphData = useMemo(() => {
        const data: { n: number; points: { m: number; value: number; log2Value: number | null }[] }[] = []

        for (let n = 0; n < 15; n++) {
            const points: { m: number; value: number; log2Value: number | null }[] = []
            for (let m = 0; m < 15; m++) {
                const value = hypercubeElements(n, m)
                // Only include points where m <= n (valid elements)
                const log2Value = value > 0 ? Math.log2(value) : null
                points.push({ m, value, log2Value })
            }
            data.push({ n, points })
        }
        return data
    }, [])

    // Find the max log2 value for scaling
    const maxLog2 = useMemo(() => {
        let max = 0
        graphData.forEach(row => {
            row.points.forEach(p => {
                if (p.log2Value !== null && p.log2Value > max) {
                    max = p.log2Value
                }
            })
        })
        return Math.ceil(max)
    }, [graphData])

    // Scale functions
    const xScale = (m: number) => padding.left + (m / 14) * plotWidth
    const yScale = (log2Val: number) => padding.top + plotHeight - (log2Val / maxLog2) * plotHeight

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
        }}>
            <div className="glass-card" style={{
                maxWidth: '850px',
                width: '95vw',
                pointerEvents: 'auto',
                padding: '20px'
            }}>
                <h1 style={{ marginBottom: '10px', textAlign: 'center', fontSize: '24px' }}>
                    Hypercube Element Counts (Log₂ Scale)
                </h1>
                <p style={{ textAlign: 'center', opacity: 0.7, fontSize: '14px', marginBottom: '15px' }}>
                    Each line represents an n-cube (n=0 to 14), showing count of m-dimensional elements
                </p>

                {/* Formula box */}
                <div style={{
                    backgroundColor: 'rgba(255, 200, 100, 0.15)',
                    border: '1px solid rgba(255, 200, 100, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: '16px', fontFamily: 'monospace' }}>
                        Count = C(n, m) × 2<sup style={{ fontSize: '12px' }}>(n−m)</sup>
                    </span>
                    <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '6px', marginBottom: 0 }}>
                        where n = hypercube dimension, m = element dimension
                    </p>
                </div>

                <svg width={graphWidth} height={graphHeight} style={{ display: 'block', margin: '0 auto' }}>
                    {/* Background */}
                    <rect
                        x={padding.left}
                        y={padding.top}
                        width={plotWidth}
                        height={plotHeight}
                        fill="rgba(0,0,0,0.3)"
                    />

                    {/* Grid lines - vertical */}
                    {Array.from({ length: 15 }, (_, i) => (
                        <line
                            key={`vgrid-${i}`}
                            x1={xScale(i)}
                            y1={padding.top}
                            x2={xScale(i)}
                            y2={padding.top + plotHeight}
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth={1}
                        />
                    ))}

                    {/* Grid lines - horizontal */}
                    {Array.from({ length: maxLog2 + 1 }, (_, i) => (
                        <line
                            key={`hgrid-${i}`}
                            x1={padding.left}
                            y1={yScale(i)}
                            x2={padding.left + plotWidth}
                            y2={yScale(i)}
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth={1}
                        />
                    ))}

                    {/* X-axis labels */}
                    {Array.from({ length: 15 }, (_, i) => (
                        <text
                            key={`xlabel-${i}`}
                            x={xScale(i)}
                            y={padding.top + plotHeight + 20}
                            textAnchor="middle"
                            fill="white"
                            fontSize={12}
                        >
                            {i}
                        </text>
                    ))}

                    {/* Y-axis labels */}
                    {Array.from({ length: maxLog2 + 1 }, (_, i) => (
                        <text
                            key={`ylabel-${i}`}
                            x={padding.left - 10}
                            y={yScale(i) + 4}
                            textAnchor="end"
                            fill="white"
                            fontSize={12}
                        >
                            {i}
                        </text>
                    ))}

                    {/* Axis titles */}
                    <text
                        x={padding.left + plotWidth / 2}
                        y={graphHeight - 10}
                        textAnchor="middle"
                        fill="white"
                        fontSize={14}
                        fontWeight={600}
                    >
                        Element Dimension (m)
                    </text>
                    <text
                        x={20}
                        y={padding.top + plotHeight / 2}
                        textAnchor="middle"
                        fill="white"
                        fontSize={14}
                        fontWeight={600}
                        transform={`rotate(-90, 20, ${padding.top + plotHeight / 2})`}
                    >
                        log₂(count)
                    </text>

                    {/* Plot lines for each n-cube */}
                    {graphData.filter(row => row.n < visibleCurves).map((row) => {
                        const n = row.n // Use row.n explicitly for clarity
                        // Filter to only valid points (where value > 0 and m <= n)
                        const validPoints = row.points.filter(p => p.log2Value !== null && p.m <= n)
                        if (validPoints.length === 0) return null

                        // Create path (only if more than 1 point)
                        const pathData = validPoints.length >= 2
                            ? validPoints.map((p, i) => {
                                const x = xScale(p.m)
                                const y = yScale(p.log2Value!)
                                return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
                            }).join(' ')
                            : null

                        return (
                            <g key={`line-${n}`}>
                                {pathData && (
                                    <path
                                        d={pathData}
                                        fill="none"
                                        stroke={LINE_COLORS[n]}
                                        strokeWidth={2}
                                        opacity={0.9}
                                    />
                                )}
                                {/* Data points */}
                                {validPoints.map(p => (
                                    <circle
                                        key={`point-${n}-${p.m}`}
                                        cx={xScale(p.m)}
                                        cy={yScale(p.log2Value!)}
                                        r={4}
                                        fill={LINE_COLORS[n]}
                                    />
                                ))}
                            </g>
                        )
                    })}
                </svg>

                {/* Legend - only show visible curves */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '15px',
                    fontSize: '11px'
                }}>
                    {Array.from({ length: visibleCurves }, (_, n) => (
                        <div key={`legend-${n}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{
                                width: '16px',
                                height: '3px',
                                backgroundColor: LINE_COLORS[n],
                                borderRadius: '1px'
                            }} />
                            <span style={{ opacity: 0.8 }}>n={n}</span>
                        </div>
                    ))}
                </div>

                {/* Progress text */}
                <p style={{ marginTop: '16px', textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
                    {visibleCurves < 15
                        ? `Press Space to show next curve (${visibleCurves}/15)`
                        : 'All curves shown! Press Space to reset'}
                </p>
            </div>
        </div>
    )
}
