import { StyleSheet } from 'react-native';

export const errorBoundaryStyles = StyleSheet.create({
  button: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#121212',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});
