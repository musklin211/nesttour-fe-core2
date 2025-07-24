import * as THREE from 'three';

/**
 * 坐标轴辅助工具
 * 在原点显示RGB坐标轴：红色X轴，绿色Y轴，蓝色Z轴
 */

export interface AxesHelperOptions {
  size?: number;
  lineWidth?: number;
  showLabels?: boolean;
  labelSize?: number;
  opacity?: number;
}

export class CoordinateAxesHelper {
  private group: THREE.Group;
  private options: Required<AxesHelperOptions>;

  constructor(options: AxesHelperOptions = {}) {
    this.options = {
      size: options.size ?? 2.0,
      lineWidth: options.lineWidth ?? 0.05,
      showLabels: options.showLabels ?? true,
      labelSize: options.labelSize ?? 0.3,
      opacity: options.opacity ?? 0.8
    };

    this.group = new THREE.Group();
    this.group.name = 'CoordinateAxes';
    this.createAxes();
  }

  /**
   * 创建坐标轴
   */
  private createAxes(): void {
    // X轴 - 红色
    const xAxis = this.createAxis(
      new THREE.Vector3(this.options.size, 0, 0),
      0xff0000,
      'X'
    );
    this.group.add(xAxis);

    // Y轴 - 绿色
    const yAxis = this.createAxis(
      new THREE.Vector3(0, this.options.size, 0),
      0x00ff00,
      'Y'
    );
    this.group.add(yAxis);

    // Z轴 - 蓝色
    const zAxis = this.createAxis(
      new THREE.Vector3(0, 0, this.options.size),
      0x0000ff,
      'Z'
    );
    this.group.add(zAxis);

    // 添加原点标记
    const origin = this.createOriginMarker();
    this.group.add(origin);

    console.log('Coordinate axes created at origin (0,0,0)');
  }

  /**
   * 创建单个坐标轴
   */
  private createAxis(direction: THREE.Vector3, color: number, label: string): THREE.Group {
    const axisGroup = new THREE.Group();

    // 创建轴线（使用圆柱体以获得更好的视觉效果）
    const axisGeometry = new THREE.CylinderGeometry(
      this.options.lineWidth / 2,
      this.options.lineWidth / 2,
      direction.length(),
      8
    );
    
    const axisMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: this.options.opacity
    });

    const axisMesh = new THREE.Mesh(axisGeometry, axisMaterial);
    
    // 定位和旋转轴线
    axisMesh.position.copy(direction.clone().multiplyScalar(0.5));
    
    // 根据方向旋转轴线
    if (direction.x > 0) {
      // X轴
      axisMesh.rotation.z = -Math.PI / 2;
    } else if (direction.z > 0) {
      // Z轴
      axisMesh.rotation.x = Math.PI / 2;
    }
    // Y轴不需要旋转，默认就是垂直的

    axisGroup.add(axisMesh);

    // 创建箭头头部
    const arrowHead = this.createArrowHead(direction, color);
    axisGroup.add(arrowHead);

    // 创建标签
    if (this.options.showLabels) {
      const labelSprite = this.createAxisLabel(label, color, direction);
      axisGroup.add(labelSprite);
    }

    return axisGroup;
  }

  /**
   * 创建箭头头部
   */
  private createArrowHead(direction: THREE.Vector3, color: number): THREE.Mesh {
    const arrowGeometry = new THREE.ConeGeometry(
      this.options.lineWidth * 2,
      this.options.lineWidth * 4,
      8
    );
    
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: this.options.opacity
    });

    const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    // 定位箭头到轴的末端
    arrowMesh.position.copy(direction);
    
    // 根据方向旋转箭头
    if (direction.x > 0) {
      // X轴箭头
      arrowMesh.rotation.z = -Math.PI / 2;
    } else if (direction.z > 0) {
      // Z轴箭头
      arrowMesh.rotation.x = Math.PI / 2;
    }
    // Y轴箭头不需要旋转

    return arrowMesh;
  }

  /**
   * 创建轴标签
   */
  private createAxisLabel(text: string, color: number, direction: THREE.Vector3): THREE.Sprite {
    // 创建canvas来绘制文本
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    canvas.width = 64;
    canvas.height = 64;
    
    // 设置字体样式
    context.font = 'bold 32px Arial';
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // 绘制文本
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // 创建纹理和材质
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: this.options.opacity
    });
    
    // 创建精灵
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(this.options.labelSize, this.options.labelSize, 1);
    
    // 定位标签到轴末端稍远处
    const labelPosition = direction.clone().multiplyScalar(1.2);
    sprite.position.copy(labelPosition);
    
    return sprite;
  }

  /**
   * 创建原点标记
   */
  private createOriginMarker(): THREE.Mesh {
    const originGeometry = new THREE.SphereGeometry(this.options.lineWidth * 1.5, 8, 6);
    const originMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.options.opacity * 1.2
    });

    const originMesh = new THREE.Mesh(originGeometry, originMaterial);
    originMesh.position.set(0, 0, 0);

    return originMesh;
  }

  /**
   * 获取坐标轴组
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * 设置可见性
   */
  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * 设置位置
   */
  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  /**
   * 设置缩放
   */
  public setScale(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  /**
   * 更新透明度
   */
  public setOpacity(opacity: number): void {
    this.options.opacity = opacity;
    
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        if (child.material instanceof THREE.Material) {
          child.material.opacity = opacity;
        }
      }
    });
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    console.log('CoordinateAxesHelper disposed');
  }

  /**
   * 获取轴信息（用于调试）
   */
  public getAxesInfo(): {
    position: number[];
    scale: number;
    visible: boolean;
    axesCount: number;
  } {
    return {
      position: this.group.position.toArray(),
      scale: this.group.scale.x,
      visible: this.group.visible,
      axesCount: 3
    };
  }

  /**
   * 创建网格辅助线（可选）
   */
  public createGridHelper(size: number = 10, divisions: number = 10): THREE.GridHelper {
    const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0x444444);
    gridHelper.name = 'GridHelper';
    return gridHelper;
  }
}
