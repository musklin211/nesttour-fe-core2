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

  // 视角状态，用于在相机切换时保持视角连续性
  const [currentViewAngle, setCurrentViewAngle] = useState<{ lon: number; lat: number } | undefined>(undefined);
  // zoom状态，用于实现无缝的zoom过渡
  const [currentZoomFov, setCurrentZoomFov] = useState<number | undefined>(undefined);

  // 处理相机切换，保持视角连续性和zoom过渡
  const handleCameraSwitch = (cameraId: number, viewAngle?: { lon: number; lat: number }, zoomFov?: number) => {
    console.log(`🔄 Camera switch: ${currentCameraId} → ${cameraId}, view angle:`, viewAngle, `zoom FOV:`, zoomFov);

    // 保存当前视角和zoom状态
    if (viewAngle) {
      setCurrentViewAngle(viewAngle);
    }
    if (zoomFov) {
      setCurrentZoomFov(zoomFov);
    }

    // 切换相机
    switchToPanoView(cameraId);
  };

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
          onCameraSelect={(cameraId) => {
            // 从Bird-view切换时清除视角和zoom状态，使用默认朝向
            setCurrentViewAngle(undefined);
            setCurrentZoomFov(undefined);
            switchToPanoView(cameraId);
          }}
        />
      ) : (
        <PanoramaViewer
          cameraId={currentCameraId || 1}
          tourData={tourData}
          onEscape={switchToBirdView}
          onError={(error) => console.error('Panorama error:', error)}
          onCameraSwitch={handleCameraSwitch}
          initialViewAngle={currentViewAngle}
          initialZoomFov={currentZoomFov}
        />
      )}
    </div>
  );
};

export default App;
