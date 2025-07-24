import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CoordinateAxesHelper } from './coordinateAxesHelper';

/**
 * Three.js场景管理器
 * 负责创建和管理3D场景、渲染器、相机等核心组件
 */

export interface SceneManagerOptions {
  container: HTMLElement;
  enableControls?: boolean;
  enableShadows?: boolean;
  backgroundColor?: number;
  cameraPosition?: THREE.Vector3;
  cameraTarget?: THREE.Vector3;
  showCoordinateAxes?: boolean;
  showGrid?: boolean;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls?: OrbitControls;
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;
  
  private container: HTMLElement;
  private animationId?: number;
  private resizeObserver?: ResizeObserver;
  
  // 加载器
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  
  // 场景对象组
  public contentGroup: THREE.Group;      // 新增：包含模型和相机节点的主容器
  public modelGroup: THREE.Group;
  public cameraNodesGroup: THREE.Group;
  public lightsGroup: THREE.Group;
  public helpersGroup: THREE.Group;

  // 辅助工具
  public coordinateAxes?: CoordinateAxesHelper;

  constructor(options: SceneManagerOptions) {
    this.container = options.container;
    
    // 初始化核心组件
    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer(options);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // 初始化加载器
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    
    // 创建对象组
    this.contentGroup = new THREE.Group();
    this.modelGroup = new THREE.Group();
    this.cameraNodesGroup = new THREE.Group();
    this.lightsGroup = new THREE.Group();
    this.helpersGroup = new THREE.Group();

    // 将模型和相机节点添加到内容组中
    this.contentGroup.add(this.modelGroup);
    this.contentGroup.add(this.cameraNodesGroup);

    // 应用整体旋转：绕X轴旋转90度
    this.contentGroup.rotation.x = Math.PI / 2;
    this.contentGroup.name = 'ContentGroup';

    // 将各组添加到场景
    this.scene.add(this.contentGroup);
    this.scene.add(this.lightsGroup);
    this.scene.add(this.helpersGroup);
    
    // 设置场景
    this.setupScene(options);
    this.setupLighting();
    
    // 设置控制器
    if (options.enableControls !== false) {
      this.setupControls(options);
    }

    // 设置辅助工具
    this.setupHelpers(options);

    // 设置事件监听
    this.setupEventListeners();

    // 开始渲染循环
    this.startRenderLoop();
    
    console.log('SceneManager initialized successfully');
  }

  /**
   * 创建透视相机
   */
  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      75, // FOV
      this.container.clientWidth / this.container.clientHeight, // 宽高比
      0.1, // 近裁剪面
      1000 // 远裁剪面
    );
    
    // 设置默认相机位置（俯视角度）
    camera.position.set(5, 8, 5);
    camera.lookAt(0, 0, 0);
    
    return camera;
  }

  /**
   * 创建WebGL渲染器
   */
  private createRenderer(options: SceneManagerOptions): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 启用阴影
    if (options.enableShadows !== false) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // 设置色调映射 - 增加曝光度让场景更亮
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    
    this.container.appendChild(renderer.domElement);
    
    return renderer;
  }

  /**
   * 设置场景基础属性
   */
  private setupScene(options: SceneManagerOptions): void {
    // 设置背景色
    const backgroundColor = options.backgroundColor ?? 0x222222;
    this.scene.background = new THREE.Color(backgroundColor);
    
    // 添加雾效果
    this.scene.fog = new THREE.Fog(backgroundColor, 10, 50);
  }

  /**
   * 设置光照系统
   */
  private setupLighting(): void {
    // 适度增强环境光 - 提高整体亮度
    const ambientLight = new THREE.AmbientLight(0x505050, 1.5);
    this.lightsGroup.add(ambientLight);

    // 主方向光（模拟太阳光）- 适度增强强度
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;

    // 设置阴影参数
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;

    this.lightsGroup.add(directionalLight);

    // 补充光源 - 适度增强强度
    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.7);
    fillLight.position.set(-5, 5, -5);
    this.lightsGroup.add(fillLight);

    // 添加额外的侧光源
    const sideLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    sideLight1.position.set(5, 3, -10);
    this.lightsGroup.add(sideLight1);

    const sideLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    sideLight2.position.set(-5, 3, 10);
    this.lightsGroup.add(sideLight2);

    console.log('Enhanced lighting system setup completed');
  }

  /**
   * 设置轨道控制器
   */
  private setupControls(options: SceneManagerOptions): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // 控制器参数
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;

    // 移除角度限制，允许全方位旋转
    // this.controls.minPolarAngle = Math.PI / 6; // 30度
    // this.controls.maxPolarAngle = Math.PI / 2; // 90度

    // 限制缩放距离
    this.controls.minDistance = 1;
    this.controls.maxDistance = 50;
    
    // 设置目标点
    if (options.cameraTarget) {
      this.controls.target.copy(options.cameraTarget);
    }
    
    this.controls.update();
    
    console.log('Orbit controls setup completed');
  }

  /**
   * 设置辅助工具
   */
  private setupHelpers(options: SceneManagerOptions): void {
    // 创建坐标轴
    if (options.showCoordinateAxes !== false) {
      this.coordinateAxes = new CoordinateAxesHelper({
        size: 2.0,
        lineWidth: 0.05,
        showLabels: false,  // 不显示X/Y/Z文字标签
        labelSize: 0.3,
        opacity: 0.8
      });

      this.helpersGroup.add(this.coordinateAxes.getGroup());
      console.log('Coordinate axes added at origin (0,0,0)');
    }

    // 创建网格辅助线
    if (options.showGrid) {
      // 主网格 - 较大的网格
      const mainGrid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
      mainGrid.name = 'MainGrid';
      this.helpersGroup.add(mainGrid);

      // 细网格 - 更密集的网格
      const fineGrid = new THREE.GridHelper(20, 100, 0x333333, 0x222222);
      fineGrid.name = 'FineGrid';
      this.helpersGroup.add(fineGrid);

      // XZ平面网格（水平面）
      const planeGrid = this.createPlaneGrid(10, 10, 0x666666);
      this.helpersGroup.add(planeGrid);

      console.log('Grid helpers added (main + fine + plane)');
    }

    console.log('Scene helpers setup completed');
  }

  /**
   * 创建平面网格
   */
  private createPlaneGrid(size: number, divisions: number, color: number): THREE.LineSegments {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const step = size / divisions;
    const halfSize = size / 2;

    // 创建网格线
    for (let i = 0; i <= divisions; i++) {
      const pos = -halfSize + i * step;

      // X方向的线
      vertices.push(-halfSize, 0, pos);
      vertices.push(halfSize, 0, pos);

      // Z方向的线
      vertices.push(pos, 0, -halfSize);
      vertices.push(pos, 0, halfSize);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });

    const grid = new THREE.LineSegments(geometry, material);
    grid.name = 'PlaneGrid';

    return grid;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 窗口大小变化
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);

    // 鼠标事件（用于射线检测）
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      this.updateMousePosition(event);
    });

    // 使用mousedown和mouseup来检测真正的点击
    let mouseDownTime = 0;
    let mouseDownPosition = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener('mousedown', (event) => {
      mouseDownTime = Date.now();
      mouseDownPosition = { x: event.clientX, y: event.clientY };
    });

    this.renderer.domElement.addEventListener('mouseup', (event) => {
      const clickDuration = Date.now() - mouseDownTime;
      const distance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPosition.x, 2) +
        Math.pow(event.clientY - mouseDownPosition.y, 2)
      );

      // 只有在快速点击且鼠标移动距离很小时才认为是点击
      if (clickDuration < 200 && distance < 5) {
        this.handleClick(event);
      }
    });
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    
    console.log(`Scene resized to ${width}x${height}`);
  }

  /**
   * 更新鼠标位置（用于射线检测）
   */
  private updateMousePosition(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 处理点击事件
   */
  private handleClick(event: MouseEvent): void {
    console.log('Click event triggered');
    this.updateMousePosition(event);

    // 射线检测
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cameraNodesGroup.children, true);

    console.log(`Raycaster found ${intersects.length} intersections`);
    console.log('Camera nodes group children count:', this.cameraNodesGroup.children.length);
    console.log('Camera nodes group visible:', this.cameraNodesGroup.visible);
    console.log('Camera nodes group position:', this.cameraNodesGroup.position);
    console.log('Mouse position:', this.mouse);

    // 调试：检查第一个相机节点的详细信息
    if (this.cameraNodesGroup.children.length > 0) {
      const firstNode = this.cameraNodesGroup.children[0];
      console.log('First camera node:', firstNode);
      console.log('First camera node visible:', firstNode.visible);
      console.log('First camera node position:', firstNode.position);
      console.log('First camera node children count:', firstNode.children.length);
    }

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      console.log('Clicked object:', clickedObject);
      console.log('Clicked object userData:', clickedObject.userData);

      // 查找包含相机数据的父节点
      const cameraNode = this.findCameraNode(clickedObject);
      if (cameraNode) {
        console.log('Camera node found:', cameraNode.userData);
        this.onNodeClick(cameraNode);
      } else {
        console.log('No camera node found, using clicked object');
        this.onNodeClick(clickedObject);
      }
    } else {
      console.log('No intersections found');
    }
  }

  /**
   * 查找相机节点
   */
  private findCameraNode(object: THREE.Object3D): THREE.Object3D | null {
    let current = object;
    while (current) {
      if (current.userData && current.userData.type === 'cameraNode') {
        return current;
      }
      current = current.parent!;
    }
    return null;
  }

  /**
   * 节点点击回调（可以被外部重写）
   */
  public onNodeClick(object: THREE.Object3D): void {
    console.log('Node clicked:', object.userData);
  }

  /**
   * 开始渲染循环
   */
  private startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      // 更新控制器
      if (this.controls) {
        this.controls.update();
      }
      
      // 渲染场景
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }

  /**
   * 停止渲染循环
   */
  public stopRenderLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.stopRenderLoop();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.controls) {
      this.controls.dispose();
    }
    
    this.renderer.dispose();
    
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    console.log('SceneManager disposed');
  }

  /**
   * 获取加载器
   */
  public getGLTFLoader(): GLTFLoader {
    return this.gltfLoader;
  }

  public getTextureLoader(): THREE.TextureLoader {
    return this.textureLoader;
  }

  /**
   * 显示/隐藏坐标轴
   */
  public setCoordinateAxesVisible(visible: boolean): void {
    if (this.coordinateAxes) {
      this.coordinateAxes.setVisible(visible);
      console.log(`Coordinate axes ${visible ? 'shown' : 'hidden'}`);
    }
  }

  /**
   * 设置坐标轴缩放
   */
  public setCoordinateAxesScale(scale: number): void {
    if (this.coordinateAxes) {
      this.coordinateAxes.setScale(scale);
      console.log(`Coordinate axes scale set to ${scale}`);
    }
  }

  /**
   * 获取坐标轴信息
   */
  public getCoordinateAxesInfo(): any {
    return this.coordinateAxes?.getAxesInfo();
  }

  /**
   * 显示/隐藏网格
   */
  public setGridVisible(visible: boolean): void {
    this.helpersGroup.children.forEach(child => {
      if (child.name.includes('Grid')) {
        child.visible = visible;
      }
    });
    console.log(`Grid ${visible ? 'shown' : 'hidden'}`);
  }

  /**
   * 设置网格透明度
   */
  public setGridOpacity(opacity: number): void {
    this.helpersGroup.children.forEach(child => {
      if (child.name.includes('Grid') && child instanceof THREE.GridHelper) {
        (child.material as THREE.Material).opacity = opacity;
      }
      if (child.name === 'PlaneGrid' && child instanceof THREE.LineSegments) {
        (child.material as THREE.LineBasicMaterial).opacity = opacity;
      }
    });
    console.log(`Grid opacity set to ${opacity}`);
  }

  /**
   * 设置内容组旋转
   */
  public setContentRotation(x: number, y: number, z: number): void {
    this.contentGroup.rotation.set(x, y, z);
    console.log(`Content group rotation set to (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
  }

  /**
   * 绕X轴旋转内容组
   */
  public rotateContentAroundX(angle: number): void {
    this.contentGroup.rotation.x = angle;
    console.log(`Content group rotated around X-axis by ${(angle * 180 / Math.PI).toFixed(1)} degrees`);
  }

  /**
   * 重置内容组旋转
   */
  public resetContentRotation(): void {
    this.contentGroup.rotation.set(0, 0, 0);
    console.log('Content group rotation reset');
  }

  /**
   * 调整环境光强度
   */
  public setAmbientLightIntensity(intensity: number): void {
    this.lightsGroup.children.forEach(light => {
      if (light instanceof THREE.AmbientLight) {
        light.intensity = intensity;
      }
    });
    console.log(`Ambient light intensity set to ${intensity}`);
  }

  /**
   * 调整方向光强度
   */
  public setDirectionalLightIntensity(intensity: number): void {
    this.lightsGroup.children.forEach(light => {
      if (light instanceof THREE.DirectionalLight) {
        light.intensity = intensity;
      }
    });
    // 移除冗余的光照调整日志
    // console.log(`Directional light intensity set to ${intensity}`);
  }

  /**
   * 获取场景统计信息
   */
  public getSceneInfo(): {
    models: number;
    cameras: number;
    helpers: number;
    lights: number;
    contentRotation: number[];
  } {
    return {
      models: this.modelGroup.children.length,
      cameras: this.cameraNodesGroup.children.length,
      helpers: this.helpersGroup.children.length,
      lights: this.lightsGroup.children.length,
      contentRotation: this.contentGroup.rotation.toArray()
    };
  }
}
