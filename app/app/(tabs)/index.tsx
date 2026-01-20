import { View } from 'react-native';
import { useState, useEffect } from 'react';
import { useEntryStore } from '@/src/store/entryStore';
import { Timeline } from '@/src/components/Timeline.v2';
import { BottomToolbar } from '@/src/components/BottomToolbar';
import { Sidebar } from '@/src/components/Sidebar';
import { MediaSelector } from '@/src/components/MediaSelector';
import { PhotoSelector } from '@/src/components/PhotoSelector';
import { VoiceRecorder } from '@/src/components/VoiceRecorder';

export default function HomeScreen() {
  const { loadEntries, addEntry } = useEntryStore();
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // 在组件挂载时加载数据
  useEffect(() => {
    loadEntries();
  }, []);

  // 处理媒体类型选择
  const handleMediaSelect = (type: 'text' | 'photo' | 'voice') => {
    setShowMediaSelector(false);

    switch(type) {
      case 'text':
        // 文本类型直接添加空记录，让用户在卡片中编辑
        addEntry({
          type: 'text',
          content: '点击编辑...',
        });
        break;
      case 'photo':
        setShowPhotoSelector(true);
        break;
      case 'voice':
        setShowVoiceRecorder(true);
        break;
    }
  };

  // 处理照片选择
  const handlePhotoSelect = (uri: string) => {
    addEntry({
      type: 'photo',
      content: '',
      media: {
        uri,
        type: 'photo',
      },
    });
    setShowPhotoSelector(false);
  };

  // 处理语音录制完成
  const handleVoiceRecord = (uri: string, duration: number) => {
    addEntry({
      type: 'voice',
      content: '',
      media: {
        uri,
        type: 'voice',
        duration,
      },
    });
    setShowVoiceRecorder(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      {/* 时间轴内容（包含搜索栏） */}
      <Timeline onQuickAdd={handleMediaSelect} onMenuPress={() => setShowSidebar(true)} />

      {/* 底部圆形工具栏 */}
      <BottomToolbar onPress={handleMediaSelect} />

      {/* 侧边栏 */}
      <Sidebar visible={showSidebar} onClose={() => setShowSidebar(false)} />

      {/* 媒体选择器模态框 */}
      <MediaSelector
        visible={showMediaSelector}
        onSelect={handleMediaSelect}
        onCancel={() => setShowMediaSelector(false)}
      />

      {/* 照片选择器模态框 */}
      <PhotoSelector
        visible={showPhotoSelector}
        onSelectPhoto={handlePhotoSelect}
        onCancel={() => setShowPhotoSelector(false)}
      />

      {/* 语音录制器模态框 */}
      <VoiceRecorder
        visible={showVoiceRecorder}
        onSave={handleVoiceRecord}
        onCancel={() => setShowVoiceRecorder(false)}
      />
    </View>
  );
}
