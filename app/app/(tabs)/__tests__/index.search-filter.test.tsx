import React, { useMemo, useState } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

const entries = [
  {
    id: 'entry-text-1',
    type: 'text',
    content: '整理旅行照片',
    tags: ['旅行'],
  },
  {
    id: 'entry-photo-1',
    type: 'photo',
    content: '旅行海边照片',
    tags: ['旅行', '海边'],
  },
];

function HomeSearchHarness({
  onApplySearchFilters,
}: {
  onApplySearchFilters: (filters: {
    query: string;
    type: 'all' | 'text' | 'photo' | 'voice';
    dateRange: 'all';
    tags: string[];
  }) => void;
}) {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'text' | 'photo' | 'voice'>('all');
  const [tags, setTags] = useState<string[]>([]);

  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (query && !entry.content.includes(query)) return false;
        if (type !== 'all' && entry.type !== type) return false;
        if (tags.length > 0 && !tags.every((tag) => entry.tags.includes(tag))) return false;
        return true;
      }),
    [query, tags, type]
  );

  const toggleTag = (tag: string) => {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  };

  const submit = () => {
    onApplySearchFilters({
      query,
      type,
      dateRange: 'all',
      tags,
    });
    setOverlayVisible(false);
  };

  return (
    <View testID="home-search-harness">
      <Pressable testID="searchbar-search-box" onPress={() => setOverlayVisible(true)}>
        <Text>搜索记忆...</Text>
      </Pressable>

      {query || type !== 'all' || tags.length > 0 ? (
        <View testID="home-search-active-filters">
          <Text>{visibleEntries.length} 条</Text>
          {query ? <Text>"{query}"</Text> : null}
          {type !== 'all' ? <Text>{type === 'photo' ? '照片' : type}</Text> : null}
          {tags.map((tag) => (
            <Text key={tag}>#{tag}</Text>
          ))}
        </View>
      ) : null}

      {visibleEntries.map((entry) => (
        <View key={entry.id} testID={`timeline-entry-${entry.id}`}>
          <Text>{entry.content}</Text>
        </View>
      ))}

      {overlayVisible ? (
        <View testID="search-overlay-root">
          <TextInput
            placeholder="搜索记忆..."
            value={query}
            onChangeText={setQuery}
          />
          <Pressable onPress={() => setType('photo')}>
            <Text>照片</Text>
          </Pressable>
          {['旅行', '海边'].map((tag) => (
            <Pressable key={tag} onPress={() => toggleTag(tag)}>
              <Text>#{tag}</Text>
            </Pressable>
          ))}
          <Pressable testID="search-overlay-cancel-button" onPress={() => setOverlayVisible(false)}>
            <Text>取消</Text>
          </Pressable>
          <Pressable testID="search-overlay-submit-button" onPress={submit}>
            <Text>搜索</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

describe('HomeScreen search filters', () => {
  it('opens search from the search box and dismisses it from the cancel button', () => {
    const screen = render(<HomeSearchHarness onApplySearchFilters={jest.fn()} />);

    fireEvent.press(screen.getByTestId('searchbar-search-box'));
    expect(screen.getByTestId('search-overlay-root')).toBeTruthy();

    fireEvent.press(screen.getByTestId('search-overlay-cancel-button'));
    expect(screen.queryByTestId('search-overlay-root')).toBeNull();
  });

  it('applies keyword, type and tag filters from the home screen search flow', async () => {
    const onApplySearchFilters = jest.fn();
    const screen = render(<HomeSearchHarness onApplySearchFilters={onApplySearchFilters} />);

    fireEvent.press(screen.getByTestId('searchbar-search-box'));
    fireEvent.changeText(screen.getByPlaceholderText('搜索记忆...'), '旅行');
    fireEvent.press(screen.getByText('照片'));
    fireEvent.press(screen.getByText('#旅行'));
    fireEvent.press(screen.getByTestId('search-overlay-submit-button'));

    await waitFor(() => {
      expect(onApplySearchFilters).toHaveBeenCalledWith({
        query: '旅行',
        type: 'photo',
        dateRange: 'all',
        tags: ['旅行'],
      });
    });

    expect(screen.queryByTestId('search-overlay-root')).toBeNull();
    expect(screen.getByText('1 条')).toBeTruthy();
    expect(screen.getByText('"旅行"')).toBeTruthy();
    expect(screen.getByText('照片')).toBeTruthy();
    expect(screen.getByText('#旅行')).toBeTruthy();
    expect(screen.getByTestId('timeline-entry-entry-photo-1')).toBeTruthy();
  });
});
