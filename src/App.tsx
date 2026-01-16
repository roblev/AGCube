import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Scene1, Scene1UI } from './components/Scene1'
import { Scene2, Scene2UI, ROTATION_MODES } from './components/Scene2'
import { Scene3, Scene3UI, HYPERCUBE_ROW_COUNT } from './components/Scene3'
import { Scene4, Scene4UI } from './components/Scene4'
import { Scene5, Scene5UI } from './components/Scene5'
import { Scene6, Scene6UI } from './components/Scene6'
import { Scene7, Scene7UI } from './components/Scene7'

function App() {
  const [activeScene, setActiveScene] = useState(1)
  const [w, setW] = useState(0.5)
  const [rotationMode, setRotationMode] = useState(0) // For Scene 2 tesseract rotation
  const [isPaused, setIsPaused] = useState(false) // For Scene 2 animation pause
  const [resetTrigger, setResetTrigger] = useState(0) // For Scene 2 reset
  const [showArrows, setShowArrows] = useState(false) // For Scene 1 arrows
  const [visibleRows, setVisibleRows] = useState(0) // For Scene 3 table rows
  const [zSlice, setZSlice] = useState(0.5) // For Scene 4 z-axis slice
  const [scene4Rotation, setScene4Rotation] = useState<[number, number, number]>([0, 0, 0]) // For Scene 4 cube rotation
  const [scene4ShowArrows, setScene4ShowArrows] = useState(false) // For Scene 4 arrows toggle
  const [scene5W, setScene5W] = useState(0.5) // For Scene 5 w-axis slice
  const [scene5Paused, setScene5Paused] = useState(false) // For Scene 5 rotation pause
  const [scene5RotationMode, setScene5RotationMode] = useState(0) // For Scene 5 rotation planes
  const [scene5ResetTrigger, setScene5ResetTrigger] = useState(0) // For Scene 5 orientation reset
  const [scene6Stage, setScene6Stage] = useState(0) // For Scene 6 dimension stage (0-4)
  const [scene6AnimProgress, setScene6AnimProgress] = useState(0) // For Scene 6 animation progress
  const [scene7Stage, setScene7Stage] = useState(0) // For Scene 7 stage (0-4)
  const [scene7AnimProgress, setScene7AnimProgress] = useState(0) // For Scene 7 animation progress

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
        // +1 for the formula row that shows after all data rows
        setVisibleRows((prev) => prev >= HYPERCUBE_ROW_COUNT + 1 ? 0 : prev + 1)
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

      // Rotation keys for Scene 4 (ZX for X-axis, AS for Y-axis, QW for Z-axis)
      if (activeScene === 4) {
        const rotStep = Math.PI / 18 // 10 degrees in radians
        const normalize = (angle: number) => {
          // Keep angle in [0, 2π) range
          const twoPi = 2 * Math.PI
          return ((angle % twoPi) + twoPi) % twoPi
        }
        if (e.code === 'KeyZ') {
          e.preventDefault()
          setScene4Rotation(prev => [normalize(prev[0] + rotStep), prev[1], prev[2]])
        }
        if (e.code === 'KeyX') {
          e.preventDefault()
          setScene4Rotation(prev => [normalize(prev[0] - rotStep), prev[1], prev[2]])
        }
        if (e.code === 'KeyA') {
          e.preventDefault()
          setScene4Rotation(prev => [prev[0], normalize(prev[1] + rotStep), prev[2]])
        }
        if (e.code === 'KeyS') {
          e.preventDefault()
          setScene4Rotation(prev => [prev[0], normalize(prev[1] - rotStep), prev[2]])
        }
        if (e.code === 'KeyQ') {
          e.preventDefault()
          setScene4Rotation(prev => [prev[0], prev[1], normalize(prev[2] + rotStep)])
        }
        if (e.code === 'KeyW') {
          e.preventDefault()
          setScene4Rotation(prev => [prev[0], prev[1], normalize(prev[2] - rotStep)])
        }
        if (e.code === 'KeyR') {
          e.preventDefault()
          setScene4Rotation([0, 0, 0])
        }
        if (e.code === 'KeyO') {
          e.preventDefault()
          setScene4ShowArrows(prev => !prev)
        }
      }

      // Arrow key handlers - Scene 5 specific (w-axis navigation)
      if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && activeScene === 5) {
        e.preventDefault()
        if (e.code === 'ArrowLeft') {
          setScene5W((prev) => Math.max(-0.5, Math.round((prev - 0.01) * 100) / 100))
        } else if (e.code === 'ArrowRight') {
          setScene5W((prev) => Math.min(1.5, Math.round((prev + 0.01) * 100) / 100))
        }
      }

      // P key handler - Scene 5 specific (toggle rotation pause)
      if (e.code === 'KeyP' && activeScene === 5) {
        e.preventDefault()
        setScene5Paused((prev) => !prev)
      }

      // Spacebar handler - Scene 5 specific (toggle rotation planes and reset orientation)
      if (e.code === 'Space' && activeScene === 5) {
        e.preventDefault()
        setScene5RotationMode((prev) => (prev + 1) % ROTATION_MODES.length)
        setScene5ResetTrigger((prev) => prev + 1) // Reset orientation on each mode change
      }

      // Spacebar handler - Scene 6 specific (advance dimension stage)
      if (e.code === 'Space' && activeScene === 6) {
        e.preventDefault()
        setScene6Stage((prev) => (prev + 1) % 6) // Cycle through 0-5 (6 stages)
        setScene6AnimProgress(0) // Reset animation progress
      }

      // Spacebar handler - Scene 7 specific (advance stage)
      if (e.code === 'Space' && activeScene === 7) {
        e.preventDefault()
        setScene7Stage((prev) => (prev + 1) % 14) // Cycle through 0-13 (14 stages)
        setScene7AnimProgress(0) // Reset animation progress
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeScene])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      {/* Scene 4 has its own split-view layout */}
      {activeScene === 4 ? (
        <Scene4 z={zSlice} setZ={setZSlice} rotation={scene4Rotation} showArrows={scene4ShowArrows} />
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
          {activeScene === 5 && <Scene5 w={scene5W} setW={setScene5W} isPaused={scene5Paused} rotationMode={scene5RotationMode} resetTrigger={scene5ResetTrigger} />}
          {activeScene === 6 && <Scene6 stage={scene6Stage} animProgress={scene6AnimProgress} setAnimProgress={setScene6AnimProgress} />}
          {activeScene === 7 && <Scene7 stage={scene7Stage} animProgress={scene7AnimProgress} setAnimProgress={setScene7AnimProgress} />}

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
        {activeScene === 4 && <Scene4UI z={zSlice} setZ={setZSlice} rotation={scene4Rotation} showArrows={scene4ShowArrows} />}
        {activeScene === 5 && <Scene5UI w={scene5W} setW={setScene5W} isPaused={scene5Paused} rotationMode={scene5RotationMode} />}
        {activeScene === 6 && <Scene6UI stage={scene6Stage} />}
        {activeScene === 7 && <Scene7UI stage={scene7Stage} />}
      </div>
    </div>
  )
}

export default App
