import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react-native';
import {PaperProvider} from 'react-native-paper';
import {EntryDetail} from '../EntryDetail';
import type {LifelogEntry} from '@services/storage/database';
import * as databaseService from '@services/storage/database';
import * as fileSystemService from '@services/storage/fileSystem';

// Mock services
jest.mock('@services/storage/database');
jest.mock('@services/storage/fileSystem');
jest.mock('@hooks/useTranscription', () => ({
  useTranscription: () => ({
    transcribe: jest.fn().mockResolvedValue({text: 'Transcribed text', confidence: 0.95}),
    isTranscribing: false,
    progress: 0,
    cancel: jest.fn(),
    reset: jest.fn(),
  }),
}));

const mockEntry: LifelogEntry = {
  id: '1',
  type: 'voice',
  content: 'Test content',
  tags: ['tag1', 'tag2'],
  timestamp: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  voiceDuration: 30,
  mediaPath: '/path/to/audio.m4a',
};

const mockPhotoEntry: LifelogEntry = {
  id: '2',
  type: 'photo',
  content: 'Photo content',
  tags: [],
  timestamp: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  mediaPath: '/path/to/photo.jpg',
  thumbnailPath: '/path/to/thumbnail.jpg',
};

describe('EntryDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders voice entry with retranscribe button', () => {
    render(
      <PaperProvider>
        <EntryDetail entry={mockEntry} onClose={jest.fn()} />
      </PaperProvider>,
    );

    expect(screen.getByText('语音记录')).toBeTruthy();
    expect(screen.getByTestId('retranscribe-button')).toBeTruthy();
  });

  it('renders photo entry without retranscribe button', () => {
    render(
      <PaperProvider>
        <EntryDetail entry={mockPhotoEntry} onClose={jest.fn()} />
      </PaperProvider>,
    );

    expect(screen.getByText('照片记录')).toBeTruthy();
    expect(screen.queryByTestId('retranscribe-button')).toBeFalsy();
  });

  it('shows edit transcription button for voice entries', () => {
    render(
      <PaperProvider>
        <EntryDetail entry={mockEntry} onClose={jest.fn()} />
      </PaperProvider>,
    );

    expect(screen.getByTestId('edit-transcription-button')).toBeTruthy();
  });

  it('opens transcription editor when edit button is pressed', async () => {
    render(
      <PaperProvider>
        <EntryDetail entry={mockEntry} onClose={jest.fn()} />
      </PaperProvider>,
    );

    const editButton = screen.getByTestId('edit-transcription-button');
    fireEvent.press(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('transcription-editor-dialog')).toBeTruthy();
    });
  });

  it('calls onClose when back button is pressed', () => {
    const onClose = jest.fn();
    render(
      <PaperProvider>
        <EntryDetail entry={mockEntry} onClose={onClose} />
      </PaperProvider>,
    );

    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('shows delete confirmation dialog when delete button is pressed', async () => {
    render(
      <PaperProvider>
        <EntryDetail entry={mockEntry} onClose={jest.fn()} />
      </PaperProvider>,
    );

    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm-dialog')).toBeTruthy();
    });
  });

  it('displays entry content', () => {
    render(
      <PaperProvider>
        <EntryDetail entry={mockEntry} onClose={jest.fn()} />
      </PaperProvider>,
    );

    expect(screen.getByText('Test content')).toBeTruthy();
  });

  it('displays entry tags section', () => {
    render(
      <PaperProvider>
        <EntryDetail entry={mockEntry} onClose={jest.fn()} />
      </PaperProvider>,
    );

    // Check if tags section exists
    const tagsSection = screen.queryByText('标签');
    expect(tagsSection).toBeTruthy();
  });
});
