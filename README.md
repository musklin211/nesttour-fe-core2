# NestTour 3D可视化项目

基于React + TypeScript + Three.js + Marzipano的3D场景可视化工具，用于显示相机位置、朝向，并支持全景图查看功能。

## 项目状态

### ✅ 已完成阶段

**第一阶段：项目初始化和环境搭建**
- [x] React + TypeScript + Vite项目结构
- [x] 核心依赖包安装（React, Three.js, xml2js）
- [x] 数据复制脚本和文件管理系统
- [x] 基础组件架构和状态管理

**第二阶段：数据处理和解析模块**
- [x] 实现XML解析器 (`src/utils/xmlParser.ts`)
- [x] 创建相机数据类型定义 (`src/types/camera.ts`)
- [x] 实现坐标系转换 (Metashape → Three.js)
- [x] 添加数据验证和错误处理
- [x] 实现数据缓存机制
- [x] 创建调试和可视化工具

**第三阶段：Bird-view 3D场景实现**
- [x] 创建SceneManager (`src/utils/sceneManager.ts`)
- [x] 集成WebGL渲染器和光照系统
- [x] 加载GLB模型和纹理 (`src/utils/modelLoader.ts`)
- [x] 实现相机节点可视化 (`src/utils/cameraVisualizer.ts`)
- [x] 添加OrbitControls交互控制
- [x] 实现Raycaster点击检测
- [x] 创建坐标轴辅助工具 (`src/utils/coordinateAxesHelper.ts`)

### � 进行中

**第三阶段细节优化**
- [x] 光照系统调整和优化
- [x] 坐标系显示和相机朝向可视化
- [x] 默认启用相机节点坐标轴显示
- [ ] 性能优化和用户体验改进

### 🔄 进行中

**第四阶段：Panoramic-view全景查看器**
- [x] 集成Marzipano库
- [x] 创建全景查看器组件 (`src/components/PanoramaViewer.tsx`)
- [x] 实现全景图加载和显示
- [x] 实现视图切换逻辑 (Bird-view ↔ Panoramic-view)
- [x] 添加ESC键返回功能
- [ ] 测试和调试全景图加载
- [ ] 添加hotspot功能

### ⏭️ **下一步开发计划**

**第五阶段：Hotspot功能和场景内导航** 🎯
- [ ] 在全景图中显示其他相机位置的hotspot
- [ ] 实现全景图内的相机切换功能
- [ ] 添加hotspot的视觉效果和交互动画
- [ ] 优化hotspot的3D位置计算

**第六阶段：场景过渡动画**
- [ ] 实现全景图切换的zoom in/out动画
- [ ] 添加fade过渡效果
- [ ] 优化动画性能和流畅度

**第七阶段：用户界面和控制**
- [ ] 创建导航控制面板UI
- [ ] 添加更多键盘快捷键
- [ ] 实现触摸设备支持
- [ ] 添加全屏模式

**第八阶段：高级功能**
- [ ] 添加小地图导航
- [ ] 实现测量工具
- [ ] 添加标注和信息点
- [ ] 性能分析和优化

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **3D渲染**: Three.js (场景管理、模型加载、全景显示)
- **状态管理**: React Hooks + Context
- **样式**: CSS Modules
- **数据格式**: XML (Metashape), GLB (3D模型), JPG (全景图)

## 📁 数据文件结构

```
public/data/sample-space/
├── cameras.xml          # 相机位置和变换矩阵数据 (Metashape SfM生成)
├── model.glb           # 3D场景模型文件
├── texture.jpg         # 模型纹理贴图
└── frames/             # 全景图片目录 (15张equirectangular图像)
    ├── 1_frame_1.JPG   # 5760x2880分辨率
    ├── 1_frame_2.JPG
    ├── ...
    └── 1_frame_15.JPG
```

## 项目结构

```
src/
├── components/          # React组件
│   ├── BirdView.tsx    # 3D场景视图
│   ├── PanoramaViewer.tsx  # 全景查看器 (计划)
│   └── Navigation.tsx  # 导航组件 (计划)
├── utils/              # 工具函数
│   ├── sceneManager.ts # 场景管理
│   ├── xmlParser.ts    # XML解析
│   ├── modelLoader.ts  # 模型加载
│   ├── cameraVisualizer.ts # 相机可视化
│   └── coordinateAxesHelper.ts # 坐标轴工具
├── types/              # 类型定义
│   └── camera.ts       # 相机数据类型
└── hooks/              # 自定义Hooks
    └── useSceneManager.ts # 场景管理Hook
```

## 开发命令

```bash
# 安装依赖
npm install

# 复制数据文件 (必需步骤)
npm run copy-data

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

## 数据文件管理

⚠️ **重要**: 以下目录不在版本控制中，需要手动管理：

### 📁 `data/` 目录
- **内容**: 原始数据文件（cameras.xml, model.glb, texture.jpg, 全景图片）
- **大小**: ~100MB+
- **获取方式**: 从项目维护者处单独获取
- **用途**: 通过 `npm run copy-data` 复制到 `public/data/`

### 📁 `public/` 目录
- **内容**: 运行时数据目录（从data/复制而来）
- **状态**: 自动生成，不提交到git
- **清理**: 可以安全删除，重新运行 `npm run copy-data` 即可

### 📁 `ref/` 目录
- **内容**: 外部参考库和文档
- **用途**: 开发参考，不影响项目运行
- **状态**: 本地参考资料，不提交到git

### 🔄 数据同步流程
1. 获取 `data/` 目录的数据文件
2. 运行 `npm run copy-data` 将数据复制到 `public/data/`
3. 启动开发服务器 `npm run dev`

## 数据结构

### 相机数据 (cameras.xml)
- 15个相机位置，每个包含4x4变换矩阵
- GoPro Max 360°球形相机，分辨率5760x2880
- Metashape SfM生成的精确位置和旋转信息

### 3D模型数据
- model.glb: 房屋3D模型文件
- texture.jpg: 模型纹理贴图

### 全景图像
- 15张equirectangular格式的360°全景图
- 文件命名：1_frame_1.JPG 到 1_frame_15.JPG

## 当前功能

### ✅ 已实现功能
- **数据解析**: 完整的cameras.xml解析和坐标系转换
- **3D场景渲染**: Three.js场景、光照、模型加载
- **相机可视化**: 蓝色球体标记相机位置，红色箭头显示朝向
- **交互控制**: OrbitControls支持旋转、缩放、平移
- **点击检测**: Raycaster实现3D对象点击
- **坐标系显示**: 可视化坐标轴辅助理解空间关系
- **错误处理**: 完善的数据加载和解析错误处理

### 🔄 当前开发重点
- 性能优化和用户体验改进
- 准备集成Marzipano全景查看器

## 核心技术实现详解

### 1. 坐标系转换 (`src/utils/xmlParser.ts`)
**问题**: Metashape使用Y-up左手坐标系，Three.js使用Z-up右手坐标系
**解决方案**:
```typescript
// 1. 提取位置：直接使用变换矩阵的第4列
position = new THREE.Vector3(matrix[12], matrix[13], matrix[14])

// 2. 提取旋转矩阵并转换为四元数
rotationMatrix = matrix.slice(0, 12) // 3x3旋转部分
quaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix)

// 3. 应用坐标系转换：绕X轴旋转90度
contentGroup.rotation.x = Math.PI / 2
```

### 2. 相机可视化系统 (`src/utils/cameraVisualizer.ts`)
**设计方案**:
- **位置标记**: 蓝色球体 (半径0.1，材质：MeshLambertMaterial)
- **朝向指示**: 红色箭头 (长度0.5，指向相机前方-Z方向)
- **坐标轴**: RGB三色轴线 (长度0.3，显示相机局部坐标系)
- **标签**: 相机ID文本 (Canvas纹理，白色字体)

### 3. 场景管理架构 (`src/utils/sceneManager.ts`)
**分组结构**:
```
scene
├── contentGroup (绕X轴旋转90°)
│   ├── modelGroup (3D模型)
│   └── cameraNodesGroup (相机节点)
├── lightsGroup (光照系统)
└── helpersGroup (辅助工具)
```

**光照配置**:
- 环境光: AmbientLight(0x505050, 1.5)
- 主方向光: DirectionalLight(0xffffff, 1.8) + 阴影
- 补充光源: 3个方向光，强度0.5-0.7
- 阴影设置: PCFSoftShadowMap, 2048x2048

## 🎉 当前项目状态 (v0.4.0)

### ✅ **核心功能已完成**
- **完整的虚拟漫游体验**：Bird-view ↔ Panoramic-view 无缝切换
- **稳定的全景图显示**：解决了重复初始化和黑屏问题
- **正确的坐标轴显示**：蓝色轴准确指向相机朝向
- **可靠的点击检测**：每次点击都能稳定打开全景图

### 🔧 **已创建的核心文件**
- `src/utils/sceneManager.ts` - 3D场景管理器
- `src/utils/dataParser.ts` - XML数据解析器（重构版）
- `src/utils/modelLoader.ts` - GLB模型加载器
- `src/utils/cameraNodeVisualizer.ts` - 相机节点可视化（重构版）
- `src/utils/coordinateAxesHelper.ts` - 坐标轴辅助工具
- `src/types/index.ts` - 完整的类型定义
- `src/components/BirdView/BirdView.tsx` - 3D场景组件
- `src/components/PanoramaViewer.tsx` - 全景查看器组件
- `src/hooks/useVirtualTour.ts` - 虚拟漫游状态管理

### 🎯 **当前技术状态**
- **相机节点**: 15个相机位置正确解析和显示，坐标轴指向修正
- **坐标系**: Metashape → Three.js转换完全验证
- **全景图**: 基于Three.js的稳定全景显示，支持鼠标交互
- **视图切换**: 完整的状态管理和组件生命周期
- **性能**: 60fps稳定，内存使用优化

## 第四阶段详细执行计划

### 4.1 环境准备 (预计30分钟)
**任务**: 安装Marzipano依赖和类型定义
```bash
npm install marzipano
npm install --save-dev @types/marzipano
```

**验证**: 确保Marzipano库正确导入，无TypeScript错误

### 4.2 创建全景查看器组件 (预计2小时)
**文件**: `src/components/PanoramaViewer.tsx`
**功能要求**:
- 接收相机ID参数
- 加载对应的全景图片 (`public/data/panoramas/1_frame_${id}.jpg`)
- 创建Marzipano viewer实例
- 实现基础的鼠标/触摸控制

**技术要点**:
```typescript
// Marzipano基础设置
const viewer = new Marzipano.Viewer(containerElement)
const source = Marzipano.ImageUrlSource.fromString(imageUrl)
const geometry = new Marzipano.EquirectGeometry([{ width: 4096 }])
const limiter = Marzipano.RectilinearView.limit.traditional(1024, 100*Math.PI/180)
const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0, fov: Math.PI/4 }, limiter)
```

### 4.3 实现视图切换逻辑 (预计1小时)
**文件**: 更新 `src/App.tsx` 或创建状态管理
**功能**:
- 维护当前视图状态 (bird-view | panoramic-view)
- 维护当前选中的相机ID
- 实现视图切换函数

### 4.4 集成点击事件 (预计1小时)
**文件**: 更新 `src/utils/cameraVisualizer.ts`
**功能**:
- 相机节点点击 → 触发视图切换到全景模式
- 传递相机ID给PanoramaViewer组件

### 4.5 添加ESC返回功能 (预计30分钟)
**功能**: 在全景模式下按ESC键返回Bird-view
**实现**: 键盘事件监听器

### 4.6 测试和调试 (预计1小时)
**测试项目**:
- [ ] 全景图片正确加载
- [ ] 鼠标控制正常工作
- [ ] 视图切换流畅
- [ ] ESC键返回功能
- [ ] 错误处理（图片加载失败等）

**总预计时间**: 6小时

## 数据结构详解

### 相机数据 (cameras.xml)
- 15个相机位置，每个包含4x4变换矩阵
- GoPro Max 360°球形相机，分辨率5760x2880
- Metashape SfM生成的精确位置和旋转信息
- 坐标系转换：从Metashape Y-up左手系转换到Three.js Z-up右手系

### 3D模型数据
- model.glb: 房屋3D模型文件（GLB格式）
- texture.jpg: 模型纹理贴图

### 全景图像
- 15张equirectangular格式的360°全景图
- 文件命名：1_frame_3.jpg, 1_frame_6.jpg 等

## 测试和验证方法

### 坐标系验证
1. **相机位置检查**: 相机节点应该分布在3D模型的合理位置
2. **朝向验证**: 红色箭头应该指向相机拍摄方向
3. **坐标轴检查**: Z轴(蓝色)指向相机前方，Y轴(绿色)向上

### 性能基准
- **帧率**: 保持60fps稳定
- **内存**: 初始加载<100MB，运行时增长<50MB
- **加载时间**: 模型加载<3秒，全景图加载<2秒

### 功能测试清单
- [ ] 所有15个相机节点正确显示
- [ ] 鼠标交互流畅（旋转、缩放、平移）
- [ ] 点击相机节点有响应
- [ ] 坐标轴和网格正确显示
- [ ] 光照效果合适，无过曝或过暗
- [ ] 浏览器控制台无错误信息

## 开发工作流

### 每完成一个功能后的检查清单
1. **功能测试**: 验证新功能按预期工作
2. **回归测试**: 确保现有功能未被破坏
3. **性能检查**: 监控帧率和内存使用
4. **代码审查**: 检查代码质量和注释
5. **更新文档**: 更新README.md的进度状态
6. **提交代码**: 使用描述性的commit message

### 调试工具和方法
- **Three.js Inspector**: 浏览器扩展，用于调试3D场景
- **Stats.js**: 性能监控，显示FPS和内存使用
- **Console日志**: SceneManager和其他模块的详细日志
- **坐标轴显示**: 可视化调试坐标系问题

## 开发注意事项

1. **坐标系一致性**: 始终注意Metashape和Three.js坐标系差异
2. **性能监控**: 使用Stats.js监控渲染性能
3. **内存管理**: 及时释放Three.js对象，避免内存泄漏
4. **错误处理**: 完善数据解析和文件加载的错误处理
5. **用户体验**: 添加loading状态和错误提示
6. **数据文件**: 较大文件已添加到.gitignore，使用`npm run copy-data`同步
7. **版本控制**: 每个阶段完成后更新版本号和README状态

## 浏览器支持

- Chrome 90+ (推荐)
- Firefox 88+
- Safari 14+
- Edge 90+

需要WebGL支持用于3D渲染功能。

## 🔄 坐标系统和转换详解

### 📐 **坐标系统概述**

项目中涉及三个主要坐标系统：

1. **Metashape坐标系**（原始数据）
   - X轴：向右
   - Y轴：向前（相机朝向）
   - Z轴：向上
   - 右手坐标系

2. **Three.js坐标系**（渲染引擎）
   - X轴：向右
   - Y轴：向上
   - Z轴：向前
   - 右手坐标系

3. **全景图坐标系**（用户视角）
   - X轴：向右
   - Y轴：向上
   - Z轴：向前（用户朝向）

### 🔧 **关键坐标转换**

#### **1. Metashape → Three.js 转换**
```javascript
// 在 coordinateUtils.ts 中实现
const METASHAPE_TO_THREEJS_MATRIX = new THREE.Matrix4().set(
  1, 0, 0, 0,    // X轴保持不变 (右)
  0, 0, 1, 0,    // Metashape的Z轴 -> Three.js的Y轴 (上)
  0, -1, 0, 0,   // Metashape的Y轴 -> Three.js的-Z轴 (向后)
  0, 0, 0, 1
);
```

#### **2. Bird-view场景旋转**
```javascript
// contentGroup绕X轴旋转90°，使模型正确显示
const SCENE_ROTATION_MATRIX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
```

#### **3. 全景图中的3D Hotspot坐标转换**
```javascript
// 在 panoramaHotspots.ts 中实现
// 步骤1：计算相对位置
let relativePosition = new THREE.Vector3()
  .subVectors(targetCamera.position, currentCamera.position);

// 步骤2：坐标轴重新映射
let mappedPosition = new THREE.Vector3(
  -relativePosition.x,  // X翻转（镜像效果）
  relativePosition.z,   // Z->Y（向上）
  -relativePosition.y   // Y->-Z（向前）
);

// 步骤3：绕Y轴旋转-90度
const rotationMatrix = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
mappedPosition.applyMatrix4(rotationMatrix);
```

### ⚠️ **重要注意事项**

1. **Bird-view中的相机节点**：
   - 使用Three.js坐标系
   - 在contentGroup中，经过90°旋转
   - 坐标轴显示：蓝色轴指向相机实际朝向（-Z方向）

2. **全景图中的3D球体**：
   - 需要特殊的坐标转换
   - 不能直接使用Three.js坐标
   - 必须考虑用户视角和相机朝向

3. **调试技巧**：
   - 使用控制台日志对比转换前后的坐标
   - 通过标签验证球体位置的正确性
   - 确保空间关系与Bird-view一致

### 🎯 **验证方法**

正确的坐标转换应该满足：
- 在1号相机的全景图中，正前方应该是2号相机
- 左边应该是14号相机
- 球体分布应该与Bird-view中的空间关系完全一致

## 🚀 下一步开发重点

**第五阶段：Hotspot功能优化和完善**：
- ✅ 3D球体位置计算和显示
- ✅ Billboard文字标签
- ✅ 正确的坐标系转换
- [ ] 距离透明度优化
- [ ] 交互动画效果
- [ ] 性能优化

---
*最后更新: 2025-07-24*
*当前版本: v0.4.0*
