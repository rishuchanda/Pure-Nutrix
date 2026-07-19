import React from 'react';
import './RainEffect.css';

const RainEffect = () => {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      className="rain-canvas"
    >
      <source src="/rain-drop-on-glass.mp4" type="video/mp4" />
    </video>
  );
};

export default RainEffect;
