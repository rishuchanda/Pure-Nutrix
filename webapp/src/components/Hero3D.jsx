import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import './Hero3D.css';

// Interactive Physics Particle Engine (Cursor Repulsion)
const InteractiveParticles = () => {
  const ref = useRef();
  const materialRef = useRef();
  
  const count = 3000; // Less dense for a cleaner, premium look

  // Generate original static positions and colors
  const { positions, originalPositions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    
    // Pure Nutrix Theme Colors: Gold, Dark Gold, Health Green, and Light Beige
    const colorPalette = [
      new THREE.Color('#d4af37'), // Gold
      new THREE.Color('#b5952f'), // Dark Gold
      new THREE.Color('#059669'), // Health Green
      new THREE.Color('#ebdca2')  // Light Beige/Gold
    ];
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 45; 
      const y = (Math.random() - 0.5) * 35;
      const z = (Math.random() - 0.5) * 2; 

      orig[i * 3] = x;
      orig[i * 3 + 1] = y;
      orig[i * 3 + 2] = z;
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return { positions: pos, originalPositions: orig, colors: cols };
  }, [count]);

  const circleTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(32, 32, 30, 0, 2 * Math.PI);
    context.fillStyle = 'white';
    context.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useFrame((state, delta) => {
    // Detect user activity (mouse movement and scroll)
    const mouseXNorm = state.mouse.x;
    const mouseYNorm = state.mouse.y;
    const scrollY = window.scrollY;

    const dxActivity = Math.abs(mouseXNorm - lastActivity.current.x);
    const dyActivity = Math.abs(mouseYNorm - lastActivity.current.y);
    const dsActivity = Math.abs(scrollY - lastActivity.current.scroll);

    if (dxActivity > 0.001 || dyActivity > 0.001 || dsActivity > 1) {
      activityLevel.current = 1; // Fully visible
    } else {
      // Very slow and smooth fade out when idle
      activityLevel.current = Math.max(0, activityLevel.current - delta * 0.5);
    }
    lastActivity.current = { x: mouseXNorm, y: mouseYNorm, scroll: scrollY };

    if (materialRef.current) {
      materialRef.current.opacity = activityLevel.current * 0.8;
    }

    // Get mouse position in world space
    const mouseX = (mouseXNorm * viewport.width) / 2;
    const mouseY = (mouseYNorm * viewport.height) / 2;

    const positionsArray = ref.current.geometry.attributes.position.array;
    const time = state.clock.elapsedTime * 0.3; // Slightly faster base wave for more life
    const interactionRadius = 8.0; 

    // Scroll reverse animation (Parallax effect)
    const scrollOffset = scrollY * 0.015;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      const oX = originalPositions[ix];
      const oY = originalPositions[iy];
      const oZ = originalPositions[iz];

      // Premium Organic Fluid Wave Motion + Reverse Scroll Parallax
      let targetX = oX;
      let targetY = oY + scrollOffset;
      let targetZ = oZ + Math.sin(oX * 0.2 + time) * 1.5 + Math.cos(oY * 0.2 + time) * 1.5;

      const dx = targetX - mouseX;
      const dy = targetY - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Trailing Effect (Pulling towards the cursor gently)
      if (dist < interactionRadius && activityLevel.current > 0) {
        const force = (interactionRadius - dist) / interactionRadius; 
        const smoothForce = force * force * (3 - 2 * force); 
        
        // Increased pull for more visible motion
        targetX -= (dx / (dist || 0.01)) * smoothForce * 2.0;
        targetY -= (dy / (dist || 0.01)) * smoothForce * 2.0;
        targetZ += smoothForce * 2.5; 
      }

      // Slightly faster interpolation for more responsiveness
      positionsArray[ix] += (targetX - positionsArray[ix]) * 0.04;
      positionsArray[iy] += (targetY - positionsArray[iy]) * 0.04;
      positionsArray[iz] += (targetZ - positionsArray[iz]) * 0.04;
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
        size={0.16} 
        sizeAttenuation={true} 
        depthWrite={false} 
        opacity={0.8} 
        map={circleTexture}
        alphaTest={0.5}
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
