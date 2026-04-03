import type React from 'react';
import type { Image, ImageStyle, ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { ComposedGesture } from 'react-native-gesture-handler';

export type ImageViewerPhase =
  | 'idle'
  | 'opening'
  | 'open'
  | 'closing'
  | 'closing-fade';

export interface OriginLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageViewerSceneProps {
  visible: boolean;
  imageUri: string;
  phase: ImageViewerPhase;
  showActionSheet: boolean;
  bottomInset: number;
  screenWidth: number;
  screenHeight: number;
  backdropAnimatedStyle: AnimatedStyle<ViewStyle>;
  heroAnimatedStyle: AnimatedStyle<ImageStyle>;
  imageAnimatedStyle: AnimatedStyle<ViewStyle>;
  composedGesture: ComposedGesture;
  onRequestClose: () => void;
  onCloseActionSheet: () => void;
  onSaveToAlbum: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
}

export interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  originLayout?: OriginLayout;
  thumbnailRef?: React.RefObject<React.ElementRef<typeof Image>>;
  debugShowActionSheet?: boolean;
}
