import {logger} from '@services/telemetry/logger';

export interface WeatherData {
  temperature: number; // 摄氏度
  condition: string; // 天气状况：晴、多云、阴、雨、雪等
  humidity: number; // 湿度百分比
  windSpeed: number; // 风速 km/h
  windDirection: string; // 风向
  pressure: number; // 气压 hPa
  visibility: number; // 能见度 km
  uvIndex: number; // 紫外线指数
  feelsLike: number; // 体感温度
  timestamp: number; // 获取时间戳
}

export interface WeatherServiceError {
  code: string;
  message: string;
}

/**
 * 天气服务
 * 获取本地天气信息
 * 注：实际实现需要调用天气 API（如高德、心知天气等）
 */
class WeatherService {
  private static instance: WeatherService;
  private cachedWeather: WeatherData | null = null;
  private cacheExpireTime: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 分钟缓存

  private constructor() {}

  static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  /**
   * 获取指定位置的天气
   */
  async getWeatherByLocation(latitude: number, longitude: number): Promise<WeatherData | null> {
    try {
      // 检查缓存
      if (this.cachedWeather && Date.now() < this.cacheExpireTime) {
        logger.info('Returning cached weather data');
        return this.cachedWeather;
      }

      // 这里应该调用真实的天气 API
      // 示例：使用高德地图天气 API 或其他天气服务
      const weatherData = await this.fetchWeatherFromAPI(latitude, longitude);

      if (weatherData) {
        this.cachedWeather = weatherData;
        this.cacheExpireTime = Date.now() + this.CACHE_DURATION;
      }

      return weatherData;
    } catch (error) {
      logger.error(`Failed to get weather: ${error}`);
      return null;
    }
  }

  /**
   * 从 API 获取天气数据（占位符实现）
   */
  private async fetchWeatherFromAPI(
    latitude: number,
    longitude: number,
  ): Promise<WeatherData | null> {
    try {
      // 这里应该调用真实的天气 API
      // 示例代码：
      // const response = await fetch(
      //   `https://api.amap.com/v1/weather/weatherInfo?location=${longitude},${latitude}&key=YOUR_API_KEY`
      // );
      // const data = await response.json();

      // 返回模拟数据
      const mockWeather: WeatherData = {
        temperature: 25,
        condition: '晴',
        humidity: 60,
        windSpeed: 10,
        windDirection: '东北',
        pressure: 1013,
        visibility: 10,
        uvIndex: 5,
        feelsLike: 24,
        timestamp: Date.now(),
      };

      logger.info(`Weather fetched for ${latitude}, ${longitude}`);
      return mockWeather;
    } catch (error) {
      logger.error(`Failed to fetch weather from API: ${error}`);
      return null;
    }
  }

  /**
   * 获取天气图标
   */
  getWeatherIcon(condition: string): string {
    const iconMap: Record<string, string> = {
      晴: '☀️',
      多云: '⛅',
      阴: '☁️',
      雨: '🌧️',
      雪: '❄️',
      雷: '⛈️',
      风: '💨',
      雾: '🌫️',
    };

    return iconMap[condition] || '🌤️';
  }

  /**
   * 获取天气描述
   */
  getWeatherDescription(weather: WeatherData): string {
    return `${weather.condition}，${weather.temperature}°C，湿度 ${weather.humidity}%`;
  }

  /**
   * 判断是否适合户外活动
   */
  isSuitableForOutdoor(weather: WeatherData): boolean {
    // 不适合户外：下雨、下雪、大风
    const unsuitableConditions = ['雨', '雪', '雷'];
    const isUnsuitableCondition = unsuitableConditions.some(condition =>
      weather.condition.includes(condition),
    );

    if (isUnsuitableCondition) {
      return false;
    }

    // 风速过大不适合
    if (weather.windSpeed > 30) {
      return false;
    }

    return true;
  }

  /**
   * 获取天气建议
   */
  getWeatherAdvice(weather: WeatherData): string[] {
    const advice: string[] = [];

    if (weather.temperature > 35) {
      advice.push('天气炎热，请做好防晒和补水');
    } else if (weather.temperature < 0) {
      advice.push('天气寒冷，请穿好保暖衣物');
    }

    if (weather.humidity > 80) {
      advice.push('湿度较大，容易感到闷热');
    }

    if (weather.uvIndex > 7) {
      advice.push('紫外线强度高，建议涂抹防晒霜');
    }

    if (weather.windSpeed > 20) {
      advice.push('风力较大，外出请注意安全');
    }

    if (weather.condition.includes('雨')) {
      advice.push('有降雨，出门请携带雨具');
    }

    if (advice.length === 0) {
      advice.push('天气良好，适合户外活动');
    }

    return advice;
  }

  /**
   * 验证天气数据
   */
  validateWeather(weather: WeatherData): boolean {
    if (weather.temperature < -50 || weather.temperature > 60) {
      logger.warn('Invalid temperature');
      return false;
    }

    if (weather.humidity < 0 || weather.humidity > 100) {
      logger.warn('Invalid humidity');
      return false;
    }

    if (weather.windSpeed < 0) {
      logger.warn('Invalid wind speed');
      return false;
    }

    if (weather.pressure < 900 || weather.pressure > 1100) {
      logger.warn('Invalid pressure');
      return false;
    }

    return true;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cachedWeather = null;
    this.cacheExpireTime = 0;
    logger.info('Weather cache cleared');
  }

  /**
   * 获取缓存的天气数据
   */
  getCachedWeather(): WeatherData | null {
    if (this.cachedWeather && Date.now() < this.cacheExpireTime) {
      return this.cachedWeather;
    }
    return null;
  }

  /**
   * 检查缓存是否过期
   */
  isCacheExpired(): boolean {
    return Date.now() >= this.cacheExpireTime;
  }
}

export const weatherService = WeatherService.getInstance();

