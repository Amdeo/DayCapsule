#!/bin/bash

# Link react-native-vector-icons fonts to Xcode project

FONTS_DIR="../node_modules/react-native-vector-icons/Fonts"
TARGET_DIR="MemoryCapsule"

# Copy fonts to the app bundle
for font in "$FONTS_DIR"/*.ttf; do
    if [ -f "$font" ]; then
        cp "$font" "$TARGET_DIR/"
        echo "Copied $(basename "$font")"
    fi
done

echo "Font linking complete!"

