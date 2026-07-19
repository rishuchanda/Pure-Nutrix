import React from 'react';
import './RainEffect.css';
import rainVideo from '../assets/rain-drop-on-glass.mp4';

const RainEffect = () => {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      controls={false}
      disablePictureInPicture
      poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
      className="rain-canvas"
    >
      <source src={rainVideo} type="video/mp4" />
    </video>
  );
};

export default RainEffect;
