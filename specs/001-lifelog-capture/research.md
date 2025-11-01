# Research Notes – LifeLog 多模态记录

## 决策 1：语音转写服务（ASR）
- **Decision**: 使用腾讯云实时语音转写 SDK，离线时录音缓存，恢复联网后批量上传转写。
- **Rationale**: 提供中文口语优化模型、React Native 现成示例，按量计费灵活；支持断点续传与签名鉴权，便于实现待同步队列。
- **Alternatives considered**:
  - 讯飞语音 API：口音覆盖广，但移动端需额外安全加固且离线授权成本高。
  - Google Speech-to-Text：识别准确，但跨境网络与隐私要求冲突。

## 决策 2：照片标签识别
- **Decision**: 采用本地部署的百度 EasyDL TensorFlow Lite 模型（在设备端运行）生成标签建议。
- **Rationale**: 满足宪章“本地优先”隐私要求，无需上传图片；可由百度云训练后导出 TFLite 模型，部署体积可压缩 ~25MB。
- **Alternatives considered**:
  - 百度云在线识别 API：实现快但需上传图片，不符合隐私策略。
  - 自研 MobileNet 微调：灵活但训练成本与数据标注压力较高。

## 决策 3：本地存储方案
- **Decision**: SQLite + FTS5 扩展存储 LifeLogEntry 元数据，媒体文件存应用私有目录；使用 react-native-sqlite-storage。
- **Rationale**: 支持事务、索引和全文搜索，可处理 ≥10k 条记录；跨平台稳定，社区维护积极。
- **Alternatives considered**:
  - Realm：数据同步方便但体积大且 License 限制。
  - WatermelonDB：对 React Native 友好，但 FTS 支持弱，需要额外桥接。

## 决策 4：离线同步策略
- **Decision**: 采用“待同步”队列 + 网络监听策略，本地保存完整内容；联网后批量执行上传任务（未来后端上线时启用）。
- **Rationale**: 满足宪章离线优先要求，避免数据丢失；实现简单，可扩展为双向同步。
- **Alternatives considered**:
  - 实时上传：离线场景不可用。
  - 队列 + 手动同步：增加用户负担，违背快速体验目标。

## 决策 5：性能优化策略
- **Decision**: FlashList（Expo）、缩略图预生成、分页查询 + 虚拟滚动、Hermes 引擎 Profiling 基准。
- **Rationale**: FlashList 针对大列表优化；缩略图减轻解码压力；Hermes 支持性能标记，可对 <2 秒目标进行自动验证。
- **Alternatives considered**:
  - RecyclerListView：性能佳但维护少；FlashList 提供更好 DX。
  - 使用原生模块自研：开发成本高，初版不必。

## 决策 6：安全与加密
- **Decision**: AES-256-GCM 加密媒体文件与敏感字段；iOS Keychain/Android Keystore 存储主密钥，使用 react-native-keychain。
- **Rationale**: 满足宪章隐私原则；GCM 提供完整性验证，Keychain/Keystore 原生支持。
- **Alternatives considered**:
  - 自管密钥：安全风险高。
  - 第三方加密 SDK：增加体积与依赖复杂度。

## 决策 7：UI 组件与主题
- **Decision**: React Native Paper + 自定义主题层，配合 Redux 持久化用户外观设置。
- **Rationale**: Paper 内置暗色主题与无障碍支持，组件丰富；易于覆盖 WCAG 对比度要求。
- **Alternatives considered**:
  - NativeBase：跨平台但暗色适配需要更多自定义。
  - 自研组件库：初期工作量大，影响进度。

## 决策 8：未来云同步接口
- **Decision**: 规划 RESTful OpenAPI（entries、media、search、backup）作为云端同步基线，当前占位。
- **Rationale**: 早期定义接口可指导数据模型与同步策略，后续实现时减少返工。
- **Alternatives considered**:
  - GraphQL：灵活但移动端缓存策略复杂。
  - gRPC：高效但对 Web/跨平台支持较差。
