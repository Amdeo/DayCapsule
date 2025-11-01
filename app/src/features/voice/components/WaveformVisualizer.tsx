import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {Canvas, Path, Skia} from '@shopify/react-native-skia';

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
  const screenWidth = Dimensions.get('window').width;
  const canvasWidth = screenWidth - 32; // 两侧各 16px 边距
  const canvasHeight = 120;

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

  // 绘制波形
  const drawWaveform = () => {
    if (waveformData.length === 0) {
      return null;
    }

    const path = Skia.Path.Make();
    const pointSpacing = canvasWidth / Math.max(waveformData.length - 1, 1);
    const centerY = canvasHeight / 2;

    // 移动到起点
    path.moveTo(0, centerY);

    // 绘制波形曲线
    waveformData.forEach((value, index) => {
      const x = index * pointSpacing;
      const y = centerY - (value - 0.5) * canvasHeight;
      path.lineTo(x, y);
    });

    // 绘制返回路径（填充波形）
    path.lineTo(canvasWidth, centerY);
    path.lineTo(0, centerY);
    path.close();

    return path;
  };

  const waveformPath = drawWaveform();

  return (
    <View style={styles.container} testID={testID || 'waveform_visualizer'}>
      <Canvas style={styles.canvas}>
        {/* 背景 */}
        <View style={styles.background} />

        {/* 中心线 */}
        <Path
          path={Skia.Path.Make().moveTo(0, canvasHeight / 2).lineTo(canvasWidth, canvasHeight / 2)}
          color="#e0e0e0"
          style="stroke"
          strokeWidth={1}
        />

        {/* 波形 */}
        {waveformPath && (
          <Path
            path={waveformPath}
            color="#2196f3"
            style="fill"
            opacity={0.3}
          />
        )}

        {/* 波形边界 */}
        {waveformPath && (
          <Path
            path={waveformPath}
            color="#2196f3"
            style="stroke"
            strokeWidth={2}
          />
        )}
      </Canvas>

      {/* 频率条（备选方案） */}
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

