import {Platform} from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import type {Permission, PermissionStatus} from 'react-native-permissions';

export type PermissionType = 'camera' | 'microphone' | 'location' | 'photos';

/**
 * 权限管理服务
 * 统一管理应用所需的各种权限
 */
class PermissionsService {
  /**
   * 获取权限对应的系统权限常量
   */
  private getPermission(type: PermissionType): Permission {
    const permissions = {
      camera: Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA,
      microphone:
        Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO,
      location:
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      photos:
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.PHOTO_LIBRARY
          : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
    };

    return permissions[type];
  }

  /**
   * 检查权限状态
   */
  async checkPermission(type: PermissionType): Promise<PermissionStatus> {
    try {
      const permission = this.getPermission(type);
      const result = await check(permission);
      console.log(`Permission ${type} status:`, result);
      return result;
    } catch (error) {
      console.error(`Failed to check ${type} permission:`, error);
      return RESULTS.UNAVAILABLE;
    }
  }

  /**
   * 请求权限
   */
  async requestPermission(type: PermissionType): Promise<PermissionStatus> {
    try {
      const permission = this.getPermission(type);
      const result = await request(permission);
      console.log(`Permission ${type} request result:`, result);
      return result;
    } catch (error) {
      console.error(`Failed to request ${type} permission:`, error);
      return RESULTS.UNAVAILABLE;
    }
  }

  /**
   * 检查权限是否已授予
   */
  async isPermissionGranted(type: PermissionType): Promise<boolean> {
    const status = await this.checkPermission(type);
    return status === RESULTS.GRANTED;
  }

  /**
   * 确保权限已授予，如果未授予则请求
   */
  async ensurePermission(type: PermissionType): Promise<boolean> {
    let status = await this.checkPermission(type);

    if (status === RESULTS.DENIED) {
      status = await this.requestPermission(type);
    }

    return status === RESULTS.GRANTED;
  }

  /**
   * 批量检查权限
   */
  async checkMultiplePermissions(
    types: PermissionType[],
  ): Promise<Record<PermissionType, PermissionStatus>> {
    const results: Record<string, PermissionStatus> = {};

    for (const type of types) {
      results[type] = await this.checkPermission(type);
    }

    return results as Record<PermissionType, PermissionStatus>;
  }

  /**
   * 批量请求权限
   */
  async requestMultiplePermissions(
    types: PermissionType[],
  ): Promise<Record<PermissionType, PermissionStatus>> {
    const results: Record<string, PermissionStatus> = {};

    for (const type of types) {
      results[type] = await this.requestPermission(type);
    }

    return results as Record<PermissionType, PermissionStatus>;
  }

  /**
   * 获取权限状态的友好描述
   */
  getPermissionStatusDescription(status: PermissionStatus): string {
    const descriptions: Record<string, string> = {
      [RESULTS.UNAVAILABLE]: '此设备不支持该功能',
      [RESULTS.DENIED]: '权限被拒绝',
      [RESULTS.LIMITED]: '权限受限',
      [RESULTS.GRANTED]: '权限已授予',
      [RESULTS.BLOCKED]: '权限被永久拒绝，请在设置中开启',
    };

    return descriptions[status] || '未知状态';
  }

  /**
   * 检查是否需要显示权限说明
   */
  shouldShowPermissionRationale(status: PermissionStatus): boolean {
    return status === RESULTS.DENIED;
  }

  /**
   * 检查权限是否被永久拒绝
   */
  isPermissionBlocked(status: PermissionStatus): boolean {
    return status === RESULTS.BLOCKED;
  }

  /**
   * 获取所有核心权限的状态
   */
  async getAllPermissionsStatus(): Promise<{
    camera: PermissionStatus;
    microphone: PermissionStatus;
    location: PermissionStatus;
    photos: PermissionStatus;
  }> {
    const [camera, microphone, location, photos] = await Promise.all([
      this.checkPermission('camera'),
      this.checkPermission('microphone'),
      this.checkPermission('location'),
      this.checkPermission('photos'),
    ]);

    return {camera, microphone, location, photos};
  }

  /**
   * 检查是否所有核心权限都已授予
   */
  async areAllCorePermissionsGranted(): Promise<boolean> {
    const statuses = await this.getAllPermissionsStatus();
    return Object.values(statuses).every(status => status === RESULTS.GRANTED);
  }

  /**
   * 获取缺失的权限列表
   */
  async getMissingPermissions(): Promise<PermissionType[]> {
    const statuses = await this.getAllPermissionsStatus();
    const missing: PermissionType[] = [];

    (Object.keys(statuses) as PermissionType[]).forEach(type => {
      if (statuses[type] !== RESULTS.GRANTED) {
        missing.push(type);
      }
    });

    return missing;
  }
}

export const permissionsService = new PermissionsService();
export {RESULTS as PermissionResults};
