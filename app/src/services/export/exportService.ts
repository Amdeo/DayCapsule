import RNFS from 'react-native-fs';
import {logger} from '@services/telemetry/logger';

export interface ExportOptions {
  filename?: string;
  includeFields?: string[];
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  onProgress?: (progress: number) => void;
}

class ExportService {
  private exportDir = `${RNFS.DocumentsDirectoryPath}/exports`;
  private exportedFiles: Set<string> = new Set();

  async ensureExportDir(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.exportDir);
      if (!exists) {
        await RNFS.mkdir(this.exportDir);
      }
    } catch (error) {
      logger.error('Failed to create export directory', {error});
      throw error;
    }
  }

  async exportToPDF(
    entries: any[],
    options: ExportOptions = {},
  ): Promise<string> {
    try {
      await this.ensureExportDir();

      const {filename = `export_${Date.now()}`, onProgress} = options;
      const filePath = `${this.exportDir}/${filename}.pdf`;

      // 生成 PDF 内容（简化版本）
      let pdfContent = '%PDF-1.4\n';
      pdfContent += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
      pdfContent += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
      pdfContent += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n';

      // 添加内容
      let content = 'BT\n/F1 12 Tf\n50 750 Td\n';
      entries.forEach((entry, index) => {
        const text = this.formatEntryForExport(entry, options);
        content += `(${this.escapePDFText(text)}) Tj\n0 -20 Td\n`;

        // 报告进度
        if (onProgress) {
          onProgress(Math.round(((index + 1) / entries.length) * 100));
        }
      });
      content += 'ET\n';

      pdfContent += '4 0 obj\n<< /Length ' + content.length + ' >>\nstream\n';
      pdfContent += content;
      pdfContent += '\nendstream\nendobj\n';
      pdfContent += 'xref\n0 5\n0000000000 65535 f\n';
      pdfContent += '0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000214 00000 n\n';
      pdfContent += 'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + (pdfContent.length - 100) + '\n%%EOF';

      await RNFS.writeFile(filePath, pdfContent, 'utf8');
      this.exportedFiles.add(filePath);

      logger.info('PDF export completed', {filePath, entryCount: entries.length});
      return filePath;
    } catch (error) {
      logger.error('PDF export failed', {error});
      throw error;
    }
  }

  async exportToWord(
    entries: any[],
    options: ExportOptions = {},
  ): Promise<string> {
    try {
      await this.ensureExportDir();

      const {filename = `export_${Date.now()}`, onProgress} = options;
      const filePath = `${this.exportDir}/${filename}.docx`;

      // 生成 Word 内容（简化版本，实际应使用 docx 库）
      let wordContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      wordContent += '<document>\n';

      entries.forEach((entry, index) => {
        const text = this.formatEntryForExport(entry, options);
        wordContent += `<paragraph>${this.escapeXML(text)}</paragraph>\n`;

        if (onProgress) {
          onProgress(Math.round(((index + 1) / entries.length) * 100));
        }
      });

      wordContent += '</document>';

      await RNFS.writeFile(filePath, wordContent, 'utf8');
      this.exportedFiles.add(filePath);

      logger.info('Word export completed', {filePath, entryCount: entries.length});
      return filePath;
    } catch (error) {
      logger.error('Word export failed', {error});
      throw error;
    }
  }

  async exportToCSV(
    entries: any[],
    options: ExportOptions = {},
  ): Promise<string> {
    try {
      await this.ensureExportDir();

      const {filename = `export_${Date.now()}`, includeFields, onProgress} = options;
      const filePath = `${this.exportDir}/${filename}.csv`;

      // 确定字段
      const fields = includeFields || ['id', 'content', 'type', 'tags', 'mood', 'createdAt'];

      // 生成 CSV 头
      let csvContent = fields.join(',') + '\n';

      // 生成 CSV 行
      entries.forEach((entry, index) => {
        const row = fields.map(field => {
          const value = entry[field];
          if (Array.isArray(value)) {
            return `"${value.join(';')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvContent += row.join(',') + '\n';

        if (onProgress) {
          onProgress(Math.round(((index + 1) / entries.length) * 100));
        }
      });

      await RNFS.writeFile(filePath, csvContent, 'utf8');
      this.exportedFiles.add(filePath);

      logger.info('CSV export completed', {filePath, entryCount: entries.length});
      return filePath;
    } catch (error) {
      logger.error('CSV export failed', {error});
      throw error;
    }
  }

  async exportToJSON(
    entries: any[],
    options: ExportOptions = {},
  ): Promise<string> {
    try {
      await this.ensureExportDir();

      const {filename = `export_${Date.now()}`, includeFields, onProgress} = options;
      const filePath = `${this.exportDir}/${filename}.json`;

      // 过滤字段
      let data = entries;
      if (includeFields) {
        data = entries.map(entry => {
          const filtered: any = {};
          includeFields.forEach(field => {
            filtered[field] = entry[field];
          });
          return filtered;
        });
      }

      const jsonContent = JSON.stringify(data, null, 2);
      await RNFS.writeFile(filePath, jsonContent, 'utf8');
      this.exportedFiles.add(filePath);

      if (onProgress) {
        onProgress(100);
      }

      logger.info('JSON export completed', {filePath, entryCount: entries.length});
      return filePath;
    } catch (error) {
      logger.error('JSON export failed', {error});
      throw error;
    }
  }

  async listExportFiles(): Promise<string[]> {
    try {
      await this.ensureExportDir();
      const files = await RNFS.readDir(this.exportDir);
      return files.map(file => file.path);
    } catch (error) {
      logger.error('List export files failed', {error});
      return [];
    }
  }

  async deleteExportFile(filePath: string): Promise<void> {
    try {
      await RNFS.unlink(filePath);
      this.exportedFiles.delete(filePath);
      logger.info('Export file deleted', {filePath});
    } catch (error) {
      logger.error('Delete export file failed', {error});
      throw error;
    }
  }

  async clearExportCache(): Promise<void> {
    try {
      const files = await this.listExportFiles();
      for (const file of files) {
        await RNFS.unlink(file);
      }
      this.exportedFiles.clear();
      logger.info('Export cache cleared');
    } catch (error) {
      logger.error('Clear export cache failed', {error});
      throw error;
    }
  }

  private formatEntryForExport(entry: any, options: ExportOptions): string {
    const {includeFields} = options;

    if (includeFields) {
      return includeFields.map(field => `${field}: ${entry[field]}`).join('\n');
    }

    return `
ID: ${entry.id}
Type: ${entry.type}
Content: ${entry.content}
Tags: ${Array.isArray(entry.tags) ? entry.tags.join(', ') : entry.tags}
Mood: ${entry.mood || 'N/A'}
Location: ${entry.location || 'N/A'}
Created: ${new Date(entry.createdAt).toLocaleString()}
    `.trim();
  }

  private escapePDFText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const exportService = new ExportService();

