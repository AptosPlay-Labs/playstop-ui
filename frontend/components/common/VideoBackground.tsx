import React, { useState, useEffect } from 'react';

interface VideoBackgroundProps {
  videoSrc: string;
  fallbackImageSrc?: string;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoSrc, fallbackImageSrc }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = videoSrc;
    
    video.onloadeddata = () => {
      setIsLoading(false);
    };

    return () => {
      video.onloadeddata = null;
    };
  }, [videoSrc]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-[3px] border-b-[3px] border-gray-200"></div>
        </div>
      )}
      <video
        className={`w-full opacity-[0.85] mt-[-100px]`}
        autoPlay
        loop
        muted
        playsInline
        poster={fallbackImageSrc}
        onCanPlay={() => setIsLoading(false)}
      >
        <source src={videoSrc} type="video/mp4" />
        no suport video.
      </video>
    </div>
  );
};

export default VideoBackground;