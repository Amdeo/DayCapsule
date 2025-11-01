import {renderHook, act, waitFor} from '@testing-library/react-native';
import {useTranscription} from '../useTranscription';
import {speechToTextService} from '@services/speechToText';

jest.mock('@services/speechToText');
jest.mock('@services/telemetry/logger');

describe('useTranscription', () => {
  const mockTranscriptionResult = {
    text: 'Test transcription',
    confidence: 95,
    language: 'zh-CN',
    duration: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (speechToTextService.isReady as jest.Mock).mockReturnValue(true);
  });

  it('should initialize with idle state', () => {
    const {result} = renderHook(() => useTranscription());

    expect(result.current.status).toBe('idle');
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should transcribe audio file successfully', async () => {
    (speechToTextService.transcribe as jest.Mock).mockResolvedValue(mockTranscriptionResult);

    const {result} = renderHook(() => useTranscription());

    await act(async () => {
      const transcriptionResult = await result.current.transcribe('/path/to/audio.m4a');
      expect(transcriptionResult).toEqual(mockTranscriptionResult);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('completed');
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.result).toEqual(mockTranscriptionResult);
    });
  });

  it('should handle transcription error', async () => {
    const mockError = new Error('Transcription failed');
    (speechToTextService.transcribe as jest.Mock).mockRejectedValue(mockError);

    const {result} = renderHook(() => useTranscription());

    await act(async () => {
      const transcriptionResult = await result.current.transcribe('/path/to/audio.m4a');
      expect(transcriptionResult).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should throw error if service not initialized', async () => {
    (speechToTextService.isReady as jest.Mock).mockReturnValue(false);

    const {result} = renderHook(() => useTranscription());

    await act(async () => {
      const transcriptionResult = await result.current.transcribe('/path/to/audio.m4a');
      expect(transcriptionResult).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should cancel transcription', async () => {
    (speechToTextService.transcribe as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(mockTranscriptionResult), 1000);
        }),
    );

    const {result} = renderHook(() => useTranscription());

    act(() => {
      result.current.transcribe('/path/to/audio.m4a');
    });

    await waitFor(() => {
      expect(result.current.isTranscribing).toBe(true);
    });

    act(() => {
      result.current.cancel();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.isTranscribing).toBe(false);
  });

  it('should reset state', async () => {
    (speechToTextService.transcribe as jest.Mock).mockResolvedValue(mockTranscriptionResult);

    const {result} = renderHook(() => useTranscription());

    await act(async () => {
      await result.current.transcribe('/path/to/audio.m4a');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('completed');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should update progress during transcription', async () => {
    (speechToTextService.transcribe as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(mockTranscriptionResult), 2000);
        }),
    );

    const {result} = renderHook(() => useTranscription());

    act(() => {
      result.current.transcribe('/path/to/audio.m4a');
    });

    await waitFor(() => {
      expect(result.current.progress).toBeGreaterThan(0);
    });
  });
});
