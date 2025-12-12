# Architecture Overview

## Project Vision

MemoryCapsule is a powerful React Native life-logging application that supports multi-modal recording (photo, voice, text), timeline review, intelligent search, and AI-powered tagging. Built with TypeScript + Redux Toolkit, using SQLite for local storage, focusing on performance and privacy.

## Technology Stack

- **Framework**: React Native 0.74 + TypeScript 5.x
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation 6
- **Database**: SQLite (react-native-sqlite-storage) + FTS5 full-text search
- **UI Library**: React Native Paper
- **Encryption**: AES-256-GCM
- **Speech Recognition**: Tencent Cloud ASR
- **Image Recognition**: Baidu EasyDL TensorFlow Lite
- **Testing**: Jest + React Native Testing Library + Detox (E2E)

## Core Architecture Patterns

- **Feature-driven Architecture**: Organize code by business domain (capture, timeline, search, settings, etc.)
- **Layered Architecture**: Features → Services → Store → UI
- **Offline-first**: Local storage primary, cloud sync secondary
- **Performance-first**: Virtual scrolling, lazy loading, memory optimization

## Performance Requirements

- App startup < 2 seconds
- Search response < 2 seconds
- View transitions < 2 seconds
- Memory usage < 150MB
- Frame rate > 55fps
- All core operations response time < 2 seconds

## Data Flow Design

- Redux Toolkit manages global state
- Local state uses useState + useEffect
- Data persistence via SQLite + AsyncStorage
- Real-time data updates through Redux middleware
