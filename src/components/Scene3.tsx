// Scene 3: Hypercube Properties Table
import { useState, useEffect } from 'react'

// Hypercube data table
const HYPERCUBE_DATA = [
    { n: 0, name: 'Point', vertices: 1, edges: 0, faces: 0, cells: 0, tesseracts: 0 },
    { n: 1, name: 'Line Segment', vertices: 2, edges: 1, faces: 0, cells: 0, tesseracts: 0 },
    { n: 2, name: 'Square', vertices: 4, edges: 4, faces: 1, cells: 0, tesseracts: 0 },
    { n: 3, name: 'Cube', vertices: 8, edges: 12, faces: 6, cells: 1, tesseracts: 0 },
    { n: 4, name: 'Tesseract', vertices: 16, edges: 32, faces: 24, cells: 8, tesseracts: 1 },
    { n: 5, name: 'Penteract', vertices: 32, edges: 80, faces: 80, cells: 40, tesseracts: 10 },
    { n: 6, name: 'Hexeract', vertices: 64, edges: 192, faces: 240, cells: 160, tesseracts: 60 },
    { n: 7, name: 'Hepteract', vertices: 128, edges: 448, faces: 672, cells: 560, tesseracts: 280 },
    { n: 8, name: 'Octeract', vertices: 256, edges: 1024, faces: 1792, cells: 1792, tesseracts: 1120 },
    { n: 9, name: 'Enneract', vertices: 512, edges: 2304, faces: 4608, cells: 5376, tesseracts: 4032 },
    { n: 10, name: 'Dekeract', vertices: 1024, edges: 5120, faces: 11520, cells: 15360, tesseracts: 13440 },
]

interface Scene3Props {
    visibleRows: number
}

export function Scene3(_props: Scene3Props) {
    // Scene 3 is UI-only, no 3D content needed
    return null
}

// Scene 3 UI - Table display
interface Scene3UIProps {
    visibleRows: number
}

export function Scene3UI({ visibleRows }: Scene3UIProps) {
    // Track which row should be highlighted (transient effect)
    const [highlightedRow, setHighlightedRow] = useState<number | null>(null)
    const [fadeOut, setFadeOut] = useState(false)

    // When visibleRows changes, highlight the newest row then fade it out
    useEffect(() => {
        if (visibleRows > 0) {
            // Highlight the newest row
            setHighlightedRow(visibleRows - 1)
            setFadeOut(false)

            // Start fade-out after a brief moment
            const fadeTimer = setTimeout(() => {
                setFadeOut(true)
            }, 100)

            // Clear highlight after fade completes
            const clearTimer = setTimeout(() => {
                setHighlightedRow(null)
            }, 1500)

            return () => {
                clearTimeout(fadeTimer)
                clearTimeout(clearTimer)
            }
        }
    }, [visibleRows])

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
            <div className="glass-card" style={{ maxWidth: '900px', width: '90vw', pointerEvents: 'auto' }}>
                <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>Hypercube Properties</h1>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '18px',
                    tableLayout: 'fixed'
                }}>
                    <colgroup>
                        <col style={{ width: '60px' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '100px' }} />
                    </colgroup>
                    <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.3)' }}>
                            <th style={{ padding: '12px 8px', textAlign: 'center' }}>n</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Vertices</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Edges</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Faces</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Cells</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>4-Faces</th>
                        </tr>
                    </thead>
                    <tbody>
                        {HYPERCUBE_DATA.slice(0, visibleRows).map((row, i) => {
                            const isHighlighted = i === highlightedRow
                            return (
                                <tr
                                    key={row.n}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                                        backgroundColor: isHighlighted
                                            ? (fadeOut ? 'transparent' : 'rgba(100, 200, 255, 0.4)')
                                            : 'transparent',
                                        transition: fadeOut ? 'background-color 1.2s ease-out' : 'none'
                                    }}
                                >
                                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>{row.n}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'left' }}>{row.name}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{row.vertices}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{row.edges}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{row.faces}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{row.cells}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{row.tesseracts}</td>
                                </tr>
                            )
                        })}
                        {/* Formula row - shown after all data rows */}
                        {visibleRows > HYPERCUBE_DATA.length && (
                            <tr style={{
                                borderTop: '2px solid rgba(255,255,255,0.3)',
                                backgroundColor: 'rgba(255, 200, 100, 0.1)',
                                fontStyle: 'italic'
                            }}>
                                <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>n</td>
                                <td style={{ padding: '12px 8px', textAlign: 'left' }}>n-cube</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px' }}>2ⁿ</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px' }}>n·2ⁿ⁻¹</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px' }}>C(n,2)·2ⁿ⁻²</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px' }}>C(n,3)·2ⁿ⁻³</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px' }}>C(n,4)·2ⁿ⁻⁴</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {visibleRows <= HYPERCUBE_DATA.length && (
                    <p style={{ marginTop: '16px', textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
                        Press Space to reveal next row ({visibleRows}/{HYPERCUBE_DATA.length + 1})
                    </p>
                )}
                {visibleRows > HYPERCUBE_DATA.length && (
                    <p style={{ marginTop: '16px', textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
                        All rows revealed! Press Space to reset
                    </p>
                )}
            </div>
        </div>
    )
}

export const HYPERCUBE_ROW_COUNT = HYPERCUBE_DATA.length

