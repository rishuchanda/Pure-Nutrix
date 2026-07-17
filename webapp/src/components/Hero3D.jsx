import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import './Hero3D.css';

// Interactive Physics Particle Engine (Cursor Repulsion)
const InteractiveParticles = () => {
  const ref = useRef();
  const materialRef = useRef();
  
  const count = 5000; // Dense field of tiny dots

  // Generate original static positions, colors, and initial velocities
  const { positions, originalPositions, colors, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    
    // Requested Theme colors: Blue, Red, Orange, Yellow
    const colorPalette = [
      new THREE.Color('#3b82f6'), // Blue
      new THREE.Color('#ef4444'), // Red
      new THREE.Color('#f97316'), // Orange
      new THREE.Color('#eab308')  // Yellow
    ];
    
    for (let i = 0; i < count; i++) {
      // Spread particles across a wide 2D plane (x, y) with slight z depth variation
      const x = (Math.random() - 0.5) * 45; 
      const y = (Math.random() - 0.5) * 35;
      const z = (Math.random() - 0.5) * 2; 

      orig[i * 3] = x;
      orig[i * 3 + 1] = y;
      orig[i * 3 + 2] = z;
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      vels[i * 3] = 0;
      vels[i * 3 + 1] = 0;
      vels[i * 3 + 2] = 0;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return { positions: pos, originalPositions: orig, colors: cols, velocities: vels };
  }, [count]);

  const { viewport } = useThree();

  useFrame((state, delta) => {
    // Get mouse position in world space
    const mouseX = (state.mouse.x * viewport.width) / 2;
    const mouseY = (state.mouse.y * viewport.height) / 2;

    const positionsArray = ref.current.geometry.attributes.position.array;

    const repulsionRadius = 5.0; // Size of the cursor repulsion field
    const repulsionStrength = 1.8; // How hard particles are pushed away
    const springStrength = 0.04; // How fast they return to original position
    const friction = 0.88; // Physics drag

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      let pX = positionsArray[ix];
      let pY = positionsArray[iy];
      let pZ = positionsArray[iz];

      const oX = originalPositions[ix];
      const oY = originalPositions[iy];
      const oZ = originalPositions[iz];

      let vX = velocities[ix];
      let vY = velocities[iy];
      let vZ = velocities[iz];

      // Calculate distance to mouse
      const dx = pX - mouseX;
      const dy = pY - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Repulsion force
      if (dist < repulsionRadius) {
        const force = (repulsionRadius - dist) / repulsionRadius; // 0 to 1
        // Avoid division by zero by adding a tiny offset if perfectly on top
        const pushX = (dx / (dist || 0.01)) * force * repulsionStrength;
        const pushY = (dy / (dist || 0.01)) * force * repulsionStrength;

        vX += pushX;
        vY += pushY;
        vZ += (Math.random() - 0.5) * force * repulsionStrength; // Slight Z pop out of the plane
      }

      // Spring force back to original position
      vX += (oX - pX) * springStrength;
      vY += (oY - pY) * springStrength;
      vZ += (oZ - pZ) * springStrength;

      // Apply friction
      vX *= friction;
      vY *= friction;
      vZ *= friction;

      // Update positions and velocities
      velocities[ix] = vX;
      velocities[iy] = vY;
      velocities[iz] = vZ;

      positionsArray[ix] += vX;
      positionsArray[iy] += vY;
      positionsArray[iz] += vZ;
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        ref={materialRef}
        transparent 
        vertexColors={true}
        size={0.06} 
        sizeAttenuation={true} 
        depthWrite={false} 
        opacity={0.8} 
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const Hero3D = () => {
  return (
    <section className="hero-section-interactive" id="home">
      
      {/* Interactive 3D Canvas */}
      <div className="hero-canvas-interactive">
        <Canvas 
          camera={{ position: [0, 0, 20], fov: 45 }}
          eventSource={typeof document !== 'undefined' ? document.body : undefined} // Track mouse globally
          eventPrefix="client"
        >
          <ambientLight intensity={0.5} />
          <InteractiveParticles />
        </Canvas>
      </div>

      {/* Foreground Content */}
      <div className="hero-content-interactive container">
        <motion.div 
          className="interactive-text-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <motion.h1 
            className="interactive-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Awaken Your <br />
            Pure Radiance.
          </motion.h1>

          <motion.div 
            className="interactive-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <button className="btn-ag-primary">
              <span className="btn-icon">✨</span>
              Shop The Collection
            </button>
            <button className="btn-ag-secondary">
              Discover Our Science
            </button>
          </motion.div>
        </motion.div>
      </div>
      
    </section>
  );
};

export default Hero3D;
