import React from 'react';
import { CameraData } from '@/types';
import './Hotspot.css';

interface HotspotProps {
  camera: CameraData;
  position: { x: number; y: number };
  isVisible: boolean;
  onClick: (cameraId: number) => void;
  distance?: number;
}

const Hotspot: React.FC<HotspotProps> = ({
  camera,
  position,
  isVisible,
  onClick,
  distance
}) => {
  if (!isVisible) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(camera.id);
  };

  // 根据距离调整hotspot大小
  const getHotspotSize = () => {
    if (!distance) return 40;
    // 距离越远，hotspot越小，但有最小值
    const baseSize = 40;
    const minSize = 20;
    const maxSize = 60;
    const size = Math.max(minSize, Math.min(maxSize, baseSize / (distance * 0.5 + 1)));
    return size;
  };

  const hotspotSize = getHotspotSize();

  return (
    <div
      className="hotspot"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${hotspotSize}px`,
        height: `${hotspotSize}px`,
        transform: `translate(-50%, -50%)`,
      }}
      onClick={handleClick}
      title={`Go to ${camera.label}`}
    >
      <div className="hotspot-inner">
        <div className="hotspot-pulse" />
        <div className="hotspot-core" />
      </div>
      
      {/* 相机标签 */}
      <div className="hotspot-label">
        {camera.label.replace('1_frame_', '')}
      </div>
    </div>
  );
};

export default Hotspot;
