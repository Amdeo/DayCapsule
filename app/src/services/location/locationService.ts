import { Platform, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface AddressInfo {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

class LocationService {
  private readonly LOCATION_PERMISSION = Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  });

  private watchId: number | null = null;

  /**
   * 检查位置权限
   */
  async checkLocationPermission(): Promise<boolean> {
    try {
      const permission = await request(this.LOCATION_PERMISSION!);
      return permission === RESULTS.GRANTED;
    } catch (error) {
      console.error('检查位置权限失败:', error);
      return false;
    }
  }

  /**
   * 请求位置权限
   */
  async requestLocationPermission(): Promise<boolean> {
    const hasPermission = await this.checkLocationPermission();
    
    if (!hasPermission) {
      Alert.alert(
        '需要位置权限',
        '应用需要访问位置信息来记录您的活动地点。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '去设置',
            onPress: () => {
              // 在实际应用中，这里会打开系统设置
              // Linking.openSettings();
            },
          },
        ]
      );
    }

    return hasPermission;
  }

  /**
   * 获取当前位置
   */
  async getCurrentLocation(): Promise<LocationData> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('没有位置权限');
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          resolve(locationData);
        },
        (error) => {
          console.error('获取位置失败:', error);
          reject(new Error(`获取位置失败: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000 * 60 * 5, // 5分钟缓存
        }
      );
    });
  }

  /**
   * 开始位置跟踪
   */
  startLocationTracking(
    onLocationUpdate: (location: LocationData) => void,
    onError: (error: string) => void
  ): void {
    if (this.watchId !== null) {
      this.stopLocationTracking();
    }

    this.requestLocationPermission().then((hasPermission) => {
      if (!hasPermission) {
        onError('没有位置权限');
        return;
      }

      this.watchId = Geolocation.watchPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          onLocationUpdate(locationData);
        },
        (error) => {
          console.error('位置跟踪错误:', error);
          onError(`位置跟踪失败: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // 移动10米后才更新
          interval: 5000, // 5秒更新一次
          fastestInterval: 2000,
        }
      );
    });
  }

  /**
   * 停止位置跟踪
   */
  stopLocationTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * 计算两点间距离
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  /**
   * 角度转弧度
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 根据坐标获取地址信息（简化实现）
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<AddressInfo> {
    try {
      // 在实际应用中，这里会调用地理编码API
      // 例如高德地图、百度地图或Google Maps Geocoding API
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));

      // 基于坐标生成模拟地址
      const mockAddress = this.generateMockAddress(latitude, longitude);
      
      return mockAddress;
    } catch (error) {
      console.error('地理编码失败:', error);
      return {
        address: `纬度: ${latitude.toFixed(6)}, 经度: ${longitude.toFixed(6)}`,
      };
    }
  }

  /**
   * 生成模拟地址（开发/测试用）
   */
  private generateMockAddress(lat: number, lng: number): AddressInfo {
    // 基于坐标范围生成模拟地址
    const addresses = [
      {
        address: '北京市朝阳区三里屯太古里',
        city: '北京市',
        state: '北京',
        country: '中国',
      },
      {
        address: '上海市黄浦区外滩观光隧道',
        city: '上海市',
        state: '上海',
        country: '中国',
      },
      {
        address: '广州市天河区珠江新城',
        city: '广州市',
        state: '广东',
        country: '中国',
      },
      {
        address: '深圳市南山区科技园',
        city: '深圳市',
        state: '广东',
        country: '中国',
      },
      {
        address: '杭州市西湖区断桥残雪',
        city: '杭州市',
        state: '浙江',
        country: '中国',
      },
    ];

    // 简单哈希选择地址
    const hash = Math.abs(Math.sin(lat * lng));
    const index = Math.floor(hash * addresses.length);
    
    return addresses[index];
  }

  /**
   * 检查位置服务是否启用
   */
  async isLocationServicesEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        (error) => {
          console.error('位置服务检查失败:', error);
          resolve(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: Infinity,
        }
      );
    });
  }

  /**
   * 获取位置历史
   */
  async getLocationHistory(): Promise<LocationData[]> {
    // 在实际应用中，这里会从本地数据库或服务器获取位置历史
    // 现在返回空数组
    return [];
  }

  /**
   * 保存位置到历史记录
   */
  async saveLocationToHistory(location: LocationData): Promise<void> {
    // 在实际应用中，这里会将位置信息保存到本地数据库
    console.log('保存位置到历史:', location);
  }

  /**
   * 清理位置历史
   */
  async clearLocationHistory(): Promise<void> {
    // 在实际应用中，这里会清理位置历史记录
    console.log('清理位置历史');
  }

  /**
   * 检查是否在指定区域内
   */
  isInRegion(
    latitude: number,
    longitude: number,
    centerLatitude: number,
    centerLongitude: number,
    radiusInKm: number
  ): boolean {
    const distance = this.calculateDistance(
      latitude,
      longitude,
      centerLatitude,
      centerLongitude
    );
    return distance <= radiusInKm;
  }

  /**
   * 获取方向角度（从北方顺时针）
   */
  getBearing(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): number {
    const dLng = this.toRadians(endLng - startLng);
    const startLatRad = this.toRadians(startLat);
    const endLatRad = this.toRadians(endLat);

    const y = Math.sin(dLng) * Math.cos(endLatRad);
    const x =
      Math.cos(startLatRad) * Math.sin(endLatRad) -
      Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(dLng);

    let bearing = Math.atan2(y, x);
    bearing = (bearing * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  /**
   * 格式化位置显示
   */
  formatLocationDisplay(location: LocationData): string {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  /**
   * 格式化距离显示
   */
  formatDistance(distanceInKm: number): string {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)}米`;
    } else {
      return `${distanceInKm.toFixed(1)}公里`;
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopLocationTracking();
  }
}

// 单例实例
export const locationService = new LocationService();
export default locationService;
