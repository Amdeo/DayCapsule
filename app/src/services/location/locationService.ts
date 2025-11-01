import Geolocation from 'react-native-geolocation-service';
import {logger} from '@services/telemetry/logger';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface LocationWithAddress extends Location {
  address?: string;
  city?: string;
  province?: string;
  country?: string;
}

export interface LocationServiceError {
  code: string;
  message: string;
}

/**
 * 地理位置服务
 * 使用 react-native-geolocation-service 获取用户位置
 */
class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * 获取当前位置
   */
  async getCurrentLocation(): Promise<Location | null> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };
          logger.info(`Current location obtained: ${location.latitude}, ${location.longitude}`);
          resolve(location);
        },
        error => {
          const locationError: LocationServiceError = {
            code: error.code.toString(),
            message: error.message,
          };
          logger.error(`Failed to get current location: ${locationError.message}`);
          reject(locationError);
        },
        {
          accuracy: {
            android: 'high',
            ios: 'best',
          },
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      );
    });
  }

  /**
   * 获取当前位置并反向地理编码获取地址
   */
  async getCurrentLocationWithAddress(): Promise<LocationWithAddress | null> {
    try {
      const location = await this.getCurrentLocation();
      if (!location) {
        return null;
      }

      // 这里需要调用反向地理编码服务
      // 由于 react-native-geolocation-service 不提供反向地理编码
      // 需要调用第三方 API 或使用其他库
      const address = await this.reverseGeocode(location.latitude, location.longitude);

      return {
        ...location,
        address: address?.address,
        city: address?.city,
        province: address?.province,
        country: address?.country,
      };
    } catch (error) {
      logger.error(`Failed to get location with address: ${error}`);
      return null;
    }
  }

  /**
   * 反向地理编码（获取地址）
   * 这是一个占位符实现，实际需要调用地图 API
   */
  private async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{address?: string; city?: string; province?: string; country?: string} | null> {
    try {
      // 这里应该调用高德地图、百度地图或其他地理编码 API
      // 示例：使用高德地图 API
      logger.info(`Reverse geocoding for ${latitude}, ${longitude}`);

      // 返回占位符数据
      return {
        address: `${latitude}, ${longitude}`,
        city: 'Unknown',
        province: 'Unknown',
        country: 'China',
      };
    } catch (error) {
      logger.error(`Reverse geocoding failed: ${error}`);
      return null;
    }
  }

  /**
   * 监听位置变化
   */
  watchLocation(
    onLocationChange: (location: Location) => void,
    onError: (error: LocationServiceError) => void,
  ): number {
    this.watchId = Geolocation.watchPosition(
      position => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp,
        };
        onLocationChange(location);
      },
      error => {
        const locationError: LocationServiceError = {
          code: error.code.toString(),
          message: error.message,
        };
        onError(locationError);
      },
      {
        accuracy: {
          android: 'high',
          ios: 'best',
        },
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        distanceFilter: 10, // 10 米变化时触发
      },
    );

    return this.watchId;
  }

  /**
   * 停止监听位置变化
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      logger.info('Stopped watching location');
    }
  }

  /**
   * 计算两个位置之间的距离（米）
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 角度转弧度
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * 检查位置权限
   */
  async checkLocationPermission(): Promise<boolean> {
    try {
      // 权限检查由 permissionService 处理
      return true;
    } catch (error) {
      logger.error(`Location permission check failed: ${error}`);
      return false;
    }
  }

  /**
   * 验证位置数据
   */
  validateLocation(location: Location): boolean {
    if (location.latitude < -90 || location.latitude > 90) {
      logger.warn('Invalid latitude');
      return false;
    }

    if (location.longitude < -180 || location.longitude > 180) {
      logger.warn('Invalid longitude');
      return false;
    }

    if (location.accuracy < 0) {
      logger.warn('Invalid accuracy');
      return false;
    }

    return true;
  }

  /**
   * 获取位置精度描述
   */
  getAccuracyDescription(accuracy: number): string {
    if (accuracy < 5) return '非常精确';
    if (accuracy < 10) return '精确';
    if (accuracy < 50) return '一般';
    if (accuracy < 100) return '较差';
    return '很差';
  }
}

export const locationService = LocationService.getInstance();

