#!/bin/bash

# Simple script to run MemoryCapsule app on Android emulator

set -e

export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

echo "🚀 Starting MemoryCapsule on Android Emulator..."

# Step 1: Start emulator if not running
echo "📱 Checking emulator..."
EMULATOR_RUNNING=$(adb devices | grep -c "emulator" || true)

if [ "$EMULATOR_RUNNING" -eq 0 ]; then
  echo "Starting emulator..."
  $ANDROID_HOME/emulator/emulator -avd Pixel_5_API_33_arm -no-snapshot-load &
  sleep 60
fi

# Step 2: Wait for emulator to be ready
echo "⏳ Waiting for emulator to be ready..."
adb wait-for-device
sleep 10

# Step 3: Start Metro bundler
echo "📦 Starting Metro bundler..."
cd /Users/looper/Documents/code/work/cooper/MemoryCapsule/app
npm start -- --reset-cache &
METRO_PID=$!
sleep 40

# Step 4: Build and run app
echo "🔨 Building and running app..."
npm run android

echo "✅ App should be running now!"
echo "Press Ctrl+C to stop Metro bundler"

# Keep Metro running
wait $METRO_PID

