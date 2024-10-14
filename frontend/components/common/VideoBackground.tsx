import React from 'react';

interface VideoBackgroundProps {
  videoSrc: string;
  fallbackImageSrc?: string;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoSrc, fallbackImageSrc }) => {
  return (
    <video 
      className="w-full opacity-[0.85] mt-[-100px]" 
      autoPlay 
      loop 
      muted 
      playsInline
      poster={fallbackImageSrc}
    >
      <source src={videoSrc} type="video/mp4" />
      no suport video
    </video>
  );
};

export default VideoBackground;