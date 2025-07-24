import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VirtualTourData, CameraData } from '@/types';
import './PanoramaViewer.css';

interface PanoramaViewerProps {
  cameraId: number;
  tourData?: VirtualTourData;
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
  tourData,
  onEscape,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const [state, setState] = useState<PanoramaViewerState>({
    isLoading: true,
    error: null,
    loadingProgress: 0
  });

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    isInitializedRef.current = true;
    initializePanorama();

    // 添加ESC键监听
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    // 添加窗口大小调整监听
    const handleResize = () => {
      if (containerRef.current && rendererRef.current && cameraRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      isInitializedRef.current = false;
      cleanup();
    };
  }, [cameraId, onEscape]);

  /**
   * 初始化360°球面全景查看器
   */
  const initializePanorama = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, loadingProgress: 0 }));

      // 移除冗余的初始化日志
      // console.log('Initializing 360° panorama viewer for camera:', cameraId);

      if (!containerRef.current) {
        throw new Error('Container ref is null');
      }

      // 创建Three.js场景
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // 创建相机 (透视相机，FOV=75度)
      const camera = new THREE.PerspectiveCamera(
        75,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      cameraRef.current = camera;

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;

      setState(prev => ({ ...prev, loadingProgress: 25 }));

      // 查找对应的相机数据
      // 移除冗余的相机列表日志
      // console.log('Available cameras:', tourData?.cameras?.map(cam => ({ id: cam.id, label: cam.label })));
      const cameraData = tourData?.cameras?.find(cam => cam.id === cameraId);
      if (!cameraData) {
        throw new Error(`Camera with ID ${cameraId} not found in tour data. Available cameras: ${tourData?.cameras?.map(cam => cam.id).join(', ')}`);
      }

      // 使用相机数据中的imageUrl
      const imageUrl = cameraData.imageUrl;
      console.log(`✅ Found camera mapping: ID ${cameraId} → Label "${cameraData.label}" → Image "${imageUrl}"`);

      // 加载纹理
      const textureLoader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(
          imageUrl,
          resolve,
          undefined,
          reject
        );
      });

      setState(prev => ({ ...prev, loadingProgress: 50 }));

      // 创建球体几何体 (标准全景球体)
      const geometry = new THREE.SphereGeometry(500, 60, 40);
      // 翻转几何体，让纹理显示在内表面
      geometry.scale(-1, 1, 1);

      // 创建材质
      const material = new THREE.MeshBasicMaterial({
        map: texture
      });

      // 创建球体网格
      const sphere = new THREE.Mesh(geometry, material);
      sphereRef.current = sphere;
      scene.add(sphere);

      setState(prev => ({ ...prev, loadingProgress: 75 }));

      // 设置相机初始位置 (在球心)
      camera.position.set(0, 0, 0.1); // 稍微偏移避免在正中心

      // 添加到DOM
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);

      // 设置鼠标控制
      setupMouseControls(camera, renderer.domElement);

      // 开始渲染循环
      startRenderLoop();

      setState(prev => ({
        ...prev,
        isLoading: false,
        loadingProgress: 100
      }));

      // 移除冗余的全景加载成功日志
      // console.log(`360° panorama loaded successfully for camera ${cameraId}`);
      // console.log('Scene objects:', scene.children.length);
      // console.log('Sphere geometry:', sphere.geometry);
      // console.log('Sphere material:', sphere.material);
      // console.log('Camera position:', camera.position);
      // console.log('Camera rotation:', camera.rotation);
      // console.log('Renderer size:', renderer.getSize(new THREE.Vector2()));
      // console.log('Texture loaded:', texture.image ? `${texture.image.width}x${texture.image.height}` : 'No image');

      // 暴露到全局以便调试
      (window as any).panoramaDebug = {
        scene,
        camera,
        renderer,
        sphere,
        texture,
        testRedSphere: () => {
          sphere.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          console.log('Sphere material changed to red');
        },
        resetTexture: () => {
          sphere.material = new THREE.MeshBasicMaterial({ map: texture });
          console.log('Sphere material reset to texture');
        }
      };

    } catch (error) {
      console.error('Failed to initialize panorama viewer:', error);
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
   * 设置鼠标控制
   */
  const setupMouseControls = (camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) => {
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let lon = 0;  // 水平角度
    let lat = 0;  // 垂直角度

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      mouseX = event.clientX;
      mouseY = event.clientY;

      // 调整灵敏度
      lon -= deltaX * 0.2;
      lat += deltaY * 0.2;

      // 限制垂直角度范围
      lat = Math.max(-85, Math.min(85, lat));

      // 更新相机朝向
      updateCameraRotation(camera, lon, lat);
    };

    const onMouseUp = () => {
      isMouseDown = false;
      canvas.style.cursor = 'grab';
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      // 缩放控制 (调整FOV)
      const fov = camera.fov + event.deltaY * 0.05;
      camera.fov = Math.max(10, Math.min(100, fov));
      camera.updateProjectionMatrix();
    };

    // 添加事件监听器
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.style.cursor = 'grab';

    // 返回清理函数
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  };

  /**
   * 更新相机旋转
   */
  const updateCameraRotation = (camera: THREE.PerspectiveCamera, lon: number, lat: number) => {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);

    camera.lookAt(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
  };

  /**
   * 开始渲染循环
   */
  const startRenderLoop = () => {
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  /**
   * 清理资源
   */
  const cleanup = () => {
    try {
      // 停止动画循环
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }

      // 清理Three.js资源
      if (sphereRef.current) {
        if (sphereRef.current.material instanceof THREE.Material) {
          sphereRef.current.material.dispose();
        }
        if (sphereRef.current.geometry) {
          sphereRef.current.geometry.dispose();
        }
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      sceneRef.current = null;
      cameraRef.current = null;
      sphereRef.current = null;

      console.log('PanoramaViewer cleaned up');
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
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
