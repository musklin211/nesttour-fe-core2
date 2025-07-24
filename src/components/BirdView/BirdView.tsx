import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VirtualTourData } from '@/types';
import { SceneManager } from '@/utils/sceneManager';
import { ModelLoader } from '@/utils/modelLoader';
import { CameraNodeVisualizer } from '@/utils/cameraNodeVisualizer';
import { createDebugPanel } from '@/utils/debugTools';
import { testMatrixParsing } from '@/utils/matrixTest';
import './BirdView.css';

interface BirdViewProps {
  tourData: VirtualTourData;
  onCameraSelect: (cameraId: number) => void;
}

const BirdView: React.FC<BirdViewProps> = ({ tourData, onCameraSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const modelLoaderRef = useRef<ModelLoader | null>(null);
  const nodeVisualizerRef = useRef<CameraNodeVisualizer | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 运行矩阵测试
    testMatrixParsing();

    initializeScene();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (tourData && sceneManagerRef.current) {
      loadSceneContent();
    }
  }, [tourData]);

  /**
   * 初始化3D场景
   */
  const initializeScene = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 创建场景管理器
      const sceneManager = new SceneManager({
        container: containerRef.current!,
        enableControls: true,
        enableShadows: true,
        backgroundColor: 0x1a1a1a,
        showCoordinateAxes: true,
        showGrid: true
      });

      // 重写节点点击回调
      sceneManager.onNodeClick = (object: any) => {
        console.log('Node click event received:', object.userData);
        const cameraId = object.userData?.cameraId;
        if (typeof cameraId === 'number') {
          console.log('Camera node clicked, switching to camera:', cameraId);
          onCameraSelect(cameraId);
        } else {
          console.log('Clicked object does not have cameraId:', object.userData);
        }
      };

      sceneManagerRef.current = sceneManager;

      // 暴露sceneManager到全局以便调试
      (window as any).sceneManager = sceneManager;

      // 创建模型加载器
      modelLoaderRef.current = new ModelLoader(sceneManager);

      // 创建节点可视化器
      nodeVisualizerRef.current = new CameraNodeVisualizer(sceneManager, {
        nodeSize: 0.15,
        nodeColor: 0x4a90e2,
        hoverColor: 0xff6b6b,
        selectedColor: 0x4ecdc4,
        showLabels: true,
        showDirection: true  // 默认显示方向指示器
      });

      // 暴露相机可视化器到全局以便调试
      (window as any).cameraVisualizer = nodeVisualizerRef.current;

      // 创建简单的调试命令
      (window as any).showDirectionIndicators = () => {
        if (nodeVisualizerRef.current) {
          nodeVisualizerRef.current.toggleDirectionIndicators(true);
          console.log('Direction indicators enabled');
        }
      };

      (window as any).hideDirectionIndicators = () => {
        if (nodeVisualizerRef.current) {
          nodeVisualizerRef.current.toggleDirectionIndicators(false);
          console.log('Direction indicators disabled');
        }
      };

      // 测试点击功能
      (window as any).testCameraClick = (cameraId: number = 3) => {
        console.log(`Testing camera click for camera ${cameraId}`);
        onCameraSelect(cameraId);
      };

      // 创建调试面板
      (window as any).debugVirtualTour = createDebugPanel(sceneManager, nodeVisualizerRef.current);

      console.log('3D scene initialized successfully');
    } catch (err) {
      console.error('Failed to initialize scene:', err);
      setError('Failed to initialize 3D scene');
    }
  };

  /**
   * 加载场景内容
   */
  const loadSceneContent = async () => {
    if (!modelLoaderRef.current || !nodeVisualizerRef.current) return;

    try {
      setIsLoading(true);
      setLoadingProgress(0);

      // 加载3D模型
      console.log('Loading 3D model...');
      setLoadingProgress(25);

      await modelLoaderRef.current.loadModel({
        modelUrl: tourData.model.url,
        textureUrl: tourData.model.texture,
        scale: 1,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0) // 额外旋转将在applyTransforms中添加到基础翻转上
      });

      setLoadingProgress(50);

      // 创建相机节点
      console.log('Creating camera nodes...');
      nodeVisualizerRef.current.createCameraNodes(tourData.cameras);

      setLoadingProgress(75);

      // 调整相机视角以适应场景
      adjustCameraView();

      setLoadingProgress(100);
      setIsLoading(false);

      console.log('Scene content loaded successfully');
    } catch (err) {
      console.error('Failed to load scene content:', err);
      setError('Failed to load 3D content');
      setIsLoading(false);
    }
  };

  /**
   * 调整相机视角
   */
  const adjustCameraView = () => {
    if (!sceneManagerRef.current || !nodeVisualizerRef.current) return;

    const nodePositions = nodeVisualizerRef.current.getAllNodePositions();
    if (nodePositions.length === 0) return;

    // 计算边界框
    const box = new THREE.Box3();
    nodePositions.forEach(pos => box.expandByPoint(pos));

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // 设置相机位置
    const camera = sceneManagerRef.current.camera;
    const distance = maxDim * 2;

    camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.8,
      center.z + distance * 0.7
    );

    // 更新控制器目标
    if (sceneManagerRef.current.controls) {
      sceneManagerRef.current.controls.target.copy(center);
      sceneManagerRef.current.controls.update();
    }

    console.log('Camera view adjusted to fit scene');
  };

  /**
   * 清理资源
   */
  const cleanup = () => {
    if (nodeVisualizerRef.current) {
      nodeVisualizerRef.current.dispose();
      nodeVisualizerRef.current = null;
    }

    if (modelLoaderRef.current) {
      modelLoaderRef.current.removeModel();
      modelLoaderRef.current = null;
    }

    if (sceneManagerRef.current) {
      sceneManagerRef.current.dispose();
      sceneManagerRef.current = null;
    }
  };

  if (error) {
    return (
      <div className="bird-view-error">
        <h3>Error Loading 3D Scene</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="bird-view">
      <div
        ref={containerRef}
        className="bird-view-container"
        style={{ width: '100%', height: '100%' }}
      />

      {isLoading && (
        <div className="bird-view-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            Loading 3D Scene... {loadingProgress}%
          </div>
          <div className="loading-progress">
            <div
              className="loading-progress-bar"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="bird-view-controls">
        <div className="control-info">
          <h4>Controls:</h4>
          <p>🖱️ Left click + drag: Rotate</p>
          <p>🖱️ Right click + drag: Pan</p>
          <p>🖱️ Scroll: Zoom</p>
          <p>📷 Click camera nodes to enter panoramic view</p>
          <p>🎯 RGB axes at origin: X(red), Y(green), Z(blue)</p>
          <p>📐 Grid lines show ground plane at Y=0</p>
        </div>

        <div className="scene-info">
          <p>Cameras: {tourData.cameras.length}</p>
          <p>Model: {tourData.model.url.split('/').pop()}</p>
          <p>Content rotated: 90° around X-axis</p>
        </div>
      </div>
    </div>
  );
};

export default BirdView;
