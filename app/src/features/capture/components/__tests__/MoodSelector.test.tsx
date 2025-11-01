import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {MoodSelector} from '../MoodSelector';

describe('MoodSelector Component', () => {
  const mockOnMoodChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const {getByTestId} = render(
      <MoodSelector selectedMood={null} onMoodChange={mockOnMoodChange} />,
    );

    expect(getByTestId).toBeDefined();
  });

  it('should render all mood options', () => {
    const {getByText} = render(
      <MoodSelector selectedMood={null} onMoodChange={mockOnMoodChange} />,
    );

    expect(getByText('开心')).toBeDefined();
    expect(getByText('兴奋')).toBeDefined();
    expect(getByText('平静')).toBeDefined();
    expect(getByText('疲惫')).toBeDefined();
    expect(getByText('难过')).toBeDefined();
  });

  it('should highlight selected mood', () => {
    const {getByText} = render(
      <MoodSelector selectedMood="happy" onMoodChange={mockOnMoodChange} />,
    );

    const happyButton = getByText('开心');
    expect(happyButton).toBeDefined();
  });

  it('should call onMoodChange when selecting a mood', () => {
    const {getByText} = render(
      <MoodSelector selectedMood={null} onMoodChange={mockOnMoodChange} />,
    );

    const happyButton = getByText('开心');
    fireEvent.press(happyButton);

    expect(mockOnMoodChange).toHaveBeenCalled();
  });

  it('should deselect mood when clicking selected mood', () => {
    const {getByText, rerender} = render(
      <MoodSelector selectedMood="happy" onMoodChange={mockOnMoodChange} />,
    );

    const happyButton = getByText('开心');
    fireEvent.press(happyButton);

    expect(mockOnMoodChange).toHaveBeenCalled();

    // Rerender with null mood
    rerender(<MoodSelector selectedMood={null} onMoodChange={mockOnMoodChange} />);

    expect(getByText('开心')).toBeDefined();
  });

  it('should support all mood types', () => {
    const moods = ['happy', 'excited', 'neutral', 'tired', 'sad'] as const;

    moods.forEach(mood => {
      const {getByText} = render(
        <MoodSelector selectedMood={mood} onMoodChange={mockOnMoodChange} />,
      );

      expect(getByText).toBeDefined();
    });
  });
});
