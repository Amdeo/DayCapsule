/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // 主色：柔和的蓝色
        primary: {
          DEFAULT: '#6A89CC',
          light: '#8BA3DC',
          dark: '#5570B5',
        },

        // 珊瑚色（用于强调和录音）
        coral: {
          DEFAULT: '#F5A68D',
          light: '#F7B8A3',
          dark: '#F39477',
        },

        // 照片：青色
        photo: {
          DEFAULT: '#77C9D4',
          light: '#92D4DD',
          dark: '#5CB6C3',
        },

        // 语音：橙色
        voice: {
          DEFAULT: '#F5A623',
          light: '#F7B749',
          dark: '#E09510',
        },

        // 文本：紫色
        text: {
          DEFAULT: '#A491D3',
          light: '#B6A7DC',
          dark: '#927BC4',
        },

        // 中性灰度
        neutral: {
          50: '#FAF8F5',   // 最浅背景
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D1D1D1',  // 边框
          400: '#A3A3A3',
          500: '#737373',
          600: '#4A4A4A',  // 文本
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },

        // 背景色
        background: {
          DEFAULT: '#FAF8F5',  // 米白色主背景
          elevated: '#FFFFFF', // 纯白
          card: '#FFFFFF',     // 卡片背景
        },

        // 语义化颜色
        success: '#10B981',
        warning: '#F5A623',
        error: '#EF4444',
      },
    },
  },
  plugins: [],
}
