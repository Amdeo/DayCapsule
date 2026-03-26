import { Dimensions } from 'react-native';
import {
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { SidebarAction } from './sidebarConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('screen');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

type SidebarSetter = (value: boolean) => void;

export interface SidebarPageStateProps {
  showSettings: boolean;
  setShowSettings: SidebarSetter;
  showStats: boolean;
  setShowStats: SidebarSetter;
  showBackup: boolean;
  setShowBackup: SidebarSetter;
}

interface UseSidebarControllerOptions extends SidebarPageStateProps {
  drawerProgress: SharedValue<number>;
  onClose: () => void;
}

export function useSidebarController({
  drawerProgress,
  onClose,
  setShowSettings,
  setShowStats,
  setShowBackup,
}: UseSidebarControllerOptions) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(drawerProgress.value, [0, 1], [-SIDEBAR_WIDTH, 0]),
      },
    ],
  }));

  const actionSetters: Record<SidebarAction, SidebarSetter> = {
    settings: setShowSettings,
    stats: setShowStats,
    backup: setShowBackup,
  };

  const handleMenuItemPress = (action: SidebarAction) => {
    onClose();
    actionSetters[action](true);
  };

  return {
    animatedStyle,
    handleMenuItemPress,
    sidebarWidth: SIDEBAR_WIDTH,
  };
}
