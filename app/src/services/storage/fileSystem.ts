import RNFS from 'react-native-fs';
import {Platform} from 'react-native';

/**
 * 文件系统服务
 * 管理照片、语音、缩略图等媒体文件
 */
class FileSystemService {
  // 基础目录
  private readonly BASE_DIR =
    Platform.OS === 'ios' ? RNFS.DocumentDirectoryPath : RNFS.ExternalDirectoryPath;

  // 子目录
  private readonly PHOTOS_DIR = `${this.BASE_DIR}/photos`;
  private readonly THUMBNAILS_DIR = `${this.BASE_DIR}/thumbnails`;
  private readonly VOICE_DIR = `${this.BASE_DIR}/voice`;
  private readonly TEMP_DIR = `${this.BASE_DIR}/temp`;

  async init(): Promise<void> {
    try {
      // 创建所有必要的目录
      await this.ensureDirectoryExists(this.PHOTOS_DIR);
      await this.ensureDirectoryExists(this.THUMBNAILS_DIR);
      await this.ensureDirectoryExists(this.VOICE_DIR);
      await this.ensureDirectoryExists(this.TEMP_DIR);

      console.log('File system initialized successfully');
      console.log('Base directory:', this.BASE_DIR);
    } catch (error) {
      console.error('Failed to initialize file system:', error);
      throw error;
    }
  }

  /**
   * 确保目录存在，不存在则创建
   */
  private async ensureDirectoryExists(path: string): Promise<void> {
    const exists = await RNFS.exists(path);
    if (!exists) {
      await RNFS.mkdir(path);
      console.log(`Created directory: ${path}`);
    }
  }

  /**
   * 保存照片文件
   */
  async savePhoto(sourcePath: string, filename?: string): Promise<string> {
    try {
      const fileName = filename || `photo_${Date.now()}.jpg`;
      const destPath = `${this.PHOTOS_DIR}/${fileName}`;

      await RNFS.copyFile(sourcePath, destPath);
      console.log(`Photo saved: ${destPath}`);

      return destPath;
    } catch (error) {
      console.error('Failed to save photo:', error);
      throw error;
    }
  }

  /**
   * 保存缩略图
   */
  async saveThumbnail(sourcePath: string, filename?: string): Promise<string> {
    try {
      const fileName = filename || `thumb_${Date.now()}.jpg`;
      const destPath = `${this.THUMBNAILS_DIR}/${fileName}`;

      await RNFS.copyFile(sourcePath, destPath);
      console.log(`Thumbnail saved: ${destPath}`);

      return destPath;
    } catch (error) {
      console.error('Failed to save thumbnail:', error);
      throw error;
    }
  }

  /**
   * 保存语音文件
   */
  async saveVoice(sourcePath: string, filename?: string): Promise<string> {
    try {
      const fileName = filename || `voice_${Date.now()}.m4a`;
      const destPath = `${this.VOICE_DIR}/${fileName}`;

      await RNFS.copyFile(sourcePath, destPath);
      console.log(`Voice file saved: ${destPath}`);

      return destPath;
    } catch (error) {
      console.error('Failed to save voice file:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
        console.log(`File deleted: ${filePath}`);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * 获取文件大小（字节）
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stat = await RNFS.stat(filePath);
      return parseInt(stat.size, 10);
    } catch (error) {
      console.error('Failed to get file size:', error);
      return 0;
    }
  }

  /**
   * 获取目录大小（字节）
   */
  async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const files = await RNFS.readDir(dirPath);
      let totalSize = 0;

      for (const file of files) {
        if (file.isFile()) {
          totalSize += parseInt(file.size, 10);
        } else if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(file.path);
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to get directory size:', error);
      return 0;
    }
  }

  /**
   * 获取所有媒体文件的总大小
   */
  async getTotalMediaSize(): Promise<{
    photos: number;
    thumbnails: number;
    voice: number;
    total: number;
  }> {
    const photosSize = await this.getDirectorySize(this.PHOTOS_DIR);
    const thumbnailsSize = await this.getDirectorySize(this.THUMBNAILS_DIR);
    const voiceSize = await this.getDirectorySize(this.VOICE_DIR);

    return {
      photos: photosSize,
      thumbnails: thumbnailsSize,
      voice: voiceSize,
      total: photosSize + thumbnailsSize + voiceSize,
    };
  }

  /**
   * 清理临时文件
   */
  async cleanTempFiles(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.TEMP_DIR);
      if (exists) {
        await RNFS.unlink(this.TEMP_DIR);
        await RNFS.mkdir(this.TEMP_DIR);
        console.log('Temp files cleaned');
      }
    } catch (error) {
      console.error('Failed to clean temp files:', error);
    }
  }

  /**
   * 清理所有媒体文件（用于重置应用）
   */
  async clearAllMedia(): Promise<void> {
    try {
      await RNFS.unlink(this.PHOTOS_DIR);
      await RNFS.unlink(this.THUMBNAILS_DIR);
      await RNFS.unlink(this.VOICE_DIR);

      await this.init();
      console.log('All media files cleared');
    } catch (error) {
      console.error('Failed to clear media files:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await RNFS.exists(filePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath: string, encoding: 'utf8' | 'base64' = 'base64'): Promise<string> {
    try {
      const content = await RNFS.readFile(filePath, encoding);
      console.log(`File read: ${filePath}`);
      return content;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  /**
   * 获取目录路径
   */
  getDirectories() {
    return {
      base: this.BASE_DIR,
      photos: this.PHOTOS_DIR,
      thumbnails: this.THUMBNAILS_DIR,
      voice: this.VOICE_DIR,
      temp: this.TEMP_DIR,
    };
  }
}

export const fileSystemService = new FileSystemService();
