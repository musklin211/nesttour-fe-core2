import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneManager } from './sceneManager';

/**
 * 3D模型加载器
 * 负责加载GLB模型和纹理，并应用到场景中
 */

export interface ModelLoadOptions {
  modelUrl: string;
  textureUrl?: string;
  scale?: number;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
}

export class ModelLoader {
  private sceneManager: SceneManager;
  private loadedModel?: THREE.Group;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  /**
   * 加载GLB模型
   */
  public async loadModel(options: ModelLoadOptions): Promise<THREE.Group> {
    console.log('Loading 3D model:', options.modelUrl);

    try {
      // 加载GLB模型
      const gltf = await this.loadGLTF(options.modelUrl);
      const model = gltf.scene;

      // 应用变换
      this.applyTransforms(model, options);

      // 设置材质和纹理
      if (options.textureUrl) {
        await this.applyTexture(model, options.textureUrl);
      }

      // 优化模型
      this.optimizeModel(model);

      // 添加到场景
      this.sceneManager.modelGroup.add(model);
      this.loadedModel = model;

      console.log('Model loaded successfully:', {
        triangles: this.countTriangles(model),
        materials: this.countMaterials(model),
        boundingBox: this.getBoundingBox(model)
      });

      return model;
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  /**
   * 加载GLTF文件
   */
  private loadGLTF(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      const loader = this.sceneManager.getGLTFLoader();
      
      loader.load(
        url,
        (gltf) => resolve(gltf),
        (progress) => {
          // 移除冗余的进度日志
          // const percent = (progress.loaded / progress.total) * 100;
          // console.log(`Model loading progress: ${percent.toFixed(1)}%`);
        },
        (error) => reject(error)
      );
    });
  }

  /**
   * 应用变换（缩放、位置、旋转）
   */
  private applyTransforms(model: THREE.Group, options: ModelLoadOptions): void {
    // 缩放
    if (options.scale !== undefined) {
      model.scale.setScalar(options.scale);
    }

    // 位置
    if (options.position) {
      model.position.copy(options.position);
    }

    // 旋转
    if (options.rotation) {
      model.rotation.copy(options.rotation);
    }

    // 移除冗余的变换日志
    // console.log('Applied transforms:', {
    //   scale: model.scale.toArray(),
    //   position: model.position.toArray(),
    //   rotation: model.rotation.toArray()
    // });
  }

  /**
   * 应用纹理
   */
  private async applyTexture(model: THREE.Group, textureUrl: string): Promise<void> {
    console.log('Loading texture:', textureUrl);

    try {
      const texture = await this.loadTexture(textureUrl);

      // 设置纹理参数
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.flipY = false;

      let materialsProcessed = 0;
      let texturesApplied = 0;

      // 应用纹理到所有材质
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material;

          if (Array.isArray(material)) {
            material.forEach(mat => {
              materialsProcessed++;
              if (this.applyTextureToMaterial(mat, texture)) {
                texturesApplied++;
              }
            });
          } else {
            materialsProcessed++;
            if (this.applyTextureToMaterial(material, texture)) {
              texturesApplied++;
            }
          }
        }
      });

      console.log(`Texture applied successfully: ${texturesApplied}/${materialsProcessed} materials updated`);
    } catch (error) {
      console.warn('Failed to load texture, using default material:', error);
    }
  }

  /**
   * 加载纹理
   */
  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = this.sceneManager.getTextureLoader();
      
      loader.load(
        url,
        (texture) => resolve(texture),
        (progress) => {
          // 移除冗余的纹理加载进度日志
          // const percent = (progress.loaded / progress.total) * 100;
          // console.log(`Texture loading progress: ${percent.toFixed(1)}%`);
        },
        (error) => reject(error)
      );
    });
  }

  /**
   * 将纹理应用到材质
   */
  private applyTextureToMaterial(material: THREE.Material, texture: THREE.Texture): boolean {
    // 移除冗余的材质处理日志
    // console.log(`Processing material: ${material.type}`);

    if (material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshBasicMaterial ||
        material instanceof THREE.MeshLambertMaterial ||
        material instanceof THREE.MeshPhongMaterial) {

      // 保存原始颜色
      const originalColor = material.color?.clone();

      material.map = texture;
      material.needsUpdate = true;

      // 如果是MeshStandardMaterial，增强亮度
      if (material instanceof THREE.MeshStandardMaterial) {
        material.roughness = 0.6;
        material.metalness = 0.1;
        // 增加环境光反射
        material.envMapIntensity = 1.0;
      }

      console.log(`Texture applied to ${material.type}, original color:`, originalColor?.getHexString());
      return true;
    }

    console.log(`Unsupported material type: ${material.type}`);
    return false;
  }

  /**
   * 优化模型性能
   */
  private optimizeModel(model: THREE.Group): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 启用阴影
        child.castShadow = true;
        child.receiveShadow = true;

        // 优化几何体
        if (child.geometry) {
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }

        // 优化材质
        if (child.material) {
          const material = child.material;
          if (Array.isArray(material)) {
            material.forEach(mat => this.optimizeMaterial(mat));
          } else {
            this.optimizeMaterial(material);
          }
        }
      }
    });

    console.log('Model optimization completed');
  }

  /**
   * 优化材质
   */
  private optimizeMaterial(material: THREE.Material): void {
    // 设置材质属性以提高性能和亮度
    if (material instanceof THREE.MeshStandardMaterial) {
      material.roughness = 0.6;
      material.metalness = 0.1;
      // 增强材质亮度
      material.envMapIntensity = 1.0;
      // 如果材质太暗，稍微提亮颜色
      if (material.color) {
        const hsl = { h: 0, s: 0, l: 0 };
        material.color.getHSL(hsl);
        if (hsl.l < 0.5) {
          hsl.l = Math.min(hsl.l * 1.3, 1.0); // 提亮30%，但不超过1.0
          material.color.setHSL(hsl.h, hsl.s, hsl.l);
        }
      }
    }

    // 对其他材质类型也进行亮度优化
    if (material instanceof THREE.MeshLambertMaterial ||
        material instanceof THREE.MeshPhongMaterial) {
      if (material.color) {
        const hsl = { h: 0, s: 0, l: 0 };
        material.color.getHSL(hsl);
        if (hsl.l < 0.5) {
          hsl.l = Math.min(hsl.l * 1.2, 1.0);
          material.color.setHSL(hsl.h, hsl.s, hsl.l);
        }
      }
    }
  }

  /**
   * 计算模型三角形数量
   */
  private countTriangles(model: THREE.Group): number {
    let triangles = 0;
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry;
        if (geometry.index) {
          triangles += geometry.index.count / 3;
        } else {
          triangles += geometry.attributes.position.count / 3;
        }
      }
    });

    return Math.floor(triangles);
  }

  /**
   * 计算材质数量
   */
  private countMaterials(model: THREE.Group): number {
    const materials = new Set<THREE.Material>();
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => materials.add(mat));
        } else {
          materials.add(child.material);
        }
      }
    });

    return materials.size;
  }

  /**
   * 获取模型边界框
   */
  private getBoundingBox(model: THREE.Group): THREE.Box3 {
    const box = new THREE.Box3().setFromObject(model);
    return box;
  }

  /**
   * 获取已加载的模型
   */
  public getLoadedModel(): THREE.Group | undefined {
    return this.loadedModel;
  }

  /**
   * 移除模型
   */
  public removeModel(): void {
    if (this.loadedModel) {
      this.sceneManager.modelGroup.remove(this.loadedModel);
      
      // 清理资源
      this.loadedModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
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

      this.loadedModel = undefined;
      console.log('Model removed and resources cleaned up');
    }
  }

  /**
   * 更新模型位置以适应相机分布
   */
  public centerModelToCameras(cameraPositions: THREE.Vector3[]): void {
    if (!this.loadedModel || cameraPositions.length === 0) {
      return;
    }

    // 计算相机位置的中心点
    const center = new THREE.Vector3();
    cameraPositions.forEach(pos => center.add(pos));
    center.divideScalar(cameraPositions.length);

    // 将模型移动到相机中心
    this.loadedModel.position.copy(center);

    console.log('Model centered to camera positions:', center.toArray());
  }
}
