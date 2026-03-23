import type React from 'react';
import type { Image } from 'react-native';

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
  backdropAnimatedStyle: any;
  heroAnimatedStyle: any;
  imageAnimatedStyle: any;
  composedGesture: any;
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
}
