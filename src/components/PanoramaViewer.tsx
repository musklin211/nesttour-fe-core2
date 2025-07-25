import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { VirtualTourData, CameraData } from '@/types';
import { PanoramaHotspotManager } from '@/utils/panoramaHotspots';
import './PanoramaViewer.css';

interface PanoramaViewerProps {
  cameraId: number;
  tourData?: VirtualTourData;
  onEscape?: () => void;
  onError?: (error: string) => void;
  onCameraSwitch?: (cameraId: number, currentViewAngle?: { lon: number; lat: number }, zoomFov?: number) => void;
  initialViewAngle?: { lon: number; lat: number }; // 初始视角
  initialZoomFov?: number; // 新增：初始zoom FOV
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
  onError,
  onCameraSwitch,
  initialViewAngle,
  initialZoomFov
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

  const initOnceRef = useRef<number | null>(null);
  const hotspotManagerRef = useRef<PanoramaHotspotManager | null>(null);

  // 预加载纹理缓存
  const preloadedTexturesRef = useRef<Map<number, THREE.Texture>>(new Map());

  // 视角状态 - 使用ref存储实时值，state用于传递给父组件
  const viewAngleRef = useRef({
    lon: initialViewAngle?.lon ?? 0,
    lat: initialViewAngle?.lat ?? 0
  });
  const [viewAngle, setViewAngle] = useState(viewAngleRef.current);

  // 当相机切换或初始视角改变时，更新视角状态
  useEffect(() => {
    const newAngle = {
      lon: initialViewAngle?.lon ?? 0,
      lat: initialViewAngle?.lat ?? 0
    };
    viewAngleRef.current = newAngle;
    setViewAngle(newAngle);
  }, [cameraId, initialViewAngle]);

  /**
   * 预加载目标相机的纹理
   */
  const preloadTexture = useCallback((targetCameraId: number): Promise<THREE.Texture> => {
    return new Promise((resolve, reject) => {
      // 检查是否已经预加载过
      const cached = preloadedTexturesRef.current.get(targetCameraId);
      if (cached) {
        console.log(`📦 Using cached texture for camera ${targetCameraId}`);
        resolve(cached);
        return;
      }

      // 查找目标相机
      const targetCamera = tourData?.cameras.find(cam => cam.id === targetCameraId);
      if (!targetCamera) {
        reject(new Error(`Camera ${targetCameraId} not found`));
        return;
      }

      const imagePath = `/data/sample-space/frames/${targetCamera.label}.JPG`;
      console.log(`🔄 Preloading texture for camera ${targetCameraId}: ${imagePath}`);

      const loader = new THREE.TextureLoader();
      loader.load(
        imagePath,
        (texture) => {
          // 设置纹理参数
          texture.mapping = THREE.EquirectangularReflectionMapping;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          // 缓存纹理
          preloadedTexturesRef.current.set(targetCameraId, texture);
          console.log(`✅ Texture preloaded for camera ${targetCameraId}`);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`❌ Failed to preload texture for camera ${targetCameraId}:`, error);
          reject(error);
        }
      );
    });
  }, [tourData]);

  // 处理hotspot点击
  const handleHotspotClick = useCallback((targetCameraId: number, targetViewAngle?: { lon: number; lat: number }, distance?: number) => {
    if (!targetViewAngle) {
      // 如果没有目标视角，使用当前视角
      const currentAngle = viewAngleRef.current;
      console.log(`🎯 3D Hotspot clicked: switching to camera ${targetCameraId} with current view angle`);
      if (onCameraSwitch) {
        onCameraSwitch(targetCameraId, currentAngle);
      }
      return;
    }

    console.log(`🎯 3D Hotspot clicked: rotating to target view angle lon=${targetViewAngle.lon.toFixed(1)}°, lat=${targetViewAngle.lat.toFixed(1)}°, distance=${distance?.toFixed(2)}`);

    // 立即开始预加载目标纹理
    preloadTexture(targetCameraId).catch(error => {
      console.error(`Failed to preload texture for camera ${targetCameraId}:`, error);
    });

    // 根据距离计算zoom程度
    const zoomFov = calculateZoomFov(distance || 3.0);

    // 开始旋转动画
    animateToViewAngle(targetViewAngle, () => {
      // 旋转完成后开始zoom in动画
      console.log(`✅ Rotation animation completed, starting zoom in to FOV ${zoomFov.toFixed(1)}°`);
      animateZoomIn(zoomFov, () => {
        // zoom in到一半时开始切换相机，实现交叉过渡
        const normalFov = 75;
        const zoomAmount = normalFov - zoomFov; // 计算zoom in的量
        const symmetricZoomOutFov = normalFov + zoomAmount; // B的起始FOV应该是对称的zoom out状态

        console.log(`🔄 Zoom in halfway completed, starting crossfade transition. A zoomed in by ${zoomAmount.toFixed(1)}°, B will start with zoom out FOV ${symmetricZoomOutFov.toFixed(1)}°`);
        if (onCameraSwitch) {
          onCameraSwitch(targetCameraId, targetViewAngle, symmetricZoomOutFov);
        }
      });
    });
  }, [onCameraSwitch]);

  useEffect(() => {
    if (!containerRef.current) return;

    // 如果已经为这个cameraId初始化过，直接返回
    if (initOnceRef.current === cameraId) {
      console.log(`📋 Camera ${cameraId} already initialized, skipping`);
      return;
    }

    console.log(`📋 PanoramaViewer initializing for camera ${cameraId}`);
    initOnceRef.current = cameraId;

    // 确保容器是干净的
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

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
      // 只在组件真正卸载时清理，不在cameraId变化时清理
      if (initOnceRef.current !== cameraId) {
        cleanup();
      }
    };
  }, [cameraId, onEscape]);

  /**
   * 初始化360°球面全景查看器
   */
  const initializePanorama = async () => {
    try {
      console.log(`🚀 Initializing panorama for camera ${cameraId}`);
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

      // 计算相机的实际朝向方向（-Z方向）
      const cameraForward = new THREE.Vector3(0, 0, -1); // 相机默认朝向-Z
      cameraForward.applyQuaternion(cameraData.rotation);
      console.log(`📷 Camera ${cameraId} forward direction (-Z): (${cameraForward.x.toFixed(3)}, ${cameraForward.y.toFixed(3)}, ${cameraForward.z.toFixed(3)})`);

      // 尝试使用预加载的纹理，否则正常加载
      let texture: THREE.Texture;
      const preloadedTexture = preloadedTexturesRef.current.get(cameraId);

      if (preloadedTexture) {
        console.log(`📦 Using preloaded texture for camera ${cameraId}`);
        texture = preloadedTexture;
      } else {
        console.log(`🔄 Loading texture normally: ${imageUrl}`);
        const textureLoader = new THREE.TextureLoader();

        texture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoader.load(
            imageUrl,
            (loadedTexture) => {
              console.log(`✅ Texture loaded successfully: ${imageUrl}`);
              console.log(`Texture size: ${loadedTexture.image.width}x${loadedTexture.image.height}`);
              resolve(loadedTexture);
            },
            (progress) => {
              console.log(`📊 Texture loading progress: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
            },
            (error) => {
              console.error(`❌ Failed to load texture: ${imageUrl}`, error);
              reject(error);
            }
          );
        });
      }

      setState(prev => ({ ...prev, loadingProgress: 50 }));

      // 创建球体几何体 (标准全景球体)
      const geometry = new THREE.SphereGeometry(500, 60, 40);
      // 翻转几何体，让纹理显示在内表面
      geometry.scale(-1, 1, 1);
      console.log(`📐 Sphere geometry created: radius=500, segments=60x40`);

      // 创建材质
      const material = new THREE.MeshBasicMaterial({
        map: texture
      });
      console.log(`🎨 Material created with texture`);

      // 创建球体网格
      const sphere = new THREE.Mesh(geometry, material);
      sphereRef.current = sphere;
      scene.add(sphere);
      console.log(`🌐 Sphere added to scene`);

      setState(prev => ({ ...prev, loadingProgress: 75 }));

      // 设置相机初始位置 (在球心)
      camera.position.set(0, 0, 0.1); // 稍微偏移避免在正中心

      // 临时回到固定朝向进行调试
      camera.lookAt(1, 0, 0);
      console.log(`🎯 Panorama using fixed lookAt: (1, 0, 0) for debugging`);
      console.log(`📊 Camera forward would be: (${cameraForward.x.toFixed(3)}, ${cameraForward.y.toFixed(3)}, ${cameraForward.z.toFixed(3)})`);

      // 添加到DOM
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);

      // 设置鼠标控制，传入初始朝向
      setupMouseControls(camera, renderer.domElement);

      // 开始渲染循环
      startRenderLoop();

      setState(prev => ({
        ...prev,
        isLoading: false,
        loadingProgress: 100
      }));

      // 创建3D hotspot管理器
      hotspotManagerRef.current = new PanoramaHotspotManager(scene, handleHotspotClick);

      // 如果有初始zoom FOV，启动zoom恢复动画
      if (initialZoomFov) {
        console.log(`🎬 Starting with zoom restore animation from zoom-out FOV ${initialZoomFov.toFixed(1)}°`);
        animateZoomRestore(initialZoomFov);
      }

      // 创建3D hotspot
      setTimeout(() => {
        if (hotspotManagerRef.current && tourData) {
          hotspotManagerRef.current.updateHotspots(cameraData, tourData.cameras, 5);
        }
      }, 100); // 延迟一点确保渲染完成

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
   * 根据距离动态计算zoom FOV - 确保完美拼接
   */
  const calculateZoomFov = (distance: number): number => {
    const normalFov = 75;
    const minZoomAmount = 8;   // 最远距离的最小变化量
    const maxZoomAmount = 25;  // 最近距离的最大变化量
    const maxDistance = 5.0;   // 最大考虑距离

    // 距离越近，zoom变化量越大
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const zoomAmount = maxZoomAmount - (maxZoomAmount - minZoomAmount) * normalizedDistance;

    // A的目标FOV
    const targetFov = normalFov - zoomAmount;

    console.log(`📏 Distance: ${distance.toFixed(2)} → Normalized: ${normalizedDistance.toFixed(2)} → Zoom amount: ${zoomAmount.toFixed(1)}° → Target FOV: ${targetFov.toFixed(1)}°`);
    return targetFov;
  };

  /**
   * 更新相机旋转
   */
  const updateCameraRotation = (camera: THREE.PerspectiveCamera, lon: number, lat: number) => {
    // 将角度转换为弧度
    const phi = THREE.MathUtils.degToRad(90 - lat);   // 垂直角度 (从上往下)
    const theta = THREE.MathUtils.degToRad(lon);      // 水平角度 (从+X轴开始)

    // 计算朝向向量 (球坐标转笛卡尔坐标)
    // 注意：这里调整坐标系，使得 lon=0 对应+X轴方向
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);

    // 设置相机朝向
    camera.lookAt(x, y, z);

    // 只在非拖拽时打印日志（避免拖拽时的大量日志）
    // console.log(`Camera rotation: lon=${lon}°, lat=${lat}° → lookAt(${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`);
  };

  /**
   * 计算最短旋转路径
   */
  const getShortestRotationPath = (startAngle: { lon: number; lat: number }, targetAngle: { lon: number; lat: number }) => {
    let lonDiff = targetAngle.lon - startAngle.lon;
    let latDiff = targetAngle.lat - startAngle.lat;

    // 处理lon的360度循环，选择最短路径
    if (lonDiff > 180) {
      lonDiff -= 360;
    } else if (lonDiff < -180) {
      lonDiff += 360;
    }

    // lat通常不需要循环处理，因为范围是-85到85
    return {
      lonDiff,
      latDiff,
      targetLon: startAngle.lon + lonDiff,
      targetLat: startAngle.lat + latDiff
    };
  };

  /**
   * 动画旋转到目标视角
   */
  const animateToViewAngle = (targetAngle: { lon: number; lat: number }, onComplete?: () => void) => {
    const startAngle = { ...viewAngleRef.current };

    // 计算最短旋转路径
    const shortestPath = getShortestRotationPath(startAngle, targetAngle);

    const duration = 800; // 动画持续时间（毫秒）
    const startTime = Date.now();

    console.log(`🎬 Starting rotation animation from (${startAngle.lon.toFixed(1)}°, ${startAngle.lat.toFixed(1)}°) to (${shortestPath.targetLon.toFixed(1)}°, ${shortestPath.targetLat.toFixed(1)}°)`);
    console.log(`📐 Shortest path: lon ${shortestPath.lonDiff.toFixed(1)}°, lat ${shortestPath.latDiff.toFixed(1)}°`);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用easeInOutCubic缓动函数
      const easeProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // 计算当前角度（使用最短路径）
      const currentLon = startAngle.lon + shortestPath.lonDiff * easeProgress;
      const currentLat = startAngle.lat + shortestPath.latDiff * easeProgress;

      // 更新视角
      viewAngleRef.current = { lon: currentLon, lat: currentLat };
      setViewAngle({ lon: currentLon, lat: currentLat });

      // 更新相机
      if (cameraRef.current) {
        updateCameraRotation(cameraRef.current, currentLon, currentLat);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log(`✅ Rotation animation completed`);
        if (onComplete) {
          onComplete();
        }
      }
    };

    animate();
  };

  /**
   * 动画zoom in效果 + fade out（在50%时触发切换）
   */
  const animateZoomIn = (targetFov: number, onComplete?: () => void) => {
    if (!cameraRef.current || !containerRef.current) return;

    const camera = cameraRef.current;
    const container = containerRef.current;
    const startFov = camera.fov;
    const duration = 2000; // 2秒动画
    const startTime = Date.now();
    let hasTriggeredSwitch = false; // 标记是否已触发切换

    console.log(`🔍 Starting zoom in + fade out animation from FOV ${startFov.toFixed(1)}° to ${targetFov.toFixed(1)}°`);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用easeInOutQuad缓动函数，让zoom更平缓
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // 计算当前FOV
      const currentFov = startFov + (targetFov - startFov) * easeProgress;

      // 更新相机FOV
      camera.fov = currentFov;
      camera.updateProjectionMatrix();

      // fade out只到50%，然后保持50%（确保A+B总opacity=100%）
      const opacity = progress <= 0.5 ? 1 - progress : 0.5;
      container.style.opacity = opacity.toString();

      // 在50%进度时触发场景切换（交叉过渡）
      if (progress >= 0.5 && !hasTriggeredSwitch && onComplete) {
        hasTriggeredSwitch = true;
        console.log(`🔄 Zoom in reached 50%, triggering crossfade transition. A opacity: 50%, B will start at 50%`);
        onComplete();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log(`✅ Zoom in + fade out animation completed, final FOV: ${currentFov.toFixed(1)}°, opacity: 0`);
        // 如果还没触发切换（理论上不应该发生），在这里触发
        if (!hasTriggeredSwitch && onComplete) {
          onComplete();
        }
      }
    };

    animate();
  };

  /**
   * 从zoom out状态恢复到正常FOV + fade in（从50%开始）
   */
  const animateZoomRestore = (zoomOutFov: number, onComplete?: () => void) => {
    if (!cameraRef.current || !containerRef.current) return;

    const camera = cameraRef.current;
    const container = containerRef.current;
    const targetFov = 75; // 恢复到正常FOV
    const duration = 2000; // 2秒动画，但从50%开始
    const startTime = Date.now();

    console.log(`🔍 Starting zoom restore + fade in animation from zoom-out FOV ${zoomOutFov.toFixed(1)}° to normal FOV ${targetFov.toFixed(1)}°`);

    // 立即设置起始FOV（zoom out状态）和透明度为50%
    camera.fov = zoomOutFov;
    camera.updateProjectionMatrix();
    container.style.opacity = '0.5'; // 从50%开始，确保无黑屏

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用easeOutQuad缓动函数，让恢复更自然
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      // 计算当前FOV（从zoom out状态恢复到正常状态）
      const currentFov = zoomOutFov + (targetFov - zoomOutFov) * easeProgress;

      // 更新相机FOV
      camera.fov = currentFov;
      camera.updateProjectionMatrix();

      // fade in从50%到100%（确保A+B总opacity=100%）
      const opacity = 0.5 + (0.5 * progress);
      container.style.opacity = opacity.toString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log(`✅ Zoom restore + fade in animation completed, final FOV: ${currentFov.toFixed(1)}°, opacity: 1`);
        if (onComplete) {
          onComplete();
        }
      }
    };

    animate();
  };

  /**
   * 设置鼠标控制
   */
  const setupMouseControls = (camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) => {
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    console.log(`🧭 Mouse control initialized with lon=${viewAngleRef.current.lon}°, lat=${viewAngleRef.current.lat}°`);

    // 设置初始相机朝向（使用传入的初始视角）
    updateCameraRotation(camera, viewAngleRef.current.lon, viewAngleRef.current.lat);

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    const DRAG_THRESHOLD = 5; // 像素阈值，超过此值认为是拖拽

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      isDragging = false;
      mouseX = event.clientX;
      mouseY = event.clientY;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      canvas.style.cursor = 'grabbing';
    };



    const onMouseUp = () => {
      if (isMouseDown && isDragging) {
        // 拖拽完成，打印最终旋转量
        const finalAngle = viewAngleRef.current;
        console.log(`🎯 Drag completed: Final rotation lon=${finalAngle.lon.toFixed(1)}°, lat=${finalAngle.lat.toFixed(1)}°`);
      }
      isMouseDown = false;
      canvas.style.cursor = 'grab';
    };

    const onClick = (event: MouseEvent) => {
      // 只有在没有拖拽的情况下才处理点击
      if (!isDragging && hotspotManagerRef.current) {
        hotspotManagerRef.current.handleClick(event, camera, canvas);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isMouseDown) {
        // 检查是否超过拖拽阈值
        const dragDistance = Math.sqrt(
          Math.pow(event.clientX - dragStartX, 2) +
          Math.pow(event.clientY - dragStartY, 2)
        );

        if (dragDistance > DRAG_THRESHOLD) {
          isDragging = true;
        }

        // 拖拽逻辑
        const deltaX = event.clientX - mouseX;
        const deltaY = event.clientY - mouseY;

        mouseX = event.clientX;
        mouseY = event.clientY;

        // 调整灵敏度
        const newLon = viewAngleRef.current.lon - deltaX * 0.2;
        const newLat = Math.max(-85, Math.min(85, viewAngleRef.current.lat + deltaY * 0.2));

        // 更新ref中的实时值
        viewAngleRef.current = { lon: newLon, lat: newLat };

        // 更新state（用于传递给父组件）
        setViewAngle({ lon: newLon, lat: newLat });

        // 更新相机朝向
        updateCameraRotation(camera, newLon, newLat);
      } else {
        // hover效果
        if (hotspotManagerRef.current) {
          hotspotManagerRef.current.updateHover(event, camera, canvas);
        }
      }
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
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('wheel', onWheel);
    canvas.style.cursor = 'grab';

    // 返回清理函数
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('wheel', onWheel);
    };
  };

  /**
   * 开始渲染循环
   */
  const startRenderLoop = () => {
    console.log(`🔄 Starting render loop`);
    let frameCount = 0;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // 只在前几帧打印调试信息
        if (frameCount < 5) {
          frameCount++;
          console.log(`🎬 Frame ${frameCount} rendered`);
          if (frameCount === 5) {
            console.log(`✅ Render loop is working normally`);
          }
        }
      }
    };
    animate();
  };

  /**
   * 清理资源
   */
  const cleanup = () => {
    try {
      console.log(`🧹 Cleaning up PanoramaViewer for camera ${initOnceRef.current}`);

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

      // 清理hotspot管理器
      if (hotspotManagerRef.current) {
        hotspotManagerRef.current.dispose();
        hotspotManagerRef.current = null;
      }

      // 重置初始化标记
      initOnceRef.current = null;

      console.log('✅ PanoramaViewer cleanup completed');
    } catch (error) {
      console.warn('❌ Error during cleanup:', error);
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
      <div
        ref={containerRef}
        className="panorama-container"
        style={{
          width: '100%',
          height: '100%'
        }}
      />

      <div className="panorama-controls">
        <button onClick={onEscape} className="escape-button">
          ← Back to Bird View (ESC)
        </button>
        <div className="camera-info">
          Camera {cameraId}
        </div>
      </div>
    </div>
  );
};

export default PanoramaViewer;
