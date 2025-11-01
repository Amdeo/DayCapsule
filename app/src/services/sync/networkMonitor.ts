/**
 * 网络状态监听
 * 用于离线/在线切换检测
 */

import NetInfo, {NetInfoState, NetInfoSubscription} from '@react-native-community/netinfo';
import {logger} from '@services/telemetry/logger';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkInfo {
  status: NetworkStatus;
  type: string | null;
  isInternetReachable: boolean | null;
  details: any;
}

type NetworkChangeCallback = (info: NetworkInfo) => void;

class NetworkMonitor {
  private currentStatus: NetworkStatus = 'unknown';
  private listeners: Set<NetworkChangeCallback> = new Set();
  private unsubscribe: NetInfoSubscription | null = null;

  /**
   * 初始化网络监听
   */
  async init(): Promise<void> {
    try {
      // 获取初始网络状态
      const state = await NetInfo.fetch();
      this.handleNetworkChange(state);

      // 订阅网络状态变化
      this.unsubscribe = NetInfo.addEventListener(this.handleNetworkChange);

      logger.info('NetworkMonitor initialized', {status: this.currentStatus});
    } catch (error) {
      logger.error('Failed to initialize NetworkMonitor', error);
    }
  }

  /**
   * 处理网络状态变化
   */
  private handleNetworkChange = (state: NetInfoState): void => {
    const previousStatus = this.currentStatus;
    const newStatus = this.getNetworkStatus(state);

    this.currentStatus = newStatus;

    const networkInfo: NetworkInfo = {
      status: newStatus,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
      details: state.details,
    };

    // 如果状态发生变化，通知所有监听器
    if (previousStatus !== newStatus) {
      logger.info('Network status changed', {
        from: previousStatus,
        to: newStatus,
        type: state.type,
      });

      this.notifyListeners(networkInfo);
    }
  };

  /**
   * 获取网络状态
   */
  private getNetworkStatus(state: NetInfoState): NetworkStatus {
    if (!state.isConnected) {
      return 'offline';
    }

    if (state.isInternetReachable === false) {
      return 'offline';
    }

    if (state.isInternetReachable === true) {
      return 'online';
    }

    // isInternetReachable 为 null 时，假设在线
    return 'online';
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(info: NetworkInfo): void {
    this.listeners.forEach(callback => {
      try {
        callback(info);
      } catch (error) {
        logger.error('Error in network change callback', error);
      }
    });
  }

  /**
   * 添加网络状态变化监听器
   */
  addListener(callback: NetworkChangeCallback): () => void {
    this.listeners.add(callback);

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 移除监听器
   */
  removeListener(callback: NetworkChangeCallback): void {
    this.listeners.delete(callback);
  }

  /**
   * 获取当前网络状态
   */
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  /**
   * 检查是否在线
   */
  isOnline(): boolean {
    return this.currentStatus === 'online';
  }

  /**
   * 检查是否离线
   */
  isOffline(): boolean {
    return this.currentStatus === 'offline';
  }

  /**
   * 获取详细网络信息
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const state = await NetInfo.fetch();
      return {
        status: this.getNetworkStatus(state),
        type: state.type,
        isInternetReachable: state.isInternetReachable,
        details: state.details,
      };
    } catch (error) {
      logger.error('Failed to fetch network info', error);
      return {
        status: 'unknown',
        type: null,
        isInternetReachable: null,
        details: null,
      };
    }
  }

  /**
   * 等待网络恢复
   */
  async waitForOnline(timeout: number = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.addListener(info => {
        if (info.status === 'online') {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
    logger.info('NetworkMonitor disposed');
  }
}

export const networkMonitor = new NetworkMonitor();
