import { StyleSheet } from 'react-native';

export const loginPageStyles = StyleSheet.create({
  form: {
    paddingTop: 24,
    gap: 16,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#4A4A4A',
  },
  hint: {
    fontSize: 12,
    color: '#A3A3A3',
    paddingHorizontal: 4,
  },
  button: {
    backgroundColor: '#6A89CC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#D1D1D1',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 14,
    color: '#6A89CC',
  },
});
