# Isocity Vue 版设计文档

## 1. 项目概述

### 1.1 原项目分析

原 `isocity` 项目是一个基于 Canvas 的等距城市构建工具，具有以下核心功能：

- **等距地图渲染**：使用单张纹理图实现等距瓦片的渲染
- **工具系统**：提供多种建筑/地形瓦片选择
- **交互操作**：鼠标点击放置瓦片，右键清除瓦片
- **状态保存**：通过 URL Hash 保存地图状态
- **响应式设计**：适配不同屏幕尺寸

### 1.2 Vue 版本目标

使用 Vue 3 框架重构并扩展原项目，实现以下目标：

- 保留原项目的核心功能
- 采用组件化架构，提高代码可维护性
- 添加新功能增强用户体验
- 优化性能和交互体验
- 提供更好的扩展性

## 2. 技术栈

| 技术       | 版本  | 用途             |
| ---------- | ----- | ---------------- |
| Vue        | 3.5+  | 前端框架         |
| Vite       | 7.3+  | 构建工具         |
| pnpm       | 8.15+ | 包管理器         |
| Canvas API | -     | 地图渲染         |
| Pinia      | 2.1+  | 状态管理（可选） |

## 3. 功能分析

### 3.1 原有功能

| 功能         | 描述                   |
| ------------ | ---------------------- |
| 等距地图展示 | 7x7 等距网格地图       |
| 瓦片选择工具 | 基于纹理图的工具面板   |
| 瓦片放置     | 左键点击放置选中瓦片   |
| 瓦片清除     | 右键点击清除瓦片       |
| 地图状态保存 | URL Hash 保存/加载地图 |
| 响应式布局   | 适配不同屏幕尺寸       |

### 3.2 新增功能

| 功能         | 描述                   |
| ------------ | ---------------------- |
| 地图缩放     | 支持地图放大缩小       |
| 地图平移     | 支持拖拽平移地图       |
| 地图尺寸调整 | 可自定义地图大小       |
| 多层级建筑   | 支持不同高度的建筑     |
| 撤销/重做    | 操作历史记录           |
| 保存/加载    | 本地存储地图配置       |
| 导出功能     | 导出地图为图片         |
| 多种纹理集   | 支持切换不同风格的纹理 |

## 4. 架构设计

### 4.1 组件结构

```
App.vue
├── MapCanvas.vue          # 地图渲染组件
├── ToolPanel.vue          # 工具面板组件
├── Controls.vue           # 控制组件（缩放、平移等）
└── MapConfig.vue          # 地图配置组件
```

### 4.2 状态管理

使用 Vue 3 的 Composition API 进行状态管理，核心状态包括：

```javascript
// 地图状态
const mapState = reactive({
  width: 7, // 地图宽度
  height: 7, // 地图高度
  tiles: [], // 瓦片数据
  zoom: 1, // 缩放级别
  panX: 0, // 平移 X 坐标
  panY: 0, // 平移 Y 坐标
});

// 工具状态
const toolState = reactive({
  selectedTool: [0, 0], // 当前选中工具
  isPlacing: false, // 是否正在放置瓦片
  textureSet: "default", // 当前纹理集
});

// 历史记录
const historyState = reactive({
  history: [], // 操作历史
  currentIndex: -1, // 当前历史索引
});
```

### 4.3 核心数据流

1. **地图渲染流程**：

   - 组件挂载时初始化 Canvas
   - 加载纹理图资源
   - 根据 mapState 渲染等距网格
   - 监听 mapState 变化，重新渲染

2. **瓦片放置流程**：
   - 鼠标在 Canvas 上移动，计算当前鼠标位置对应的瓦片坐标
   - 鼠标点击时，更新对应位置的瓦片数据
   - 保存操作到历史记录
   - 更新 URL Hash 保存状态

## 5. 核心功能实现

### 5.1 等距地图渲染

```javascript
// MapCanvas.vue 中的渲染逻辑
const drawMap = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 应用缩放和平移变换
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(panX, panY);

  // 遍历所有瓦片并渲染
  for (let x = 0; x < map.width; x++) {
    for (let y = 0; y < map.height; y++) {
      drawTile(x, y, map.tiles[x][y]);
    }
  }

  ctx.restore();
};

// 绘制单个瓦片
const drawTile = (x, y, tile) => {
  if (!tile || !tile.texture) return;

  // 等距坐标转换
  const screenX = ((y - x) * tileWidth) / 2;
  const screenY = ((x + y) * tileHeight) / 2;

  // 绘制瓦片纹理
  ctx.drawImage(
    textureImage,
    tile.texture.x,
    tile.texture.y, // 纹理图中的位置
    texTileWidth,
    texTileHeight, // 纹理图中的尺寸
    screenX - texTileWidth / 2,
    screenY - texTileHeight, // 屏幕位置
    texTileWidth,
    texTileHeight // 屏幕尺寸
  );
};
```

### 5.2 工具系统

```vue
<!-- ToolPanel.vue -->
<template>
  <div id="tools">
    <div
      v-for="(tool, index) in tools"
      :key="index"
      :id="`tool_${index}`"
      :class="{ selected: isSelected(tool) }"
      @click="selectTool(tool)"
      :style="{
        backgroundPosition: `-${tool.x * texTileWidth}px -${
          tool.y * texTileHeight
        }px`,
      }"
    ></div>
  </div>
</template>

<script setup>
// 工具选择逻辑
const selectTool = (tool) => {
  toolState.selectedTool = [tool.y, tool.x];
};
</script>
```

### 5.3 地图交互

```javascript
// 计算鼠标位置对应的瓦片坐标
const getTilePosition = (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) / zoom - panX;
  const mouseY = (event.clientY - rect.top) / zoom - panY;

  // 等距坐标转换公式
  const x = Math.floor(mouseY / tileHeight - mouseX / tileWidth);
  const y = Math.floor(mouseY / tileHeight + mouseX / tileWidth);

  return { x, y };
};

// 瓦片放置处理
const handleTilePlace = (event) => {
  const pos = getTilePosition(event);
  if (pos.x >= 0 && pos.x < map.width && pos.y >= 0 && pos.y < map.height) {
    // 保存历史记录
    saveHistory();

    // 放置或清除瓦片
    if (event.which === 3) {
      // 右键清除
      map.tiles[pos.x][pos.y] = null;
    } else {
      // 左键放置
      map.tiles[pos.x][pos.y] = {
        texture: {
          x: toolState.selectedTool[1] * texTileWidth,
          y: toolState.selectedTool[0] * texTileHeight,
        },
        layer: 0, // 基础层级
      };
    }

    // 更新地图
    drawMap();
    // 更新 URL Hash
    updateHash();
  }
};
```

## 6. 扩展功能设计

### 6.1 地图缩放和平移

```javascript
// 缩放功能
const handleZoom = (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  mapState.zoom = Math.max(0.5, Math.min(2, mapState.zoom * delta));
  drawMap();
};

// 平移功能
const handlePan = (event) => {
  if (!isDragging) return;
  mapState.panX += event.movementX / mapState.zoom;
  mapState.panY += event.movementY / mapState.zoom;
  drawMap();
};
```

### 6.2 多层级建筑

```javascript
// 瓦片数据结构扩展
const tile = {
  texture: { x, y }, // 纹理位置
  layer: 0, // 层级（0-地面，1-第一层建筑，2-第二层建筑等）
  rotation: 0, // 旋转角度（0-3）
  props: {}, // 其他属性
};

// 渲染时按层级排序
const drawMap = () => {
  // ...
  // 将瓦片按层级分组
  const tilesByLayer = {};
  for (let x = 0; x < map.width; x++) {
    for (let y = 0; y < map.height; y++) {
      const tile = map.tiles[x][y];
      if (tile) {
        if (!tilesByLayer[tile.layer]) {
          tilesByLayer[tile.layer] = [];
        }
        tilesByLayer[tile.layer].push({ x, y, tile });
      }
    }
  }

  // 按层级从低到高渲染
  Object.keys(tilesByLayer)
    .sort((a, b) => a - b)
    .forEach((layer) => {
      tilesByLayer[layer].forEach(({ x, y, tile }) => {
        drawTile(x, y, tile);
      });
    });
  // ...
};
```

### 6.3 撤销/重做功能

```javascript
// 保存历史记录
const saveHistory = () => {
  // 移除当前索引之后的历史
  if (historyState.currentIndex < historyState.history.length - 1) {
    historyState.history = historyState.history.slice(
      0,
      historyState.currentIndex + 1
    );
  }

  // 保存当前地图状态的深拷贝
  const currentState = JSON.parse(JSON.stringify(mapState.tiles));
  historyState.history.push(currentState);
  historyState.currentIndex++;

  // 限制历史记录长度
  if (historyState.history.length > 50) {
    historyState.history.shift();
    historyState.currentIndex--;
  }
};

// 撤销操作
const undo = () => {
  if (historyState.currentIndex > 0) {
    historyState.currentIndex--;
    mapState.tiles = JSON.parse(
      JSON.stringify(historyState.history[historyState.currentIndex])
    );
    drawMap();
  }
};

// 重做操作
const redo = () => {
  if (historyState.currentIndex < historyState.history.length - 1) {
    historyState.currentIndex++;
    mapState.tiles = JSON.parse(
      JSON.stringify(historyState.history[historyState.currentIndex])
    );
    drawMap();
  }
};
```
