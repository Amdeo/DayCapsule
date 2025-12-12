import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';

interface WaveformVisualizerProps {
  isRecording: boolean;
  isPaused: boolean;
  testID?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording,
  isPaused,
  testID,
}) => {
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // 生成随机波形数据
  useEffect(() => {
    if (!isRecording || isPaused) {
      return;
    }

    const interval = setInterval(() => {
      setWaveformData(prev => {
        // 生成新的波形数据点
        const newData = [...prev];
        const newPoint = Math.random() * 0.8 + 0.1; // 0.1 到 0.9 之间

        newData.push(newPoint);

        // 保持最多 100 个数据点
        if (newData.length > 100) {
          newData.shift();
        }

        return newData;
      });
    }, 50); // 每 50ms 更新一次

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  return (
    <View style={styles.container} testID={testID || 'waveform_visualizer'}>
      {/* 频率条可视化 */}
      <View style={styles.frequencyBars}>
        {Array.from({length: 20}).map((_, index) => {
          const height = waveformData[index % waveformData.length] || 0.3;
          return (
            <View
              key={index}
              style={[
                styles.frequencyBar,
                {
                  height: `${height * 100}%`,
                  backgroundColor: isPaused ? '#ff9800' : '#2196f3',
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 120,
    marginVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
  background: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  frequencyBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 4,
  },
  frequencyBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
});

