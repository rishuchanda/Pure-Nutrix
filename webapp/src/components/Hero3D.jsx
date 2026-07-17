import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import './Hero3D.css';

// Interactive Anti-Gravity Dots (Gold & Green on Light Theme)
const InteractiveParticles = () => {
  const ref = useRef();
  const groupRef = useRef();
  const materialRef = useRef();
  const count = 400; // Reduced number of dots for a cleaner, more minimal look
  
  const [clickPulse, setClickPulse] = useState(0);

  // Generate original static positions and colors
  const { positions, originalPositions, colors } = useMemo(() => {
    const orig = random.inSphere(new Float32Array(count * 3), { radius: 11 });
    const pos = new Float32Array(orig);
    
    const cols = new Float32Array(count * 3);
    const colorGold = new THREE.Color('#d4af37');
    const colorGreen = new THREE.Color('#059669');
    
    for (let i = 0; i < count; i++) {
      const isGold = Math.random() > 0.3; 
      const color = isGold ? colorGold : colorGreen;
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return { positions: pos, originalPositions: orig, colors: cols };
  }, [count]);

  // Listen for clicks to trigger the shockwave effect
  useEffect(() => {
    const handleClick = () => setClickPulse(1);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const lastActivity = useRef({ x: 0, y: 0, scroll: 0 });
  const activityLevel = useRef(0);

  useFrame((state, delta) => {
    if (clickPulse > 0) {
      setClickPulse((prev) => Math.max(0, prev - delta * 1.5));
    }

    const mouseX = state.mouse.x;
    const mouseY = state.mouse.y;
    const scrollY = window.scrollY;

    // Detect user activity (mouse movement or scroll)
    const dxActivity = Math.abs(mouseX - lastActivity.current.x);
    const dyActivity = Math.abs(mouseY - lastActivity.current.y);
    const dsActivity = Math.abs(scrollY - lastActivity.current.scroll);

    if (dxActivity > 0.001 || dyActivity > 0.001 || dsActivity > 1 || clickPulse > 0) {
      activityLevel.current = 1; // Fully visible
    } else {
      // Very slow and smooth fade out when idle
      activityLevel.current = Math.max(0, activityLevel.current - delta * 0.4);
    }

    lastActivity.current = { x: mouseX, y: mouseY, scroll: scrollY };

    if (materialRef.current) {
      // Use size scaling instead of opacity to guarantee it works on all GPUs (Safari bug fix)
      materialRef.current.opacity = 0.9;
      materialRef.current.size = activityLevel.current * 0.08;
    }

    // 1. Make the entire sphere FOLLOW the cursor's position smoothly
    const targetRotX = mouseY * 0.5; 
    const targetRotY = mouseX * 0.5;
    
    // Make the dots physically move left/right/up/down with the cursor
    const targetPosX = mouseX * 4; 
    const targetPosY = mouseY * 4;

    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.02; 
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.02;
    
    groupRef.current.position.x += (targetPosX - groupRef.current.position.x) * 0.05;
    groupRef.current.position.y += (targetPosY - groupRef.current.position.y) * 0.05;

    // Update individual particle positions (Only for scroll and shockwave now)
    const positionsArray = ref.current.geometry.attributes.position.array;
    const scrollOffset = scrollY * 0.005;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // Base positions with scroll offset
      let targetX = originalPositions[ix];
      let targetY = originalPositions[iy] + scrollOffset;
      let targetZ = originalPositions[iz];

      // Click Shockwave Logic
      if (clickPulse > 0) {
        const waveForce = clickPulse * 4;
        targetX += (originalPositions[ix] / 10) * waveForce;
        targetY += (originalPositions[iy] / 10) * waveForce;
        targetZ += (originalPositions[iz] / 10) * waveForce;
      }

      // Very smooth interpolation back to original shape
      positionsArray[ix] += (targetX - positionsArray[ix]) * 0.08;
      positionsArray[iy] += (targetY - positionsArray[iy]) * 0.08;
      positionsArray[iz] += (targetZ - positionsArray[iz]) * 0.08;
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <bufferAttribute attach="attributes-color" array={colors} itemSize={3} />
        <PointMaterial 
          ref={materialRef}
          transparent 
          vertexColors={true}
          size={0} 
          sizeAttenuation={true} 
          depthWrite={false} 
          opacity={0.9} 
        />
      </Points>
    </group>
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
