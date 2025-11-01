// Type declarations for libraries without built-in TypeScript support

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import {Component} from 'react';
  import {TextProps} from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-paper';
declare module '@react-navigation/native';
declare module '@react-navigation/bottom-tabs';
declare module '@react-navigation/stack';
declare module 'react-native-safe-area-context';
declare module '@reduxjs/toolkit';
declare module 'react-native-sqlite-storage' {
  export interface SQLiteDatabase {
    executeSql(sql: string, params?: any[]): Promise<any>;
    close(): Promise<void>;
  }
  export function openDatabase(params: any): Promise<SQLiteDatabase>;
  export function DEBUG(debug: boolean): void;
  export function enablePromise(enable: boolean): void;
  const SQLite: any;
  export default SQLite;
}

declare module 'react-native-keychain';
declare module '@react-native-async-storage/async-storage';
declare module 'react-native-fs';
declare module 'react-native-geolocation-service';

declare module 'react-native-permissions' {
  export type Permission = string;
  export type PermissionStatus = 'unavailable' | 'denied' | 'limited' | 'granted' | 'blocked';

  export const PERMISSIONS: {
    IOS: Record<string, Permission>;
    ANDROID: Record<string, Permission>;
  };

  export const RESULTS: {
    UNAVAILABLE: PermissionStatus;
    DENIED: PermissionStatus;
    LIMITED: PermissionStatus;
    GRANTED: PermissionStatus;
    BLOCKED: PermissionStatus;
  };

  export function check(permission: Permission): Promise<PermissionStatus>;
  export function request(permission: Permission): Promise<PermissionStatus>;
}
