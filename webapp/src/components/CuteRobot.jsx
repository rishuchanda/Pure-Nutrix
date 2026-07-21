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

  // Determine mouth path based on mood
  let mouthPath = "M 85 125 L 95 115 L 105 130 L 115 120"; // Heartbeat/idle
  if (mood === 'happy') mouthPath = "M 80 120 Q 100 145 120 120";
  else if (mood === 'sad') mouthPath = "M 80 130 Q 100 110 120 130";
  else if (mood === 'idle') mouthPath = "M 85 125 Q 100 135 115 125";

  // Determine eye transform
  const eyeTransform = mood === 'blink' || mood === 'happy' ? "scale(1, 0.1)" : "scale(1, 1)";
  const eyeY = mood === 'blink' || mood === 'happy' ? 700 : 0; // adjust scaling center manually in SVG string via CSS below

  return (
    <svg viewBox="0 0 200 200" className={`robot-svg robot-mood-${mood}`}>
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffb3c6" />
        </linearGradient>
        <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
      </defs>

      <g className="robot-hover-group">
        {/* Antennas */}
        <g className="antennas">
          <line x1="65" y1="40" x2="40" y2="15" stroke="#ffb3c6" strokeWidth="4" strokeLinecap="round" />
          <circle cx="40" cy="15" r="5" fill="#fff" stroke="#ffb3c6" strokeWidth="2" className="antenna-bulb" />
          
          <line x1="135" y1="40" x2="160" y2="15" stroke="#ffb3c6" strokeWidth="4" strokeLinecap="round" />
          <circle cx="160" cy="15" r="5" fill="#fff" stroke="#ffb3c6" strokeWidth="2" className="antenna-bulb" />
        </g>

        {/* Main Spherical Body */}
        <circle cx="100" cy="100" r="70" fill="url(#bodyGrad)" />

        {/* Top Head Separator Line */}
        <path d="M 45 65 Q 100 85 155 65" stroke="#e0e0e0" strokeWidth="2" fill="none" opacity="0.6" />
        <circle cx="100" cy="55" r="3" fill="#e0e0e0" />

        {/* Side Ear Flaps */}
        <ellipse cx="25" cy="110" rx="10" ry="20" fill="#ffc2d1" stroke="#fff" strokeWidth="2" className="robot-ear" />
        <ellipse cx="175" cy="110" rx="10" ry="20" fill="#ffc2d1" stroke="#fff" strokeWidth="2" className="robot-ear" />

        {/* Face Group (Eyes, Cheeks, Mouth) for Look Around Animation */}
        <g className="robot-face">
          {/* Cute Big Eyes */}
          <g style={{ transformOrigin: '70px 95px', transition: 'transform 0.2s', transform: eyeTransform }}>
            <circle cx="70" cy="95" r="18" fill="url(#eyeGrad)" stroke="#ff9900" strokeWidth="2.5" />
            <circle cx="75" cy="90" r="5" fill="#fff" opacity="0.9" />
            <circle cx="65" cy="100" r="2" fill="#FACC15" opacity="0.9" />
          </g>
          
          <g style={{ transformOrigin: '130px 95px', transition: 'transform 0.2s', transform: eyeTransform }}>
            <circle cx="130" cy="95" r="18" fill="url(#eyeGrad)" stroke="#ff9900" strokeWidth="2.5" />
            <circle cx="125" cy="90" r="5" fill="#fff" opacity="0.9" />
            <circle cx="135" cy="100" r="2" fill="#FACC15" opacity="0.9" />
          </g>

          {/* Small Cheeks */}
          <circle cx="45" cy="110" r="8" fill="#ff9999" opacity={mood === 'happy' ? 0.9 : 0.5} style={{ transition: 'opacity 0.3s' }} className="robot-cheek" />
          <circle cx="155" cy="110" r="8" fill="#ff9999" opacity={mood === 'happy' ? 0.9 : 0.5} style={{ transition: 'opacity 0.3s' }} className="robot-cheek" />

          {/* Mouth */}
          <path 
            d={mouthPath} 
            stroke="#1a1a1a" 
            strokeWidth="4" 
            fill={mood === 'happy' ? "#ffb3c6" : "none"}
            strokeLinecap="round" 
            style={{ transition: 'd 0.3s, fill 0.3s' }}
          />
        </g>

        {/* Arms Floating */}
        <ellipse cx="40" cy="150" rx="15" ry="20" fill="#ffb3c6" stroke="#fff" strokeWidth="2" className={mood === 'happy' ? 'arm-excited' : 'arm-idle'} style={{ transformOrigin: '40px 150px' }} />
        <ellipse cx="160" cy="150" rx="15" ry="20" fill="#ffb3c6" stroke="#fff" strokeWidth="2" className={mood === 'happy' ? 'arm-excited' : 'arm-idle'} style={{ transformOrigin: '160px 150px' }} />

        {/* Bottom Base details */}
        <rect x="75" y="160" width="50" height="8" rx="4" fill="#1a1a1a" opacity="0.8" />
      </g>
    </svg>
  );
};

export default CuteRobot;
