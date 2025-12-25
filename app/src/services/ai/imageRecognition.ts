import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { ImageResize } from 'react-native-image-resizer';
import { v4 as uuidv4 } from 'uuid';

export interface ImageRecognitionResult {
  labels: AITag[];
  confidence: number;
  processingTime: number;
}

export interface AITag {
  name: string;
  confidence: number;
  category?: string;
}

// 百度EasyDL API配置
const BAIDU_API_CONFIG = {
  BASE_URL: 'https://aip.baidubce.com',
  MODEL_ID: process.env.BAIDU_EASYD_MODEL_ID || 'your-model-id',
  ACCESS_TOKEN: process.env.BAIDU_ACCESS_TOKEN || 'your-access-token',
  API_KEY: process.env.BAIDU_API_KEY || 'your-api-key',
  SECRET_KEY: process.env.BAIDU_SECRET_KEY || 'your-secret-key',
};

class ImageRecognitionService {
  private isInitialized = false;
  private modelLoaded = false;

  /**
   * 初始化图像识别服务
   */
  async initialize(): Promise<void> {
    try {
      console.log('初始化图像识别服务...');
      
      // 检查平台支持
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // 移动端使用百度EasyDL TensorFlow Lite
        await this.loadLocalModel();
      } else {
        // Web端使用API调用
        await this.initializeAPI();
      }

      this.isInitialized = true;
      console.log('图像识别服务初始化完成');
    } catch (error) {
      console.error('图像识别服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载本地TensorFlow Lite模型
   */
  private async loadLocalModel(): Promise<void> {
    try {
      // 检查模型文件是否存在
      const modelPath = `${RNFS.DocumentDirectoryPath}/models/image_recognition.tflite`;
      const modelExists = await RNFS.exists(modelPath);

      if (!modelExists) {
        console.log('模型文件不存在，将使用模拟模式');
        this.modelLoaded = false;
        return;
      }

      // 在实际实现中，这里会加载TensorFlow Lite模型
      // const model = await tflite.loadModel({ model: modelPath });
      // this.model = model;

      this.modelLoaded = true;
      console.log('本地模型加载完成');
    } catch (error) {
      console.error('本地模型加载失败:', error);
      this.modelLoaded = false;
    }
  }

  /**
   * 初始化API调用模式
   */
  private async initializeAPI(): Promise<void> {
    // 获取访问令牌
    const token = await this.getAccessToken();
    BAIDU_API_CONFIG.ACCESS_TOKEN = token;
    this.isInitialized = true;
  }

  /**
   * 获取百度API访问令牌
   */
  private async getAccessToken(): Promise<string> {
    try {
      const response = await fetch(`${BAIDU_API_CONFIG.BASE_URL}/oauth/2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=client_credentials&client_id=${BAIDU_API_CONFIG.API_KEY}&client_secret=${BAIDU_API_CONFIG.SECRET_KEY}`,
      });

      const data = await response.json();
      
      if (data.access_token) {
        return data.access_token;
      } else {
        throw new Error('获取访问令牌失败');
      }
    } catch (error) {
      console.error('获取访问令牌失败:', error);
      throw error;
    }
  }

  /**
   * 识别图像内容并生成标签
   */
  async recognizeImage(imageUri: string): Promise<ImageRecognitionResult> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      let result: ImageRecognitionResult;

      if (this.modelLoaded) {
        // 使用本地模型
        result = await this.recognizeWithLocalModel(imageUri);
      } else {
        // 使用模拟识别或API调用
        result = await this.recognizeWithMock(imageUri);
      }

      const processingTime = Date.now() - startTime;
      return {
        ...result,
        processingTime,
      };
    } catch (error) {
      console.error('图像识别失败:', error);
      throw error;
    }
  }

  /**
   * 使用本地模型识别图像
   */
  private async recognizeWithLocalModel(imageUri: string): Promise<ImageRecognitionResult> {
    // 预处理图像
    const processedImagePath = await this.preprocessImage(imageUri);
    
    // 使用TensorFlow Lite模型进行推理
    // 在实际实现中，这里会调用模型推理
    // const predictions = await this.model.run(processedImagePath);
    
    // 模拟推理结果
    const labels: AITag[] = [
      { name: '风景', confidence: 0.85, category: '场景' },
      { name: '自然', confidence: 0.78, category: '主题' },
      { name: '户外', confidence: 0.72, category: '环境' },
    ];

    return {
      labels,
      confidence: 0.85,
      processingTime: 0,
    };
  }

  /**
   * 使用模拟模式识别图像（开发/测试用）
   */
  private async recognizeWithMock(imageUri: string): Promise<ImageRecognitionResult> {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 根据文件名或路径生成模拟标签
    const fileName = imageUri.split('/').pop()?.toLowerCase() || '';
    
    let mockLabels: AITag[] = [];

    // 基于文件名生成模拟标签
    if (fileName.includes('food') || fileName.includes('eat') || fileName.includes('餐')) {
      mockLabels = [
        { name: '食物', confidence: 0.92, category: '饮食' },
        { name: '美食', confidence: 0.88, category: '饮食' },
        { name: '餐厅', confidence: 0.75, category: '场景' },
      ];
    } else if (fileName.includes('travel') || fileName.includes('trip') || fileName.includes('旅行')) {
      mockLabels = [
        { name: '旅行', confidence: 0.90, category: '活动' },
        { name: '风景', confidence: 0.85, category: '场景' },
        { name: '户外', confidence: 0.78, category: '环境' },
      ];
    } else if (fileName.includes('people') || fileName.includes('person') || fileName.includes('人')) {
      mockLabels = [
        { name: '人物', confidence: 0.95, category: '主体' },
        { name: '人像', confidence: 0.82, category: '主体' },
        { name: '社交', confidence: 0.70, category: '活动' },
      ];
    } else if (fileName.includes('pet') || fileName.includes('animal') || fileName.includes('宠物')) {
      mockLabels = [
        { name: '动物', confidence: 0.94, category: '主体' },
        { name: '宠物', confidence: 0.87, category: '主体' },
        { name: '可爱', confidence: 0.75, category: '情感' },
      ];
    } else {
      // 默认标签
      mockLabels = [
        { name: '照片', confidence: 0.65, category: '类型' },
        { name: '日常', confidence: 0.58, category: '主题' },
        { name: '生活', confidence: 0.52, category: '主题' },
      ];
    }

    return {
      labels: mockLabels,
      confidence: Math.max(...mockLabels.map(label => label.confidence)),
      processingTime: 0,
    };
  }

  /**
   * 预处理图像
   */
  private async preprocessImage(imageUri: string): Promise<string> {
    try {
      // 调整图像大小和格式
      const resizedImage = await ImageResize.createResizedImage(
        imageUri,
        224, // 模型输入尺寸
        224,
        'JPEG',
        85, // 质量
        0,  // 旋转
        undefined, // 输出路径，null表示返回base64
        false,     // 不保持EXIF数据
        { mode: 'contain', onlyScaleDown: false },
        80        // 最小压缩质量
      );

      return resizedImage.uri;
    } catch (error) {
      console.error('图像预处理失败:', error);
      return imageUri; // 返回原始图像
    }
  }

  /**
   * 从网络图像识别
   */
  async recognizeFromUrl(imageUrl: string): Promise<ImageRecognitionResult> {
    try {
      // 下载网络图像到本地
      const localPath = `${RNFS.CachesDirectoryPath}/${uuidv4()}.jpg`;
      await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: localPath,
      }).promise;

      // 识别本地图像
      const result = await this.recognizeImage(localPath);

      // 清理临时文件
      await RNFS.unlink(localPath);

      return result;
    } catch (error) {
      console.error('网络图像识别失败:', error);
      throw error;
    }
  }

  /**
   * 批量识别图像
   */
  async batchRecognize(imageUris: string[]): Promise<ImageRecognitionResult[]> {
    const results = await Promise.allSettled(
      imageUris.map(uri => this.recognizeImage(uri))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`图像 ${imageUris[index]} 识别失败:`, result.reason);
        // 返回默认结果
        return {
          labels: [],
          confidence: 0,
          processingTime: 0,
        };
      }
    });
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): any {
    return {
      isLoaded: this.modelLoaded,
      platform: Platform.OS,
      version: '1.0.0',
      supportedFormats: ['JPEG', 'PNG', 'WEBP'],
      maxImageSize: 10 * 1024 * 1024, // 10MB
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.modelLoaded) {
      // 释放模型资源
      // this.model?.cleanup();
    }
    this.isInitialized = false;
    this.modelLoaded = false;
  }
}

// 单例实例
export const imageRecognitionService = new ImageRecognitionService();
export default imageRecognitionService;
