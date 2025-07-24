import React, { useState, useEffect } from 'react';
import { ViewMode, VirtualTourData } from '@/types';
import { useVirtualTour } from '@/hooks/useVirtualTour';
import BirdView from '@/components/BirdView/BirdView';
import PanoramaViewer from '@/components/PanoramaViewer';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorScreen from '@/components/common/ErrorScreen';
import './App.css';

const App: React.FC = () => {
  const {
    viewMode,
    currentCameraId,
    tourData,
    isLoading,
    error,
    switchToPanoView,
    switchToBirdView,
    loadTourData
  } = useVirtualTour();

  useEffect(() => {
    // 应用启动时加载数据
    loadTourData();
  }, [loadTourData]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && viewMode === 'panoramic-view') {
        switchToBirdView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, switchToBirdView]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={loadTourData} />;
  }

  if (!tourData) {
    return <ErrorScreen error="No tour data available" onRetry={loadTourData} />;
  }

  return (
    <div className="app">
      {viewMode === 'bird-view' ? (
        <BirdView
          tourData={tourData}
          onCameraSelect={switchToPanoView}
        />
      ) : (
        <PanoramaViewer
          cameraId={currentCameraId || 1}
          onEscape={switchToBirdView}
          onError={(error) => console.error('Panorama error:', error)}
        />
      )}
    </div>
  );
};

export default App;
