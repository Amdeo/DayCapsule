[根目录](../../../../CLAUDE.md) > [app](../../../) > [src](../../) > [services](../) > **ai**

# AI 服务文档

## 模块职责

AI 功能服务层，负责图像识别、标签建议、语义搜索和模型更新管理。

## 入口与启动

- **主文件**: `imageRecognition.ts`, `modelUpdater.ts`
- **初始化**: 应用启动时调用 `ImageRecognitionService.initialize()`
- **模型**: 百度 EasyDL TensorFlow Lite（移动端）或 API 调用（Web端）

## 对外接口

### ImageRecognitionService

```typescript
class ImageRecognitionService {
  // 初始化服务
  async initialize(): Promise<void>

  // 识别图像内容
  async recognizeImage(imageUri: string): Promise<ImageRecognitionResult>

  // 批量识别
  async recognizeImages(imageUris: string[]): Promise<ImageRecognitionResult[]>

  // 检查模型状态
  isModelLoaded(): boolean
}

interface ImageRecognitionResult {
  labels: AITag[];
  confidence: number;
  processingTime: number;
}

interface AITag {
  name: string;
  confidence: number;
  category?: string;
}
```

### ModelUpdater（计划中）

```typescript
class ModelUpdater {
  // 检查模型更新
  async checkForUpdates(): Promise<boolean>

  // 下载新模型
  async downloadModel(): Promise<void>

  // 应用模型更新
  async applyUpdate(): Promise<void>
}
```

## 关键依赖与配置

### 依赖项

```json
{
  "react-native-fs": "^2.x",
  "uuid": "^9.x"
}
```

### 百度 EasyDL API 配置

```typescript
const BAIDU_API_CONFIG = {
  BASE_URL: 'https://aip.baidubce.com',
  MODEL_ID: process.env.BAIDU_EASYD_MODEL_ID,
  ACCESS_TOKEN: process.env.BAIDU_ACCESS_TOKEN,
  API_KEY: process.env.BAIDU_API_KEY,
  SECRET_KEY: process.env.BAIDU_SECRET_KEY,
};
```

### 环境变量配置

在 `.env` 文件中配置：

```bash
BAIDU_EASYD_MODEL_ID=your-model-id
BAIDU_API_KEY=your-api-key
BAIDU_SECRET_KEY=your-secret-key
```

## 数据模型

### 图像识别流程

1. **图像预处理**
   - 调整大小（最大 1024x1024）
   - 压缩质量（80%）
   - 转换为 Base64 或文件路径

2. **模型推理**
   - 移动端：本地 TensorFlow Lite 模型
   - Web端：API 调用百度 EasyDL

3. **结果后处理**
   - 过滤低置信度标签（< 0.5）
   - 标签去重与合并
   - 按置信度排序

### AI 标签类别

支持识别的类别示例：
- **场景**: 室内、室外、办公室、餐厅、公园等
- **物体**: 食物、电子产品、交通工具、植物等
- **活动**: 运动、聚会、会议、旅行等
- **情感**: 快乐、悲伤、兴奋、平静等

## 性能优化

### 图像处理优化
- 图像压缩减少内存占用
- 异步处理避免阻塞主线程
- 批量识别复用连接

### 模型加载优化
- 应用启动时预加载模型
- 模型文件缓存到本地
- 懒加载非关键模型

### 网络优化
- API 调用失败重试（最多 3 次）
- 使用模拟模式处理离线情况
- 请求超时控制（10秒）

## 模拟模式

当模型未加载或离线时，使用模拟模式返回示例标签：

```typescript
private async simulateRecognition(imageUri: string): Promise<ImageRecognitionResult> {
  return {
    labels: [
      { name: '日常生活', confidence: 0.85, category: '场景' },
      { name: '室内', confidence: 0.75, category: '环境' },
      { name: '记录', confidence: 0.65, category: '活动' },
    ],
    confidence: 0.75,
    processingTime: 50,
  };
}
```

## 测试与质量

### 测试策略

- **单元测试**: 图像预处理、结果后处理
- **集成测试**: 模型推理流程
- **性能测试**: 识别速度、内存占用
- **准确性测试**: 使用标注数据集验证

### 待测试项

- [ ] 图像识别准确性
- [ ] 批量识别性能
- [ ] 离线模拟模式
- [ ] API 调用重试机制
- [ ] 模型更新流程

## 常见问题 (FAQ)

### Q: 模型文件存储在哪里？
A: `${DocumentDirectoryPath}/models/image_recognition.tflite`

### Q: 如何更新模型？
A: 通过 ModelUpdater 服务下载新模型，应用重启后生效。

### Q: 识别一张图片需要多久？
A:
- 本地模型：50-200ms
- API 调用：500-2000ms（取决于网络）

### Q: 支持哪些图片格式？
A: JPG, PNG, WebP, BMP（推荐 JPG）

### Q: 识别失败如何处理？
A:
1. 尝试降低图片质量重试
2. 使用模拟模式返回默认标签
3. 记录错误日志供后续分析

### Q: 如何提高识别准确率？
A:
- 使用清晰的图片（避免模糊）
- 主体明确（避免复杂背景）
- 定期更新模型
- 收集用户反馈优化模型

## 相关文件清单

```
app/src/services/ai/
├── imageRecognition.ts        # 图像识别服务
├── modelUpdater.ts            # 模型更新管理
└── CLAUDE.md                  # 本文档
```

## 变更记录 (Changelog)

### 2026-01-06
- 初始化 AI 服务文档
- 文档化图像识别接口
- 添加百度 EasyDL API 配置说明
- 定义模拟模式规则
