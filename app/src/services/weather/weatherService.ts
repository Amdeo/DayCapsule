import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  uvIndex: number;
  icon: string;
  description: string;
  location: string;
  timestamp: number;
  isDay: boolean;
}

export interface WeatherForecast {
  date: string;
  temperature: {
    high: number;
    low: number;
  };
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

class WeatherService {
  private readonly API_KEY = process.env.WEATHER_API_KEY || 'your-weather-api-key';
  private readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存

  /**
   * 获取当前位置的天气信息
   */
  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    const cacheKey = `current_${latitude}_${longitude}`;
    const cached = this.getCachedWeather(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 检查网络连接
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('网络连接不可用');
      }

      // 调用天气API
      const response = await fetch(
        `${this.BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${this.API_KEY}&units=metric&lang=zh_cn`
      );

      if (!response.ok) {
        throw new Error(`天气API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const weatherData = this.parseWeatherResponse(data);

      // 缓存结果
      this.setCachedWeather(cacheKey, weatherData);

      return weatherData;
    } catch (error) {
      console.error('获取天气信息失败:', error);
      
      // 返回模拟天气数据（离线或API失败时）
      return this.getMockWeatherData(latitude, longitude);
    }
  }

  /**
   * 获取天气预报
   */
  async getWeatherForecast(
    latitude: number,
    longitude: number,
    days: number = 5
  ): Promise<WeatherForecast[]> {
    try {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('网络连接不可用');
      }

      const response = await fetch(
        `${this.BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${this.API_KEY}&units=metric&lang=zh_cn&cnt=${days * 8}` // 每天8个时间段（3小时间隔）
      );

      if (!response.ok) {
        throw new Error(`天气预报API请求失败: ${response.status}`);
      }

      const data = await response.json();
      return this.parseForecastResponse(data, days);
    } catch (error) {
      console.error('获取天气预报失败:', error);
      return this.getMockForecastData(days);
    }
  }

  /**
   * 根据城市名获取天气
   */
  async getWeatherByCity(cityName: string): Promise<WeatherData> {
    const cacheKey = `city_${cityName}`;
    const cached = this.getCachedWeather(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('网络连接不可用');
      }

      const response = await fetch(
        `${this.BASE_URL}/weather?q=${encodeURIComponent(cityName)}&appid=${this.API_KEY}&units=metric&lang=zh_cn`
      );

      if (!response.ok) {
        throw new Error(`城市天气API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const weatherData = this.parseWeatherResponse(data);

      this.setCachedWeather(cacheKey, weatherData);

      return weatherData;
    } catch (error) {
      console.error('根据城市获取天气失败:', error);
      return this.getMockWeatherData(0, 0, cityName);
    }
  }

  /**
   * 解析天气API响应
   */
  private parseWeatherResponse(data: any): WeatherData {
    const weather = data.weather[0];
    const main = data.main;
    const wind = data.wind;
    const sys = data.sys;

    return {
      temperature: Math.round(main.temp),
      condition: weather.main,
      humidity: main.humidity,
      pressure: main.pressure,
      windSpeed: wind.speed || 0,
      windDirection: wind.deg || 0,
      visibility: (data.visibility || 10000) / 1000, // 转换为公里
      uvIndex: 0, // 需要单独API获取
      icon: weather.icon,
      description: weather.description,
      location: `${data.name}, ${sys.country}`,
      timestamp: Date.now(),
      isDay: weather.icon.includes('d'),
    };
  }

  /**
   * 解析预报API响应
   */
  private parseForecastResponse(data: any, days: number): WeatherForecast[] {
    const forecastList = data.list;
    const forecasts: WeatherForecast[] = [];

    // 按天分组数据
    const dailyData: { [date: string]: any[] } = {};

    forecastList.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(item);
    });

    // 每天生成一个预报
    Object.keys(dailyData).slice(0, days).forEach(date => {
      const dayData = dailyData[date];
      const temps = dayData.map(item => item.main.temp);
      const weather = dayData[0].weather[0];

      const forecast: WeatherForecast = {
        date,
        temperature: {
          high: Math.round(Math.max(...temps)),
          low: Math.round(Math.min(...temps)),
        },
        condition: weather.main,
        icon: weather.icon,
        humidity: dayData[0].main.humidity,
        windSpeed: dayData[0].wind.speed || 0,
      };

      forecasts.push(forecast);
    });

    return forecasts;
  }

  /**
   * 获取模拟天气数据（离线或测试用）
   */
  private getMockWeatherData(
    latitude: number,
    longitude: number,
    cityName?: string
  ): WeatherData {
    const mockConditions = [
      { condition: 'Clear', icon: '01d', description: '晴朗' },
      { condition: 'Clouds', icon: '02d', description: '多云' },
      { condition: 'Rain', icon: '10d', description: '小雨' },
      { condition: 'Snow', icon: '13d', description: '雪' },
      { condition: 'Thunderstorm', icon: '11d', description: '雷雨' },
    ];

    // 基于坐标或城市名生成伪随机数
    const seed = Math.abs(Math.sin((latitude + longitude) * 1000)) * 1000;
    const index = Math.floor(seed) % mockConditions.length;
    const mockCondition = mockConditions[index];

    // 生成随机温度（基于季节）
    const month = new Date().getMonth();
    let temperature: number;
    
    if (month >= 11 || month <= 1) { // 冬季
      temperature = Math.round(-5 + Math.random() * 15);
    } else if (month >= 2 && month <= 4) { // 春季
      temperature = Math.round(10 + Math.random() * 15);
    } else if (month >= 5 && month <= 7) { // 夏季
      temperature = Math.round(25 + Math.random() * 15);
    } else { // 秋季
      temperature = Math.round(15 + Math.random() * 15);
    }

    return {
      temperature,
      condition: mockCondition.condition,
      humidity: Math.round(40 + Math.random() * 40),
      pressure: Math.round(990 + Math.random() * 40),
      windSpeed: Math.round(Math.random() * 10 * 10) / 10,
      windDirection: Math.round(Math.random() * 360),
      visibility: Math.round(5 + Math.random() * 15),
      uvIndex: Math.round(Math.random() * 11),
      icon: mockCondition.icon,
      description: mockCondition.description,
      location: cityName || `纬度:${latitude.toFixed(2)}, 经度:${longitude.toFixed(2)}`,
      timestamp: Date.now(),
      isDay: Math.random() > 0.3, // 70%概率是白天
    };
  }

  /**
   * 获取模拟预报数据
   */
  private getMockForecastData(days: number): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const mockConditions = ['Clear', 'Clouds', 'Rain', 'Snow'];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const randomCondition = mockConditions[Math.floor(Math.random() * mockConditions.length)];
      const highTemp = Math.round(20 + Math.random() * 15);
      const lowTemp = highTemp - Math.round(5 + Math.random() * 10);

      forecasts.push({
        date: date.toDateString(),
        temperature: { high: highTemp, low: lowTemp },
        condition: randomCondition,
        icon: '01d',
        humidity: Math.round(40 + Math.random() * 40),
        windSpeed: Math.round(Math.random() * 10 * 10) / 10,
      });
    }

    return forecasts;
  }

  /**
   * 缓存天气数据
   */
  private setCachedWeather(key: string, data: WeatherData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取缓存的天气数据
   */
  private getCachedWeather(key: string): WeatherData | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取天气图标URL
   */
  getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  /**
   * 格式化温度显示
   */
  formatTemperature(temperature: number, unit: 'celsius' | 'fahrenheit' = 'celsius'): string {
    if (unit === 'fahrenheit') {
      return `${Math.round(temperature * 9/5 + 32)}°F`;
    }
    return `${temperature}°C`;
  }

  /**
   * 格式化风速显示
   */
  formatWindSpeed(speed: number, unit: 'mps' | 'kmh' | 'mph' = 'mps'): string {
    let convertedSpeed = speed;
    let unitText = 'm/s';

    switch (unit) {
      case 'kmh':
        convertedSpeed = speed * 3.6;
        unitText = 'km/h';
        break;
      case 'mph':
        convertedSpeed = speed * 2.237;
        unitText = 'mph';
        break;
      default:
        unitText = 'm/s';
    }

    return `${Math.round(convertedSpeed * 10) / 10} ${unitText}`;
  }

  /**
   * 格式化能见度显示
   */
  formatVisibility(visibility: number): string {
    if (visibility >= 1) {
      return `${visibility.toFixed(1)}km`;
    }
    return `${Math.round(visibility * 1000)}m`;
  }

  /**
   * 获取天气建议
   */
  getWeatherAdvice(weatherData: WeatherData): string {
    const { temperature, condition, windSpeed, humidity } = weatherData;

    if (temperature < 0) {
      return '天气寒冷，注意保暖防寒。';
    } else if (temperature > 30) {
      return '天气炎热，注意防暑降温。';
    } else if (condition === 'Rain') {
      return '今日有雨，外出请携带雨具。';
    } else if (condition === 'Snow') {
      return '今日有雪，注意道路湿滑。';
    } else if (windSpeed > 10) {
      return '风力较大，外出注意安全。';
    } else if (humidity < 30) {
      return '空气较干燥，注意补水保湿。';
    } else if (humidity > 80) {
      return '空气湿度较高，注意通风。';
    } else {
      return '天气适宜，外出活动的好日子！';
    }
  }

  /**
   * 检查天气服务是否可用
   */
  isWeatherServiceAvailable(): boolean {
    return !!this.API_KEY && this.API_KEY !== 'your-weather-api-key';
  }

  /**
   * 清理所有缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// 单例实例
export const weatherService = new WeatherService();
export default weatherService;
