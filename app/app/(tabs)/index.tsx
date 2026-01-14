import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useState } from 'react';
import { useEntryStore } from '@/src/store/entryStore';

export default function HomeScreen() {
  const { entries, addEntry, deleteEntry } = useEntryStore();
  const [newEntry, setNewEntry] = useState('');

  const handleAddEntry = () => {
    if (newEntry.trim()) {
      addEntry({
        type: 'text',
        content: newEntry.trim(),
      });
      setNewEntry('');
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-16 pb-6 bg-surface">
        <Text className="text-3xl font-bold text-white">
          📝 MemoryCapsule
        </Text>
        <Text className="text-gray-400 mt-2">
          使用最新技术栈 ✨
        </Text>
      </View>

      {/* Add Entry Section */}
      <View className="px-6 py-4 bg-surface border-b border-gray-800">
        <View className="flex-row gap-3">
          <TextInput
            className="flex-1 bg-background text-white px-4 py-3 rounded-xl"
            placeholder="写下你的想法..."
            placeholderTextColor="#666"
            value={newEntry}
            onChangeText={setNewEntry}
          />
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-xl justify-center"
            onPress={handleAddEntry}
          >
            <Text className="text-white font-semibold">添加</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Entries List */}
      <ScrollView className="flex-1 px-6 py-4">
        {entries.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-6xl mb-4">🎯</Text>
            <Text className="text-gray-400 text-center">
              还没有记录{'\n'}添加你的第一条记录吧！
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View
              key={entry.id}
              className="bg-surface p-4 rounded-2xl mb-3 border border-gray-800"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-xs text-gray-500">
                  {new Date(entry.timestamp).toLocaleString('zh-CN')}
                </Text>
                <TouchableOpacity
                  onPress={() => deleteEntry(entry.id)}
                  className="px-3 py-1 bg-error/20 rounded-lg"
                >
                  <Text className="text-error text-xs">删除</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-white text-base leading-6">
                {entry.content}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Tech Stack Badge */}
      <View className="px-6 py-3 bg-surface border-t border-gray-800">
        <Text className="text-xs text-center text-gray-500">
          Expo SDK 54 • React Native 0.81 • Zustand • NativeWind
        </Text>
      </View>
    </View>
  );
}
