import React, { useEffect, useRef, useState } from 'react';
import * as Marzipano from 'marzipano';
import './PanoramaViewer.css';

interface PanoramaViewerProps {
  cameraId: number;
  onEscape?: () => void;
  onError?: (error: string) => void;
}

interface PanoramaViewerState {
  isLoading: boolean;
  error: string | null;
  loadingProgress: number;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ 
  cameraId, 
  onEscape, 
  onError 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Marzipano.Viewer | null>(null);
  const sceneRef = useRef<Marzipano.Scene | null>(null);
  
  const [state, setState] = useState<PanoramaViewerState>({
    isLoading: true,
    error: null,
    loadingProgress: 0
  });

  useEffect(() => {
    if (!containerRef.current) return;

    initializePanorama();

    // 添加ESC键监听
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cleanup();
    };
  }, [cameraId, onEscape]);

  /**
   * 初始化全景查看器
   */
  const initializePanorama = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, loadingProgress: 0 }));

      // 创建Marzipano查看器
      const viewer = new Marzipano.Viewer(containerRef.current!, {
        controls: {
          mouseViewMode: 'drag'
        },
        stage: {
          preserveDrawingBuffer: true
        }
      });

      viewerRef.current = viewer;
      setState(prev => ({ ...prev, loadingProgress: 25 }));

      // 构建全景图片URL
      const imageUrl = `/data/frames/1_frame_${cameraId}.JPG`;
      console.log(`Loading panorama for camera ${cameraId}: ${imageUrl}`);

      // 创建图片源
      const source = Marzipano.ImageUrlSource.fromString(imageUrl);
      setState(prev => ({ ...prev, loadingProgress: 50 }));

      // 创建等距柱状投影几何体
      const geometry = new Marzipano.EquirectGeometry([
        { width: 4096 }
      ]);

      // 创建视图限制器
      const limiter = Marzipano.RectilinearView.limit.traditional(1024, 100 * Math.PI / 180);
      
      // 创建视图
      const view = new Marzipano.RectilinearView(
        { yaw: 0, pitch: 0, fov: Math.PI / 4 },
        limiter
      );

      setState(prev => ({ ...prev, loadingProgress: 75 }));

      // 创建场景
      const scene = viewer.createScene();
      sceneRef.current = scene;

      // 创建图层
      const layer = scene.createLayer(source, geometry, view);

      // 切换到场景
      await scene.switchTo({ transitionDuration: 1000 });

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        loadingProgress: 100 
      }));

      console.log(`Panorama loaded successfully for camera ${cameraId}`);

    } catch (error) {
      console.error('Failed to initialize panorama:', error);
      const errorMessage = `Failed to load panorama for camera ${cameraId}`;
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  /**
   * 清理资源
   */
  const cleanup = () => {
    if (sceneRef.current && viewerRef.current) {
      viewerRef.current.destroyScene(sceneRef.current);
      sceneRef.current = null;
    }

    if (viewerRef.current) {
      viewerRef.current.dispose();
      viewerRef.current = null;
    }

    console.log('PanoramaViewer cleaned up');
  };

  if (state.error) {
    return (
      <div className="panorama-error">
        <div className="error-content">
          <h3>Error Loading Panorama</h3>
          <p>{state.error}</p>
          <button onClick={onEscape} className="back-button">
            Back to Bird View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panorama-viewer">
      {state.isLoading && (
        <div className="panorama-loading">
          <div className="loading-content">
            <h3>Loading Panorama</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${state.loadingProgress}%` }}
              />
            </div>
            <p>Camera {cameraId} - {state.loadingProgress}%</p>
            <p className="hint">Press ESC to return to Bird View</p>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="panorama-container"
        style={{ 
          width: '100%', 
          height: '100%',
          visibility: state.isLoading ? 'hidden' : 'visible'
        }}
      />

      {!state.isLoading && (
        <div className="panorama-controls">
          <button onClick={onEscape} className="escape-button">
            ← Back to Bird View (ESC)
          </button>
          <div className="camera-info">
            Camera {cameraId}
          </div>
        </div>
      )}
    </div>
  );
};

export default PanoramaViewer;
