import React, { useEffect, useState } from 'react';
import { playRobotSound } from '../utils/robotSounds';

const CuteRobot = () => {
  const [mood, setMood] = useState('idle');

  useEffect(() => {
    // Randomly change mood and play sounds
    const interval = setInterval(() => {
      const moods = ['idle', 'happy', 'sad', 'blink', 'idle', 'happy', 'blink'];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      setMood(randomMood);
      
      // Play sound for the mood
      if (randomMood !== 'idle') {
        playRobotSound(randomMood);
      }
      
      // Auto revert from blink after 200ms
      if (randomMood === 'blink') {
        setTimeout(() => setMood('idle'), 200);
      }
      
      // Auto revert from sad/happy after 3s
      if (randomMood === 'sad' || randomMood === 'happy') {
        setTimeout(() => setMood('idle'), 3000);
      }
    }, 5000); // Trigger every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Determine Eye and Mouth Paths based on mood (Digital Neon)
  let eyePathLeft = "M 65 75 Q 80 55 95 75 Z"; // Idle happy eyes
  let eyePathRight = "M 105 75 Q 120 55 135 75 Z";
  let mouthPath = "M 90 90 Q 100 100 110 90"; // Small smile

  if (mood === 'sad') {
    eyePathLeft = "M 65 65 Q 80 85 95 65 Z";
    eyePathRight = "M 105 65 Q 120 85 135 65 Z";
    mouthPath = "M 85 95 Q 100 85 115 95"; // Frown
  } else if (mood === 'blink') {
    eyePathLeft = "M 65 75 Q 80 74 95 75 Z";
    eyePathRight = "M 105 75 Q 120 74 135 75 Z";
    mouthPath = "M 90 90 Q 100 100 110 90"; // Keep small smile
  } else if (mood === 'happy') {
    mouthPath = "M 80 85 Q 100 110 120 85"; // Big wide smile
  }

  // Determine eye transform for blink scale down
  const eyeTransform = mood === 'blink' ? "scale(1, 0.1)" : "scale(1, 1)";

  return (
    <svg viewBox="0 0 200 250" className={`robot-svg robot-mood-${mood}`}>
      <defs>
        {/* 3D Gradients */}
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="80%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        
        {/* Neon Glow Filter for Eyes */}
        <filter id="neonGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g className="robot-hover-group">
        
        {/* Base */}
        <ellipse cx="100" cy="235" rx="65" ry="12" fill="#cbd5e1" />
        <ellipse cx="100" cy="230" rx="65" ry="12" fill="#f8fafc" />

        {/* Body Egg Shape */}
        <ellipse cx="100" cy="155" rx="60" ry="70" fill="url(#bodyGrad)" />
        
        {/* Text 'NutriBot' */}
        <text x="100" y="160" fontFamily="Outfit, sans-serif" fontSize="18" fill="#475569" fontWeight="600" textAnchor="middle" letterSpacing="0.5">NutriBot</text>
        <circle cx="100" cy="180" r="2" fill="#94a3b8" /> {/* Little belly button */}

        {/* Arms */}
        {/* Left Arm */}
        <g className={mood === 'happy' ? 'arm-excited' : 'arm-idle'} style={{ transformOrigin: '50px 130px' }}>
          <path d="M 50 130 Q 15 120 20 180 Q 25 205 35 190 Q 45 170 50 130" fill="url(#bodyGrad)" stroke="url(#tealGrad)" strokeWidth="4" />
        </g>
        {/* Right Arm */}
        <g className={mood === 'happy' ? 'arm-excited' : 'arm-idle'} style={{ transformOrigin: '150px 130px' }}>
          <path d="M 150 130 Q 185 120 180 180 Q 175 205 165 190 Q 155 170 150 130" fill="url(#bodyGrad)" stroke="url(#tealGrad)" strokeWidth="4" />
        </g>

        {/* Collar / Scarf */}
        <path d="M 65 110 Q 100 130 135 110 Q 145 130 100 145 Q 55 130 65 110" fill="url(#tealGrad)" />

        {/* Head Group (Look around animation) */}
        <g className="robot-face">
          {/* Head Base */}
          <rect x="35" y="20" width="130" height="100" rx="50" fill="url(#bodyGrad)" />
          {/* Head Top teal highlight */}
          <ellipse cx="100" cy="30" rx="30" ry="8" fill="url(#tealGrad)" opacity="0.6" />
          
          {/* Ear Dials */}
          <rect x="25" y="55" width="20" height="30" rx="10" fill="url(#bodyGrad)" stroke="url(#tealGrad)" strokeWidth="2" className="robot-ear" />
          <rect x="155" y="55" width="20" height="30" rx="10" fill="url(#bodyGrad)" stroke="url(#tealGrad)" strokeWidth="2" className="robot-ear" />

          {/* Black Digital Screen */}
          <rect x="45" y="35" width="110" height="70" rx="35" fill="url(#screenGrad)" />
          
          {/* Neon Digital Eyes */}
          <path d={eyePathLeft} fill="#00ffff" filter="url(#neonGlow)" style={{ transition: 'd 0.1s', transformOrigin: '80px 75px', transform: eyeTransform }} />
          <path d={eyePathRight} fill="#00ffff" filter="url(#neonGlow)" style={{ transition: 'd 0.1s', transformOrigin: '120px 75px', transform: eyeTransform }} />
          
          {/* Neon Digital Lips/Mouth */}
          <path d={mouthPath} fill="none" stroke="#00ffff" strokeWidth="4" strokeLinecap="round" filter="url(#neonGlow)" style={{ transition: 'd 0.2s' }} />
        </g>
      </g>
    </svg>
  );
};

export default CuteRobot;
