import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const useAutoSaveDraft = (key: string, initialValue: string = '') => {
  const [text, setText] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const debouncedText = useDebounce(text, 1000);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const savedDraft = await AsyncStorage.getItem(key);
        if (savedDraft !== null) {
          setText(savedDraft);
        }
      } catch (e) {
        console.error('Failed to load draft', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadDraft();
  }, [key]);

  useEffect(() => {
    if (!isLoaded) return;
    const saveDraft = async () => {
      try {
        await AsyncStorage.setItem(key, debouncedText);
      } catch (e) {
        console.error('Failed to save draft', e);
      }
    };
    saveDraft();
  }, [debouncedText, key, isLoaded]);

  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(key);
      setText('');
    } catch (e) {
      console.error('Failed to clear draft', e);
    }
  }, [key]);

  return { text, setText, clearDraft, isLoaded };
};
