import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Hero3D.css';

// A simple, elegant 2D constellation particle system
const InteractiveParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles = [];
    const count = window.innerWidth < 768 ? 80 : 150; // More particles since they are small dots
    
    const colors = ['#111111', '#6b7280', '#9ca3af', '#d1d5db']; // Black, dark grey, medium grey, light grey

    let mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
    let lastMouse = { x: -1000, y: -1000 };

    for (let i = 0; i < count; i++) {
      let radius;
      if (Math.random() > 0.85) {
        radius = Math.random() * 2 + 2.5; // 15% chance for larger dots (2.5 to 4.5)
      } else {
        radius = Math.random() * 1.5 + 0.5; // 85% chance for normal small dots (0.5 to 2.0)
      }

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3, // Very slow base movement
        vy: (Math.random() - 0.5) * 0.3,
        baseVx: (Math.random() - 0.5) * 0.3,
        baseVy: (Math.random() - 0.5) * 0.3,
        radius: radius,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const handleMouseMove = (e) => {
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY; // Canvas is now fixed, so clientY directly maps to canvas Y
      
      mouse.vx = mouse.x - lastMouse.x;
      mouse.vy = mouse.y - lastMouse.y;
    };
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.vx = 0;
      mouse.vy = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Decay mouse velocity if idle
      mouse.vx *= 0.9;
      mouse.vy *= 0.9;

      for (let i = 0; i < count; i++) {
        let p = particles[i];
        
        // Distance to cursor
        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        // Magnet effect: pull particles within radius
        const interactionRadius = 150;
        
        if (dist < interactionRadius) {
          const force = (interactionRadius - dist) / interactionRadius;
          
          // Pull towards cursor position
          p.vx += dx * force * 0.005;
          p.vy += dy * force * 0.005;
          
          // Also apply cursor's velocity (drag effect)
          p.vx += mouse.vx * force * 0.05;
          p.vy += mouse.vy * force * 0.05;
        } else {
          // Slowly return to natural base velocity
          p.vx += (p.baseVx - p.vx) * 0.02;
          p.vy += (p.baseVy - p.vy) * 0.02;
        }

        // Apply friction/damping to prevent explosive speeds
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges smoothly
        if (p.x < 0) { p.x = 0; p.vx *= -1; p.baseVx *= -1; }
        if (p.x > width) { p.x = width; p.vx *= -1; p.baseVx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; p.baseVy *= -1; }
        if (p.y > height) { p.y = height; p.vy *= -1; p.baseVy *= -1; }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-canvas-interactive" />;
};

const Hero3D = () => {
  return (
    <section className="hero-section-interactive" id="home">
      
      {/* 2D Physics Canvas Background */}
      <InteractiveParticles />

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
