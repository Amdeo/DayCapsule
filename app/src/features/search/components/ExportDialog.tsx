import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {exportService} from '@services/export/exportService';
import {logger} from '@services/telemetry/logger';

interface ExportDialogProps {
  visible: boolean;
  entries: any[];
  onClose: () => void;
  onSuccess?: () => void;
}

type ExportFormat = 'pdf' | 'word' | 'csv' | 'json';

export const ExportDialog: React.FC<ExportDialogProps> = ({
  visible,
  entries,
  onClose,
  onSuccess,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [filename, setFilename] = useState(`export_${new Date().toISOString().split('T')[0]}`);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // 执行导出
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);

      let filePath: string;

      const options = {
        filename,
        onProgress: (p: number) => setProgress(p),
      };

      switch (selectedFormat) {
        case 'pdf':
          filePath = await exportService.exportToPDF(entries, options);
          break;
        case 'word':
          filePath = await exportService.exportToWord(entries, options);
          break;
        case 'csv':
          filePath = await exportService.exportToCSV(entries, options);
          break;
        case 'json':
          filePath = await exportService.exportToJSON(entries, options);
          break;
      }

      Alert.alert('导出成功', `文件已保存到: ${filePath}`, [
        {text: '确定', onPress: () => {
          onSuccess?.();
          onClose();
        }},
      ]);

      logger.info('Export completed', {format: selectedFormat, filePath});
    } catch (error) {
      logger.error('Export failed', {error});
      Alert.alert('导出失败', '请重试');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog} testID="export_dialog">
          <Text style={styles.title}>导出记录</Text>

          {/* 格式选择 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>选择格式</Text>
            <View style={styles.formatOptions}>
              {(['pdf', 'word', 'csv', 'json'] as ExportFormat[]).map(format => (
                <TouchableOpacity
                  key={format}
                  style={[
                    styles.formatOption,
                    selectedFormat === format && styles.formatOptionSelected,
                  ]}
                  onPress={() => setSelectedFormat(format)}
                  testID={`export_format_${format}`}
                >
                  <Text
                    style={[
                      styles.formatOptionText,
                      selectedFormat === format && styles.formatOptionTextSelected,
                    ]}
                  >
                    {format.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 文件名输入 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>文件名</Text>
            <TextInput
              style={styles.filenameInput}
              placeholder="输入文件名"
              value={filename}
              onChangeText={setFilename}
              editable={!isExporting}
            />
          </View>

          {/* 导出信息 */}
          <View style={styles.section}>
            <Text style={styles.infoText}>
              将导出 {entries.length} 条记录
            </Text>
          </View>

          {/* 进度条 */}
          {isExporting && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, {width: `${progress}%`}]} />
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}

          {/* 按钮 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isExporting}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
              onPress={handleExport}
              disabled={isExporting}
              testID="confirm_export_button"
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.exportButtonText}>导出</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  formatOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formatOption: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  formatOptionSelected: {
    backgroundColor: '#007AFF',
  },
  formatOptionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  formatOptionTextSelected: {
    color: '#fff',
  },
  filenameInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

