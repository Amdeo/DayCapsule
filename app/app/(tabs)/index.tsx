import { View, Pressable, type ViewStyle } from 'react-native';
import { memo, useState, type ComponentProps } from 'react';
import Animated from 'react-native-reanimated';
import { Timeline } from '@/src/components/Timeline.v2';
import { Sidebar } from '@/src/components/Sidebar';
import { TextEditor } from '@/src/components/TextEditor';
import { useDrawerAnimation, MAIN_TRANSLATE_X } from '@/src/components/home/useDrawerAnimation';
import { useHomeScreenController } from '@/src/components/home/useHomeScreenController';

const getDrawerOverlayStyle = (): ViewStyle => ({ left: MAIN_TRANSLATE_X });
const getHomeScreenRootStyle = (): ViewStyle => ({ flex: 1 });

const StableTimeline = memo(Timeline);

type SidebarShellProps = Pick<ComponentProps<typeof Sidebar>, 'drawerProgress' | 'onClose'>;

function SidebarShell({ drawerProgress, onClose }: SidebarShellProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  return (
    <Sidebar
      drawerProgress={drawerProgress}
      onClose={onClose}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      showStats={showStats}
      setShowStats={setShowStats}
      showBackup={showBackup}
      setShowBackup={setShowBackup}
    />
  );
}

const StableSidebarShell = memo(SidebarShell);

export default function HomeScreen() {
  const { showTextEditor, setShowTextEditor, handleMediaSelect, handleStopRecording, handleTextSave } =
    useHomeScreenController();
  const { drawerProgress, drawerOpen, openDrawer, closeDrawer, mainContentStyle } =
    useDrawerAnimation();

  return (
    <View
      testID="home-screen-root"
      className="flex-1 bg-home-mask"
      style={getHomeScreenRootStyle()}
    >
      <Animated.View className="flex-1" style={mainContentStyle}>
        <StableTimeline
          onQuickAdd={handleMediaSelect}
          onMenuPress={openDrawer}
          onStopRecording={handleStopRecording}
        />
      </Animated.View>

      <TextEditor
        visible={showTextEditor}
        onSave={handleTextSave}
        onCancel={() => setShowTextEditor(false)}
      />

      <StableSidebarShell
        drawerProgress={drawerProgress}
        onClose={closeDrawer}
      />

      {drawerOpen && (
        <Pressable
          onPress={closeDrawer}
          className="absolute bottom-0 right-0 top-0 z-[5]"
          style={getDrawerOverlayStyle()}
        />
      )}
    </View>
  );
}
