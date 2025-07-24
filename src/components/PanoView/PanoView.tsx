import React from 'react';
import { VirtualTourData } from '@/types';

interface PanoViewProps {
  tourData: VirtualTourData;
  currentCameraId: number | null;
  onCameraSwitch: (cameraId: number) => void;
  onBackToBirdView: () => void;
}

const PanoView: React.FC<PanoViewProps> = ({ 
  tourData, 
  currentCameraId, 
  onCameraSwitch, 
  onBackToBirdView 
}) => {
  const currentCamera = tourData.cameras.find(c => c.id === currentCameraId);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#111',
      color: '#fff',
      flexDirection: 'column'
    }}>
      <h2>Panoramic View</h2>
      {currentCamera && (
        <>
          <p>Current Camera: {currentCamera.label}</p>
          <p>Image: {currentCamera.imageUrl}</p>
          <p>Position: ({currentCamera.position.x.toFixed(2)}, {currentCamera.position.y.toFixed(2)}, {currentCamera.position.z.toFixed(2)})</p>
        </>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <p>Switch to other cameras:</p>
        {tourData.cameras
          .filter(camera => camera.id !== currentCameraId)
          .map((camera) => (
            <button
              key={camera.id}
              onClick={() => onCameraSwitch(camera.id)}
              style={{
                margin: '5px',
                padding: '8px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {camera.label}
            </button>
          ))}
      </div>

      <button
        onClick={onBackToBirdView}
        style={{
          marginTop: '30px',
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Back to Bird View (ESC)
      </button>
      
      <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.7 }}>
        Press ESC to return to bird view
      </p>
    </div>
  );
};

export default PanoView;
