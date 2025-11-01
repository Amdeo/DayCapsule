import RNFS from 'react-native-fs';
import {encryptionService} from '@services/storage/encryption';
import {logger} from '@services/telemetry/logger';

export interface AudioInfo {
  path: string;
  size: number;
  duration: number;
  createdAt: number;
  isEncrypted: boolean;
}

class AudioStorage {
  private audioDir = `${RNFS.DocumentDirectoryPath}/audio`;
  private encryptedAudioDir = `${RNFS.DocumentDirectoryPath}/audio_encrypted`;

  async initialize(): Promise<void> {
    try {
      // 创建音频目录
      await RNFS.mkdir(this.audioDir, {NSURLIsExcludedFromBackupKey: true});
      await RNFS.mkdir(this.encryptedAudioDir, {NSURLIsExcludedFromBackupKey: true});
      logger.info('Audio storage initialized');
    } catch (error) {
      logger.error('Failed to initialize audio storage', {error});
    }
  }

  async saveAudio(sourcePath: string, encrypt: boolean = true): Promise<string | null> {
    try {
      // 验证源文件存在
      const exists = await RNFS.exists(sourcePath);
      if (!exists) {
        logger.error('Source audio file not found', {sourcePath});
        return null;
      }

      const timestamp = Date.now();
      const fileName = `audio_${timestamp}.m4a`;
      const targetDir = encrypt ? this.encryptedAudioDir : this.audioDir;
      const targetPath = `${targetDir}/${fileName}`;

      if (encrypt) {
        // 读取文件内容
        const fileContent = await RNFS.readFile(sourcePath, 'base64');

        // 加密内容
        const encryptedContent = await encryptionService.encrypt(fileContent);

        // 写入加密文件
        await RNFS.writeFile(targetPath, encryptedContent, 'base64');
      } else {
        // 直接复制文件
        await RNFS.copyFile(sourcePath, targetPath);
      }

      logger.info('Audio saved successfully', {
        sourcePath,
        targetPath,
        encrypted: encrypt,
      });

      return targetPath;
    } catch (error) {
      logger.error('Failed to save audio', {sourcePath, error});
      return null;
    }
  }

  async getAudio(audioPath: string, decrypt: boolean = true): Promise<string | null> {
    try {
      const exists = await RNFS.exists(audioPath);
      if (!exists) {
        logger.error('Audio file not found', {audioPath});
        return null;
      }

      if (decrypt && audioPath.includes('audio_encrypted')) {
        // 读取加密文件
        const encryptedContent = await RNFS.readFile(audioPath, 'base64');

        // 解密内容
        const decryptedContent = await encryptionService.decrypt(encryptedContent);

        // 写入临时文件
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_audio_${Date.now()}.m4a`;
        await RNFS.writeFile(tempPath, decryptedContent, 'base64');

        return tempPath;
      }

      return audioPath;
    } catch (error) {
      logger.error('Failed to get audio', {audioPath, error});
      return null;
    }
  }

  async getAudioInfo(audioPath: string): Promise<AudioInfo | null> {
    try {
      const stat = await RNFS.stat(audioPath);
      const isEncrypted = audioPath.includes('audio_encrypted');

      // 获取音频时长（需要原生模块支持）
      const duration = await this.getAudioDuration(audioPath);

      return {
        path: audioPath,
        size: stat.size,
        duration,
        createdAt: stat.mtime,
        isEncrypted,
      };
    } catch (error) {
      logger.error('Failed to get audio info', {audioPath, error});
      return null;
    }
  }

  async deleteAudio(audioPath: string): Promise<boolean> {
    try {
      const exists = await RNFS.exists(audioPath);
      if (!exists) {
        logger.warn('Audio file not found for deletion', {audioPath});
        return false;
      }

      await RNFS.unlink(audioPath);
      logger.info('Audio deleted successfully', {audioPath});
      return true;
    } catch (error) {
      logger.error('Failed to delete audio', {audioPath, error});
      return false;
    }
  }

  async listAudios(encrypted: boolean = true): Promise<AudioInfo[]> {
    try {
      const dir = encrypted ? this.encryptedAudioDir : this.audioDir;
      const files = await RNFS.readDir(dir);

      const audioInfos: AudioInfo[] = [];
      for (const file of files) {
        if (file.name.endsWith('.m4a')) {
          const duration = await this.getAudioDuration(file.path);
          audioInfos.push({
            path: file.path,
            size: file.size,
            duration,
            createdAt: file.mtime,
            isEncrypted: encrypted,
          });
        }
      }

      return audioInfos;
    } catch (error) {
      logger.error('Failed to list audios', {error});
      return [];
    }
  }

  async isAudioEncrypted(audioPath: string): Promise<boolean> {
    return audioPath.includes('audio_encrypted');
  }

  async clearTestAudio(): Promise<void> {
    try {
      // 清理测试音频文件
      const files = await RNFS.readDir(this.audioDir);
      for (const file of files) {
        if (file.name.startsWith('recording_') || file.name.startsWith('audio_')) {
          await RNFS.unlink(file.path);
        }
      }

      const encryptedFiles = await RNFS.readDir(this.encryptedAudioDir);
      for (const file of encryptedFiles) {
        if (file.name.startsWith('recording_') || file.name.startsWith('audio_')) {
          await RNFS.unlink(file.path);
        }
      }

      logger.info('Test audio files cleared');
    } catch (error) {
      logger.error('Failed to clear test audio', {error});
    }
  }

  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      // 这需要原生模块支持
      // 暂时返回 0，实际实现中应该调用原生方法
      return 0;
    } catch (error) {
      logger.error('Failed to get audio duration', {audioPath, error});
      return 0;
    }
  }
}

export const audioStorage = new AudioStorage();

