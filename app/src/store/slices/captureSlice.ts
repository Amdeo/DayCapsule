import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import {databaseService, LifelogEntry} from '@services/storage/database';
import {fileSystemService} from '@services/storage/fileSystem';
import {locationService} from '@services/location';

export interface CaptureState {
  isCapturing: boolean;
  currentEntry: Partial<LifelogEntry> | null;
  recentEntries: LifelogEntry[];
  error: string | null;
  loading: boolean;
}

const initialState: CaptureState = {
  isCapturing: false,
  currentEntry: null,
  recentEntries: [],
  error: null,
  loading: false,
};

/**
 * 创建照片记录
 */
export const createPhotoEntry = createAsyncThunk(
  'capture/createPhotoEntry',
  async (
    {photoPath, content, tags}: {photoPath: string; content: string; tags: string[]},
    {rejectWithValue},
  ) => {
    try {
      // 保存照片文件
      const savedPhotoPath = await fileSystemService.savePhoto(photoPath);

      // 获取位置信息
      const location = await locationService.getCurrentLocationWithAddress();

      // 创建数据库记录
      const entryId = await databaseService.insertEntry({
        type: 'photo',
        content,
        timestamp: Date.now(),
        location: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address,
            }
          : undefined,
        tags,
        mediaPath: savedPhotoPath,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 获取完整记录
      const entries = await databaseService.getEntries(1, 0);
      return entries[0];
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 创建文字记录
 */
export const createTextEntry = createAsyncThunk(
  'capture/createTextEntry',
  async ({content, tags}: {content: string; tags: string[]}, {rejectWithValue}) => {
    try {
      // 获取位置信息
      const location = await locationService.getCurrentLocationWithAddress();

      // 创建数据库记录
      const entryId = await databaseService.insertEntry({
        type: 'text',
        content,
        timestamp: Date.now(),
        location: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address,
            }
          : undefined,
        tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 获取完整记录
      const entries = await databaseService.getEntries(1, 0);
      return entries[0];
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 创建语音记录
 */
export const createVoiceEntry = createAsyncThunk(
  'capture/createVoiceEntry',
  async (
    {
      voicePath,
      duration,
      content,
      tags,
      transcriptionLanguage,
      transcriptionConfidence,
    }: {
      voicePath: string;
      duration: number;
      content: string;
      tags: string[];
      transcriptionLanguage?: string;
      transcriptionConfidence?: number;
    },
    {rejectWithValue},
  ) => {
    try {
      // 保存语音文件
      const savedVoicePath = await fileSystemService.saveVoice(voicePath);

      // 获取位置信息
      const location = await locationService.getCurrentLocationWithAddress();

      // 创建数据库记录
      const entryId = await databaseService.insertEntry({
        type: 'voice',
        content,
        timestamp: Date.now(),
        location: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address,
            }
          : undefined,
        tags,
        mediaPath: savedVoicePath,
        voiceDuration: duration,
        transcription: content, // 保存转录文本
        transcriptionLanguage: transcriptionLanguage || 'zh-CN',
        transcriptionConfidence: transcriptionConfidence,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 获取完整记录
      const entries = await databaseService.getEntries(1, 0);
      return entries[0];
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * 加载最近的记录
 */
export const loadRecentEntries = createAsyncThunk(
  'capture/loadRecentEntries',
  async (limit: number = 10, {rejectWithValue}) => {
    try {
      const entries = await databaseService.getEntries(limit, 0);
      return entries;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

const captureSlice = createSlice({
  name: 'capture',
  initialState,
  reducers: {
    startCapture: state => {
      state.isCapturing = true;
      state.error = null;
    },
    cancelCapture: state => {
      state.isCapturing = false;
      state.currentEntry = null;
      state.error = null;
    },
    updateCurrentEntry: (state, action) => {
      state.currentEntry = {
        ...state.currentEntry,
        ...action.payload,
      };
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // createPhotoEntry
    builder
      .addCase(createPhotoEntry.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPhotoEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.isCapturing = false;
        state.currentEntry = null;
        state.recentEntries = [action.payload, ...state.recentEntries];
      })
      .addCase(createPhotoEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // createTextEntry
    builder
      .addCase(createTextEntry.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTextEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.isCapturing = false;
        state.currentEntry = null;
        state.recentEntries = [action.payload, ...state.recentEntries];
      })
      .addCase(createTextEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // createVoiceEntry
    builder
      .addCase(createVoiceEntry.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVoiceEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.isCapturing = false;
        state.currentEntry = null;
        state.recentEntries = [action.payload, ...state.recentEntries];
      })
      .addCase(createVoiceEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // loadRecentEntries
    builder
      .addCase(loadRecentEntries.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRecentEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.recentEntries = action.payload;
      })
      .addCase(loadRecentEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {startCapture, cancelCapture, updateCurrentEntry, clearError} = captureSlice.actions;

export default captureSlice.reducer;
