/**
 * 通知状态slice
 */

import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  permissionGranted: boolean;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  permissionGranted: false,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // 添加通知
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
        read: false,
      };
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },

    // 标记为已读
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    // 标记所有为已读
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },

    // 删除通知
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },

    // 清除所有通知
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },

    // 设置权限状态
    setPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.permissionGranted = action.payload;
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearNotifications,
  setPermissionGranted,
} = notificationsSlice.actions;

// Selectors
export const selectNotifications = (state: {notifications: NotificationsState}) => state.notifications.notifications;
export const selectUnreadCount = (state: {notifications: NotificationsState}) => state.notifications.unreadCount;
export const selectPermissionGranted = (state: {notifications: NotificationsState}) => state.notifications.permissionGranted;

export default notificationsSlice.reducer;