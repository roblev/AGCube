import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment, Text, Billboard } from '@react-three/drei'
import { Cube } from './components/Cube'

function App() {
  const [w, setW] = useState(0.5)

  // Arrow key navigation for w-axis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        const newVal = Math.max(-0.5, w - 0.05)
        setW(Math.round(newVal * 100) / 100)
      } else if (e.code === 'ArrowRight') {
        const newVal = Math.min(1.5, w + 0.05)
        setW(Math.round(newVal * 100) / 100)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [w])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
        {/* Lights */}
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        {/* Interior light - more diffuse with larger falloff */}
        <pointLight position={[0.5, 0.5, 0.5]} intensity={1.5} distance={5} decay={1} />
        {/* Hemisphere light for soft ambient fill */}
        <hemisphereLight intensity={0.4} groundColor="#444" />

        {/* Environment for reflections */}
        <Environment preset="city" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Content */}
        <Cube w={w} />

        {/* Custom thick axes */}
        {(() => {
          const extendToOrigin = w < 0 || w > 1
          const length = extendToOrigin ? 2.5 : 1.5
          const center = extendToOrigin ? 1.25 : 1.75

          return (
            <>
              {/* X axis - Red */}
              <mesh position={[center, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, length, 8]} />
                <meshStandardMaterial color="red" transparent opacity={0.5} />
              </mesh>
              {/* Y axis - Green */}
              <mesh position={[0, center, 0]}>
                <cylinderGeometry args={[0.01, 0.01, length, 8]} />
                <meshStandardMaterial color="green" transparent opacity={0.5} />
              </mesh>
              {/* Z axis - Blue */}
              <mesh position={[0, 0, center]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.01, length, 8]} />
                <meshStandardMaterial color="blue" transparent opacity={0.5} />
              </mesh>
            </>
          )
        })()}

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
          {/* Rotate X to face along X axis */}
          <Text position={[2.7, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.3} color="#ff8888">X</Text>

          {/* Y Axis Labels */}
          <Billboard position={[-0.1, 1, 0]}>
            <Text fontSize={0.15} color="white">1</Text>
          </Billboard>
          <Billboard position={[-0.1, 2, 0]}>
            <Text fontSize={0.15} color="white">2</Text>
          </Billboard>
          {/* Rotate Y to face along Y axis */}
          <Text position={[0, 2.7, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.3} color="#88ff88">Y</Text>

          {/* Z Axis Labels */}
          <Billboard position={[0, -0.1, 1]}>
            <Text fontSize={0.15} color="white">1</Text>
          </Billboard>
          <Billboard position={[0, -0.1, 2]}>
            <Text fontSize={0.15} color="white">2</Text>
          </Billboard>
          <Text position={[0, 0, 2.7]} fontSize={0.3} color="#8888ff">Z</Text>
        </group>

        {/* Controls */}
        <OrbitControls makeDefault />
      </Canvas>

      {/* Overlay UI */}
      <div className="overlay-container">
        <div className="glass-card title-card">
          <h1>4D Cube Viewer</h1>
          <p>Left click + drag rotates</p>
          <p>Right click + drag pans</p>
          <p>Scroll zooms</p>
          <p>Arrow keys adjust W-axis</p>
          <p>Space bar slices corner</p>
        </div>

        <div className="glass-card">
          <div className="control-group">
            <div className="slider-label">
              <span>W-axis value</span>
              <span className={`slider-value ${Math.abs(w) < 0.05 || Math.abs(w - 1) < 0.05 ? 'highlight' : ''}`}>
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
      </div>
    </div>
  )
}

export default App
