import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import { CameraData } from '@/types';

/**
 * 相机节点可视化器
 * 负责在3D场景中创建和管理相机位置的可视化标记
 */

export interface NodeVisualizationOptions {
  nodeSize?: number;
  nodeColor?: number;
  hoverColor?: number;
  selectedColor?: number;
  showLabels?: boolean;
  labelSize?: number;
  labelColor?: string;
  showDirection?: boolean;  // 新增：是否显示方向指示器
}

export class CameraNodeVisualizer {
  private sceneManager: SceneManager;
  private options: Required<NodeVisualizationOptions>;
  private nodes: Map<number, THREE.Group> = new Map();
  private hoveredNode?: THREE.Group;
  private selectedNode?: THREE.Group;
  
  // 材质缓存
  private materials: {
    normal: THREE.MeshStandardMaterial;
    hover: THREE.MeshStandardMaterial;
    selected: THREE.MeshStandardMaterial;
  };

  constructor(sceneManager: SceneManager, options: NodeVisualizationOptions = {}) {
    this.sceneManager = sceneManager;
    this.options = {
      nodeSize: options.nodeSize ?? 0.2,
      nodeColor: options.nodeColor ?? 0x4a90e2,
      hoverColor: options.hoverColor ?? 0xff6b6b,
      selectedColor: options.selectedColor ?? 0x4ecdc4,
      showLabels: options.showLabels ?? true,
      labelSize: options.labelSize ?? 0.3,
      labelColor: options.labelColor ?? '#ffffff',
      showDirection: options.showDirection ?? false  // 默认不显示方向指示器
    };

    this.createMaterials();
    this.setupEventListeners();
  }

  /**
   * 创建材质
   */
  private createMaterials(): void {
    this.materials = {
      normal: new THREE.MeshStandardMaterial({
        color: this.options.nodeColor,
        roughness: 0.4,
        metalness: 0.1,
        emissive: new THREE.Color(this.options.nodeColor).multiplyScalar(0.1)
      }),
      hover: new THREE.MeshStandardMaterial({
        color: this.options.hoverColor,
        roughness: 0.3,
        metalness: 0.2,
        emissive: new THREE.Color(this.options.hoverColor).multiplyScalar(0.2)
      }),
      selected: new THREE.MeshStandardMaterial({
        color: this.options.selectedColor,
        roughness: 0.2,
        metalness: 0.3,
        emissive: new THREE.Color(this.options.selectedColor).multiplyScalar(0.3)
      })
    };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 鼠标移动事件（悬停效果）
    this.sceneManager.renderer.domElement.addEventListener('mousemove', (event) => {
      this.handleMouseMove(event);
    });
  }

  /**
   * 创建相机节点
   */
  public createCameraNodes(cameras: CameraData[]): void {
    console.log(`Creating ${cameras.length} camera nodes...`);

    cameras.forEach((camera, index) => {
      console.log(`Creating node ${index + 1}/${cameras.length}: ${camera.label} at position (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);

      const nodeGroup = this.createSingleNode(camera);
      this.nodes.set(camera.id, nodeGroup);
      this.sceneManager.cameraNodesGroup.add(nodeGroup);
    });

    console.log(`Camera nodes created successfully: ${this.nodes.size} nodes added to scene`);
    console.log('Node positions:', Array.from(this.nodes.values()).map(node => ({
      position: node.position.toArray(),
      userData: node.userData
    })));
  }

  /**
   * 创建单个节点
   */
  private createSingleNode(camera: CameraData): THREE.Group {
    const nodeGroup = new THREE.Group();
    nodeGroup.userData = {
      cameraId: camera.id,
      cameraLabel: camera.label,
      camera: camera,  // 保存完整的相机数据
      type: 'cameraNode'
    };

    // 创建球体几何体
    const sphereGeometry = new THREE.SphereGeometry(this.options.nodeSize, 16, 12);
    const sphereMesh = new THREE.Mesh(sphereGeometry, this.materials.normal);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    nodeGroup.add(sphereMesh);

    // 添加本地坐标轴（如果启用）
    if (this.options.showDirection) {
      const localAxes = this.createLocalCoordinateAxes(this.options.nodeSize);
      nodeGroup.add(localAxes);

      // 应用相机的旋转到坐标轴
      if (camera.rotation && camera.rotation instanceof THREE.Quaternion) {
        localAxes.setRotationFromQuaternion(camera.rotation);
      }
    }

    // 设置位置
    nodeGroup.position.copy(camera.position);

    // 创建标签
    if (this.options.showLabels) {
      const label = this.createLabel(camera.label);
      nodeGroup.add(label);
    }

    return nodeGroup;
  }

  /**
   * 创建文本标签
   */
  private createLabel(text: string): THREE.Sprite {
    // 创建canvas来绘制文本
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // 设置canvas大小
    canvas.width = 256;
    canvas.height = 64;
    
    // 设置字体样式
    context.font = '24px Arial';
    context.fillStyle = this.options.labelColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // 绘制背景
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制文本
    context.fillStyle = this.options.labelColor;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // 创建纹理和材质
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // 创建精灵
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(this.options.labelSize * 2, this.options.labelSize * 0.5, 1);
    sprite.position.set(0, this.options.nodeSize * 2, 0);
    
    return sprite;
  }

  /**
   * 处理鼠标移动（悬停效果）
   */
  private handleMouseMove(event: MouseEvent): void {
    // 更新鼠标位置
    const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // 射线检测
    this.sceneManager.raycaster.setFromCamera(mouse, this.sceneManager.camera);
    const intersects = this.sceneManager.raycaster.intersectObjects(
      this.sceneManager.cameraNodesGroup.children, 
      true
    );

    // 重置之前的悬停状态
    if (this.hoveredNode && this.hoveredNode !== this.selectedNode) {
      this.setNodeMaterial(this.hoveredNode, this.materials.normal);
    }
    this.hoveredNode = undefined;

    // 设置新的悬停状态
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      const nodeGroup = this.findNodeGroup(intersectedObject);
      
      if (nodeGroup && nodeGroup !== this.selectedNode) {
        this.hoveredNode = nodeGroup;
        this.setNodeMaterial(nodeGroup, this.materials.hover);
        
        // 更改鼠标样式
        this.sceneManager.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      // 恢复默认鼠标样式
      this.sceneManager.renderer.domElement.style.cursor = 'default';
    }
  }

  /**
   * 查找节点组
   */
  private findNodeGroup(object: THREE.Object3D): THREE.Group | undefined {
    let current = object;
    while (current && current.parent) {
      if (current.userData.type === 'cameraNode') {
        return current as THREE.Group;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * 设置节点材质
   */
  private setNodeMaterial(nodeGroup: THREE.Group, material: THREE.Material): void {
    nodeGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
      }
    });
  }

  /**
   * 选择节点
   */
  public selectNode(cameraId: number): void {
    // 重置之前的选择
    if (this.selectedNode) {
      this.setNodeMaterial(this.selectedNode, this.materials.normal);
    }

    // 设置新的选择
    const nodeGroup = this.nodes.get(cameraId);
    if (nodeGroup) {
      this.selectedNode = nodeGroup;
      this.setNodeMaterial(nodeGroup, this.materials.selected);
    }
  }

  /**
   * 清除选择
   */
  public clearSelection(): void {
    if (this.selectedNode) {
      this.setNodeMaterial(this.selectedNode, this.materials.normal);
      this.selectedNode = undefined;
    }
  }

  /**
   * 获取节点位置
   */
  public getNodePosition(cameraId: number): THREE.Vector3 | undefined {
    const nodeGroup = this.nodes.get(cameraId);
    return nodeGroup?.position.clone();
  }

  /**
   * 更新节点可见性
   */
  public setNodeVisibility(cameraId: number, visible: boolean): void {
    const nodeGroup = this.nodes.get(cameraId);
    if (nodeGroup) {
      nodeGroup.visible = visible;
    }
  }

  /**
   * 更新所有节点可见性
   */
  public setAllNodesVisibility(visible: boolean): void {
    this.nodes.forEach(nodeGroup => {
      nodeGroup.visible = visible;
    });
  }

  /**
   * 获取所有节点位置
   */
  public getAllNodePositions(): THREE.Vector3[] {
    return Array.from(this.nodes.values()).map(node => node.position.clone());
  }

  /**
   * 创建本地坐标轴
   */
  private createLocalCoordinateAxes(nodeSize: number): THREE.Group {
    const axesGroup = new THREE.Group();
    axesGroup.name = 'LocalAxes';

    const axisLength = nodeSize * 2; // 轴长度为球体直径
    const axisWidth = 0.02; // 轴的粗细

    // 创建圆柱体几何体（用作轴）
    const cylinderGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);

    // X轴 - 红色
    const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(cylinderGeometry, xAxisMaterial);
    xAxis.rotation.z = -Math.PI / 2; // 旋转使其指向X方向
    xAxis.position.x = axisLength / 2;
    xAxis.name = 'XAxis';
    axesGroup.add(xAxis);

    // Y轴 - 绿色
    const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(cylinderGeometry, yAxisMaterial);
    yAxis.position.y = axisLength / 2;
    yAxis.name = 'YAxis';
    axesGroup.add(yAxis);

    // Z轴 - 蓝色
    const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(cylinderGeometry, zAxisMaterial);
    zAxis.rotation.x = Math.PI / 2; // 旋转使其指向Z方向
    zAxis.position.z = axisLength / 2;
    zAxis.name = 'ZAxis';
    axesGroup.add(zAxis);

    return axesGroup;
  }

  /**
   * 切换方向指示器显示
   */
  public toggleDirectionIndicators(show: boolean): void {
    this.options.showDirection = show;

    // 更新所有现有节点
    this.nodes.forEach(nodeGroup => {
      // 移除现有的坐标轴
      const existingAxes = nodeGroup.getObjectByName('LocalAxes');
      if (existingAxes) {
        nodeGroup.remove(existingAxes);
      }

      // 如果需要显示，添加新的坐标轴
      if (show) {
        const camera = nodeGroup.userData.camera;
        const localAxes = this.createLocalCoordinateAxes(this.options.nodeSize);
        nodeGroup.add(localAxes);

        // 应用相机的旋转
        if (camera.rotation && camera.rotation instanceof THREE.Quaternion) {
          localAxes.setRotationFromQuaternion(camera.rotation);
        }
      }
    });

    console.log(`Direction indicators ${show ? 'enabled' : 'disabled'}`);
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 清理材质
    Object.values(this.materials).forEach(material => material.dispose());
    
    // 清理节点
    this.nodes.forEach(nodeGroup => {
      this.sceneManager.cameraNodesGroup.remove(nodeGroup);
      
      // 清理几何体和材质
      nodeGroup.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
        if (child instanceof THREE.Sprite) {
          child.material.dispose();
        }
      });
    });

    this.nodes.clear();
    console.log('CameraNodeVisualizer disposed');
  }
}
