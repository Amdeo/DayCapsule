#!/usr/bin/env node
// Claude Code Hook: 图片分析自动触发
// 当用户提示词中包含图片时，通过 stdout 注入分析指令

const fs = require('fs');
const path = require('path');

// 读取 stdin 输入
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = data.prompt || data.text || '';

    // 检测图片标记
    const hasImage = detectImage(prompt);

    if (hasImage) {
      // 通过 stdout 输出注入指令
      const injected = `
重要指令：检测到图片，请优先使用 MCP 工具 'mcp__minimax__understand_image' 分析图片。
不要直接描述图片，而是先调用该工具获取专业分析结果，然后基于结果回复。
工具用法：understand_image(image_source: "图片路径或URL", prompt: "详细描述图片内容并识别物体")
`.trim();
      console.log(injected);
    }

    process.exit(0);
  } catch (error) {
    process.exit(0); // 出错时不阻塞
  }
});

/**
 * 检测图片标记
 * @param {string} text
 * @returns {boolean}
 */
function detectImage(text) {
  // 图片扩展名
  const extPattern = /\.(png|jpg|jpeg|webp|bmp|gif|tiff)(\?.*)?$/i;
  // @ 引用
  const atPattern = /@[^\s"'\]]+\.(png|jpg|jpeg|webp|bmp|gif|tiff)/i;
  // URL
  const urlPattern = /https?:\/\/[^\s"<\)]+\.(png|jpg|jpeg|webp|bmp|gif|tiff)/i;
  // Claude Code 图片标记
  const imageTagPattern = /\[IMAGE\s*#?\d+\]/i;

  return extPattern.test(text) ||
         atPattern.test(text) ||
         urlPattern.test(text) ||
         imageTagPattern.test(text);
}
