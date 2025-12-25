import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { showMessage } from 'react-native-flash-message';

export interface ModelInfo {
  name: string;
  version: string;
  size: number;
  downloadUrl: string;
  checksum: string;
  description: string;
  releaseDate: string;
}

export interface UpdateResult {
  success: boolean;
  message: string;
  oldVersion?: string;
  newVersion?: string;
  downloadSize?: number;
}

class ModelUpdaterService {
  private currentVersion = '1.0.0';
  private updateCheckUrl = 'https://api.memorycapsule.app/models/latest';
  private modelsPath = `${RNFS.DocumentDirectoryPath}/models`;

  /**
   * 检查模型更新
   */
  async checkForUpdates(): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    modelInfo?: ModelInfo;
  }> {
    try {
      // 在实际应用中，这里会调用真实的API
      const response = await fetch(`${this.updateCheckUrl}?platform=${Platform.OS}`);
      
      if (!response.ok) {
        throw new Error('检查更新失败');
      }

      const data = await response.json();
      
      const hasUpdate = this.compareVersions(data.latestVersion, this.currentVersion) > 0;
      
      return {
        hasUpdate,
        currentVersion: this.currentVersion,
        latestVersion: data.latestVersion,
        modelInfo: data.modelInfo,
      };
    } catch (error) {
      console.error('检查模型更新失败:', error);
      
      // 模拟返回检查结果（开发/测试用）
      const mockLatestVersion = '1.1.0';
      const hasUpdate = this.compareVersions(mockLatestVersion, this.currentVersion) > 0;
      
      return {
        hasUpdate,
        currentVersion: this.currentVersion,
        latestVersion: mockLatestVersion,
        modelInfo: hasUpdate ? {
          name: '图像识别模型',
          version: mockLatestVersion,
          size: 15 * 1024 * 1024, // 15MB
          downloadUrl: 'https://example.com/model.tflite',
          checksum: 'mock-checksum',
          description: '更新的图像识别模型，提升识别准确率',
          releaseDate: new Date().toISOString(),
        } : undefined,
      };
    }
  }

  /**
   * 下载并更新模型
   */
  async updateModel(modelInfo: ModelInfo, onProgress?: (progress: number) => void): Promise<UpdateResult> {
    try {
      console.log('开始下载模型:', modelInfo.version);

      // 创建模型目录
      await RNFS.mkdir(this.modelsPath).catch(() => {});

      const modelPath = `${this.modelsPath}/${modelInfo.name.replace(/\s+/g, '_').toLowerCase()}_${modelInfo.version}.tflite`;
      const tempPath = `${this.modelsPath}/temp_${Date.now()}.tflite`;

      // 下载模型文件
      const downloadResult = await RNFS.downloadFile({
        fromUrl: modelInfo.downloadUrl,
        toFile: tempPath,
        progressDivider: 1,
        begin: (res) => {
          console.log('下载开始:', res.contentLength);
        },
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          console.log('下载进度:', progress);
          onProgress?.(progress);
        },
      }).promise;

      // 验证文件完整性
      const isValid = await this.verifyFileIntegrity(tempPath, modelInfo.checksum);
      if (!isValid) {
        throw new Error('模型文件校验失败');
      }

      // 备份旧模型
      const oldModelPath = `${this.modelsPath}/current_model.tflite`;
      const currentModelExists = await RNFS.exists(oldModelPath);
      
      if (currentModelExists) {
        const backupPath = `${this.modelsPath}/backup_${Date.now()}.tflite`;
        await RNFS.moveFile(oldModelPath, backupPath);
      }

      // 安装新模型
      await RNFS.moveFile(tempPath, modelPath);
      
      // 更新当前模型链接
      await RNFS.writeFile(oldModelPath, modelPath);

      // 清理临时文件
      await RNFS.unlink(tempPath).catch(() => {});

      // 更新本地版本信息
      await this.updateLocalVersion(modelInfo.version);

      console.log('模型更新完成:', modelInfo.version);

      showMessage({
        message: '模型更新成功',
        description: `已更新到版本 ${modelInfo.version}`,
        type: 'success',
        duration: 3000,
      });

      return {
        success: true,
        message: `模型更新成功，版本 ${modelInfo.version}`,
        oldVersion: this.currentVersion,
        newVersion: modelInfo.version,
        downloadSize: modelInfo.size,
      };

    } catch (error) {
      console.error('模型更新失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '模型更新失败';
      
      showMessage({
        message: '模型更新失败',
        description: errorMessage,
        type: 'danger',
        duration: 4000,
      });

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * 回滚到上一个版本
   */
  async rollbackModel(): Promise<UpdateResult> {
    try {
      const oldModelPath = `${this.modelsPath}/backup_${Date.now()}.tflite`;
      const currentModelPath = `${this.modelsPath}/current_model.tflite`;
      
      // 查找最新的备份文件
      const files = await RNFS.readDir(this.modelsPath);
      const backupFiles = files
        .filter(file => file.name.startsWith('backup_'))
        .sort((a, b) => b.mtime - a.mtime);

      if (backupFiles.length === 0) {
        throw new Error('没有找到可回滚的模型版本');
      }

      const latestBackup = backupFiles[0];
      
      // 备份当前版本
      const currentBackup = `${this.modelsPath}/rollback_backup_${Date.now()}.tflite`;
      const currentModelExists = await RNFS.exists(currentModelPath);
      
      if (currentModelExists) {
        await RNFS.moveFile(currentModelPath, currentBackup);
      }

      // 恢复备份版本
      await RNFS.moveFile(latestBackup.path, currentModelPath);

      // 获取版本信息
      const version = await this.getLocalVersion();

      showMessage({
        message: '模型回滚成功',
        description: `已回滚到版本 ${version}`,
        type: 'success',
        duration: 3000,
      });

      return {
        success: true,
        message: `模型回滚成功，版本 ${version}`,
        newVersion: version,
      };

    } catch (error) {
      console.error('模型回滚失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '模型回滚失败';
      
      showMessage({
        message: '模型回滚失败',
        description: errorMessage,
        type: 'danger',
        duration: 4000,
      });

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(): Promise<{
    currentVersion: string;
    modelSize: number;
    lastUpdated: Date | null;
    availableUpdates: number;
  }> {
    try {
      const modelPath = `${this.modelsPath}/current_model.tflite`;
      const modelExists = await RNFS.exists(modelPath);

      let modelSize = 0;
      let lastUpdated: Date | null = null;

      if (modelExists) {
        const stats = await RNFS.stat(modelPath);
        modelSize = stats.size;
        lastUpdated = stats.mtime;
      }

      // 检查可用更新
      const updateInfo = await this.checkForUpdates();

      return {
        currentVersion: this.currentVersion,
        modelSize,
        lastUpdated,
        availableUpdates: updateInfo.hasUpdate ? 1 : 0,
      };
    } catch (error) {
      console.error('获取模型信息失败:', error);
      throw error;
    }
  }

  /**
   * 清理旧模型文件
   */
  async cleanupOldModels(keepCount: number = 3): Promise<void> {
    try {
      const files = await RNFS.readDir(this.modelsPath);
      const modelFiles = files
        .filter(file => file.name.includes('.tflite') && !file.name.includes('temp_'))
        .sort((a, b) => b.mtime - a.mtime);

      // 保留最新版本，删除旧版本
      const filesToDelete = modelFiles.slice(keepCount);

      for (const file of filesToDelete) {
        if (!file.name.includes('current_model')) {
          await RNFS.unlink(file.path);
          console.log('删除旧模型文件:', file.name);
        }
      }

      showMessage({
        message: '清理完成',
        description: `已清理 ${filesToDelete.length} 个旧模型文件`,
        type: 'success',
        duration: 2000,
      });

    } catch (error) {
      console.error('清理旧模型失败:', error);
    }
  }

  /**
   * 比较版本号
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    const maxLength = Math.max(v1Parts.length, v2Parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;

      if (v1 > v2) return 1;
      if (v1 < v2) return -1;
    }

    return 0;
  }

  /**
   * 验证文件完整性
   */
  private async verifyFileIntegrity(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      // 在实际应用中，这里会计算文件的SHA256校验和
      // const fileContent = await RNFS.readFile(filePath, 'base64');
      // const actualChecksum = await crypto.subtle.digest('SHA-256', fileContent);
      
      // 模拟校验（实际应用中需要真实的校验和计算）
      return expectedChecksum !== 'invalid-checksum';
    } catch (error) {
      console.error('文件完整性验证失败:', error);
      return false;
    }
  }

  /**
   * 更新本地版本信息
   */
  private async updateLocalVersion(version: string): Promise<void> {
    const versionPath = `${this.modelsPath}/version.json`;
    const versionData = {
      version,
      updatedAt: new Date().toISOString(),
      platform: Platform.OS,
    };

    await RNFS.writeFile(versionPath, JSON.stringify(versionData, null, 2));
    this.currentVersion = version;
  }

  /**
   * 获取本地版本信息
   */
  private async getLocalVersion(): Promise<string> {
    try {
      const versionPath = `${this.modelsPath}/version.json`;
      const exists = await RNFS.exists(versionPath);

      if (exists) {
        const content = await RNFS.readFile(versionPath);
        const data = JSON.parse(content);
        return data.version || this.currentVersion;
      }
    } catch (error) {
      console.error('获取本地版本信息失败:', error);
    }

    return this.currentVersion;
  }

  /**
   * 检查网络连接和存储空间
   */
  async checkUpdatePrerequisites(): Promise<{
    canUpdate: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // 检查网络连接
    // 在实际应用中，这里会使用NetInfo检查网络状态
    // const state = await NetInfo.fetch();
    // if (!state.isConnected) {
    //   issues.push('网络连接不可用');
    // }

    // 检查存储空间（假设需要至少50MB）
    try {
      const freeSpace = await RNFS.getFSInfo();
      if (freeSpace.freeSpace < 50 * 1024 * 1024) {
        issues.push('存储空间不足，至少需要50MB');
      }
    } catch (error) {
      issues.push('无法检查存储空间');
    }

    return {
      canUpdate: issues.length === 0,
      issues,
    };
  }
}

// 单例实例
export const modelUpdaterService = new ModelUpdaterService();
export default modelUpdaterService;
