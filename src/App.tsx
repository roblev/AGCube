import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Scene1, Scene1UI } from './components/Scene1'
import { Scene2, Scene2UI, ROTATION_MODES } from './components/Scene2'
import { Scene3, Scene3UI, HYPERCUBE_ROW_COUNT } from './components/Scene3'
import { Scene4, Scene4UI } from './components/Scene4'

function App() {
  const [activeScene, setActiveScene] = useState(1)
  const [w, setW] = useState(0.5)
  const [rotationMode, setRotationMode] = useState(0) // For Scene 2 tesseract rotation
  const [isPaused, setIsPaused] = useState(false) // For Scene 2 animation pause
  const [resetTrigger, setResetTrigger] = useState(0) // For Scene 2 reset
  const [showArrows, setShowArrows] = useState(false) // For Scene 1 arrows
  const [visibleRows, setVisibleRows] = useState(0) // For Scene 3 table rows
  const [zSlice, setZSlice] = useState(0.5) // For Scene 4 z-axis slice

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys for scene switching
      if (e.code.startsWith('Digit')) {
        const sceneNum = parseInt(e.code.replace('Digit', ''))
        if (sceneNum >= 0 && sceneNum <= 9) {
          setActiveScene(sceneNum)
        }
      }

      // Spacebar handler - Scene 2 specific (toggle rotation planes)
      if (e.code === 'Space' && activeScene === 2) {
        e.preventDefault()
        setRotationMode((prev) => (prev + 1) % ROTATION_MODES.length)
      }

      // Spacebar handler - Scene 3 specific (reveal next row)
      if (e.code === 'Space' && activeScene === 3) {
        e.preventDefault()
        setVisibleRows((prev) => prev >= HYPERCUBE_ROW_COUNT ? 0 : prev + 1)
      }

      // P key handler - Scene 2 specific (toggle pause)
      if (e.code === 'KeyP' && activeScene === 2) {
        e.preventDefault()
        setIsPaused((prev) => !prev)
      }

      // R key handler - Scene 2 specific (reset orientation)
      if (e.code === 'KeyR' && activeScene === 2) {
        e.preventDefault()
        setResetTrigger((prev) => prev + 1)
      }

      // A key handler - Scene 1 specific (toggle arrows)
      if (e.code === 'KeyA' && activeScene === 1) {
        e.preventDefault()
        setShowArrows((prev) => !prev)
      }

      // Arrow key handlers - Scene 4 specific (z-axis navigation)
      if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && activeScene === 4) {
        e.preventDefault()
        if (e.code === 'ArrowLeft') {
          setZSlice((prev) => Math.max(-0.5, Math.round((prev - 0.01) * 100) / 100))
        } else if (e.code === 'ArrowRight') {
          setZSlice((prev) => Math.min(1.5, Math.round((prev + 0.01) * 100) / 100))
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeScene])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      {/* Scene 4 has its own split-view layout */}
      {activeScene === 4 ? (
        <Scene4 z={zSlice} setZ={setZSlice} />
      ) : (
        <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
          {/* Shared Lights */}
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1} />

          {/* Shared Starfield */}
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

          {/* Scene-specific content */}
          {activeScene === 1 && <Scene1 w={w} setW={setW} showArrows={showArrows} />}
          {activeScene === 2 && <Scene2 rotationMode={rotationMode} isPaused={isPaused} resetTrigger={resetTrigger} />}
          {activeScene === 3 && <Scene3 visibleRows={visibleRows} />}

          {/* Shared Controls */}
          <OrbitControls makeDefault />
        </Canvas>
      )}

      {/* Overlay UI */}
      <div className="overlay-container">
        {/* Scene Indicator (shared) */}
        <div className="glass-card" style={{ padding: '12px 16px', minWidth: 'auto' }}>
          <span style={{ fontSize: '14px', opacity: 0.7 }}>Scene</span>
          <span style={{ fontSize: '24px', fontWeight: 600, marginLeft: '8px' }}>{activeScene}</span>
          <span style={{ fontSize: '12px', opacity: 0.5, marginLeft: '8px' }}>Press 0-9 to switch</span>
        </div>

        {/* Scene-specific UI */}
        {activeScene === 1 && <Scene1UI w={w} setW={setW} showArrows={showArrows} />}
        {activeScene === 2 && <Scene2UI rotationMode={rotationMode} isPaused={isPaused} />}
        {activeScene === 3 && <Scene3UI visibleRows={visibleRows} />}
        {activeScene === 4 && <Scene4UI z={zSlice} setZ={setZSlice} />}
      </div>
    </div>
  )
}

export default App
