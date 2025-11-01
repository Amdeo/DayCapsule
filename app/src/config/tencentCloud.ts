/**
 * 腾讯云配置
 *
 * 注意：在生产环境中，应该使用环境变量或安全的密钥管理系统
 * 不要在代码中硬编码 API 密钥
 */

import type {TencentCloudConfig} from '@services/speechToText';

// 从环境变量读取配置
const getTencentCloudConfig = (): TencentCloudConfig => {
  const secretId = process.env.TENCENT_CLOUD_SECRET_ID || '';
  const secretKey = process.env.TENCENT_CLOUD_SECRET_KEY || '';
  const region = process.env.TENCENT_CLOUD_REGION || 'ap-beijing';
  const projectId = process.env.TENCENT_CLOUD_PROJECT_ID || '';

  return {
    secretId,
    secretKey,
    region,
    projectId,
  };
};

export const tencentCloudConfig = getTencentCloudConfig();

/**
 * 验证配置是否完整
 */
export const isConfigValid = (): boolean => {
  return !!(
    tencentCloudConfig.secretId &&
    tencentCloudConfig.secretKey &&
    tencentCloudConfig.region &&
    tencentCloudConfig.projectId
  );
};

/**
 * 获取配置状态信息
 */
export const getConfigStatus = (): {
  isValid: boolean;
  missingFields: string[];
} => {
  const missingFields: string[] = [];

  if (!tencentCloudConfig.secretId) {
    missingFields.push('secretId');
  }
  if (!tencentCloudConfig.secretKey) {
    missingFields.push('secretKey');
  }
  if (!tencentCloudConfig.region) {
    missingFields.push('region');
  }
  if (!tencentCloudConfig.projectId) {
    missingFields.push('projectId');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};
