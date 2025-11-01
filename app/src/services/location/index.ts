import Geolocation from 'react-native-geolocation-service';
import {permissionsService} from '@services/permissions';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationWithAddress extends LocationData {
  address?: string;
  city?: string;
  country?: string;
}

/**
 * 地理位置服务
 * 获取用户当前位置信息
 */
class LocationService {
  private watchId: number | null = null;

  /**
   * 获取当前位置
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      // 检查权限
      const hasPermission = await permissionsService.ensurePermission('location');
      if (!hasPermission) {
        console.warn('Location permission not granted');
        return null;
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          position => {
            const location: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude || undefined,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            };
            console.log('Current location:', location);
            resolve(location);
          },
          error => {
            console.error('Failed to get current location:', error);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          },
        );
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * 开始监听位置变化
   */
  async startWatchingLocation(callback: (location: LocationData) => void): Promise<boolean> {
    try {
      const hasPermission = await permissionsService.ensurePermission('location');
      if (!hasPermission) {
        console.warn('Location permission not granted');
        return false;
      }

      this.watchId = Geolocation.watchPosition(
        position => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude || undefined,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          callback(location);
        },
        error => {
          console.error('Location watch error:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // 移动10米才更新
          interval: 5000, // Android: 5秒更新一次
          fastestInterval: 2000, // Android: 最快2秒更新一次
        },
      );

      console.log('Started watching location');
      return true;
    } catch (error) {
      console.error('Failed to start watching location:', error);
      return false;
    }
  }

  /**
   * 停止监听位置变化
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('Stopped watching location');
    }
  }

  /**
   * 反向地理编码（坐标转地址）
   * 注意：这需要第三方服务（如高德地图、Google Maps API）
   * 这里提供一个占位实现
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      // TODO: 集成地理编码服务
      // 可以使用：
      // - 高德地图 API
      // - Google Maps Geocoding API
      // - OpenStreetMap Nominatim

      console.log(`Reverse geocoding: ${latitude}, ${longitude}`);

      // 占位返回
      return `位置: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * 获取带地址的位置信息
   */
  async getCurrentLocationWithAddress(): Promise<LocationWithAddress | null> {
    try {
      const location = await this.getCurrentLocation();
      if (!location) {
        return null;
      }

      const address = await this.reverseGeocode(location.latitude, location.longitude);

      return {
        ...location,
        address: address || undefined,
      };
    } catch (error) {
      console.error('Failed to get location with address:', error);
      return null;
    }
  }

  /**
   * 计算两点之间的距离（米）
   * 使用 Haversine 公式
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // 地球半径（米）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 格式化距离显示
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}米`;
    }
    return `${(meters / 1000).toFixed(1)}公里`;
  }

  /**
   * 检查位置服务是否可用
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      const hasPermission = await permissionsService.isPermissionGranted('location');
      return hasPermission;
    } catch (error) {
      console.error('Failed to check location availability:', error);
      return false;
    }
  }
}

export const locationService = new LocationService();
