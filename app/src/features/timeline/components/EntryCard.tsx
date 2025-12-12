import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

// TODO: Define a proper Entry type from data-model.md
interface Entry {
  id: string;
  type: 'text' | 'photo' | 'voice';
  content: string;
  timestamp: number;
  media?: any; // PhotoFile | string (audio path) | PhotoFile[]
  location?: { address?: string };
  mood?: string;
  tags?: string[];
  thumbnailPath?: string;
}

interface EntryCardProps {
  entry: Entry;
  onPress: (entry: Entry) => void;
  testID?: string;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onPress, testID }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const getThumbnailSource = () => {
    if (entry.type === 'photo' && entry.media && Array.isArray(entry.media) && entry.media.length > 0) {
      return { uri: entry.media[0].uri };
    }
    if (entry.type === 'photo' && entry.media && typeof entry.media === 'object' && entry.media.uri) {
      return { uri: entry.media.uri };
    }
    if (entry.type === 'voice' && entry.thumbnailPath) {
      return { uri: entry.thumbnailPath }; // Placeholder for voice thumbnail
    }
    return null;
  };

  const thumbnailSource = getThumbnailSource();

  return (
    <TouchableOpacity onPress={() => onPress(entry)} style={styles.card} testID={testID}>
      {thumbnailSource && (
        <Image source={thumbnailSource} style={styles.thumbnail} />
      )}
      <View style={styles.contentContainer}>
        <Text style={styles.timestamp}>
          {new Date(entry.timestamp).toLocaleString()}
        </Text>
        {entry.location?.address && (
          <Text style={styles.location}>{entry.location.address}</Text>
        )}
        {entry.mood && (
          <Text style={styles.mood}>{entry.mood}</Text>
        )}
        <Text style={styles.content} numberOfLines={entry.media ? 2 : 5}>
          {entry.content}
        </Text>
        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {entry.tags.map(tag => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: theme.colors.surfaceVariant, // Placeholder background
    resizeMode: 'cover',
  },
  contentContainer: {
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  mood: {
    fontSize: 16,
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 12,
    color: theme.colors.primary,
    marginRight: 4,
    marginBottom: 4,
  },
});

export default EntryCard;