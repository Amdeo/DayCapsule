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
        primary: '#6200ee',
        secondary: '#03dac6',
        background: '#121212',
        surface: '#1e1e1e',
        error: '#cf6679',
      },
    },
  },
  plugins: [],
}
