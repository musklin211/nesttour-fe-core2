import { useState, useCallback } from 'react';
import { ViewMode, VirtualTourData } from '@/types';
import { parseVirtualTourData } from '@/utils/dataParser';

export const useVirtualTour = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('bird-view');
  const [currentCameraId, setCurrentCameraId] = useState<number | null>(null);
  const [tourData, setTourData] = useState<VirtualTourData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载虚拟漫游数据
  const loadTourData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading virtual tour data...');
      const data = await parseVirtualTourData();
      setTourData(data);
      console.log('Virtual tour data loaded successfully:', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tour data';
      setError(errorMessage);
      console.error('Error loading tour data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 切换到全景视图
  const switchToPanoView = useCallback((cameraId: number) => {
    setCurrentCameraId(cameraId);
    setViewMode('panoramic-view');
    console.log(`Switched to panoramic view, camera ID: ${cameraId}`);
  }, []);

  // 切换到鸟瞰视图
  const switchToBirdView = useCallback(() => {
    setViewMode('bird-view');
    setCurrentCameraId(null);
    console.log('Switched to bird view');
  }, []);

  return {
    viewMode,
    currentCameraId,
    tourData,
    isLoading,
    error,
    switchToPanoView,
    switchToBirdView,
    loadTourData,
  };
};
