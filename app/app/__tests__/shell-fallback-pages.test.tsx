import React from 'react';
import { render } from '@testing-library/react-native';
import TabTwoScreen from '../(tabs)/two';
import NotFoundScreen from '../+not-found';
import ModalScreen from '../modal';

jest.mock('expo-router', () => {
  const Link = ({ children }: { children: React.ReactNode }) => children;
  const Stack = {
    Screen: () => null,
  };

  return { Link, Stack };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@/components/EditScreenInfo', () => ({
  __esModule: true,
  default: () => null,
}));

describe('shell fallback pages', () => {
  it('renders tab two page shell with baseline text', () => {
    const screen = render(<TabTwoScreen />);

    expect(screen.getByTestId('tab-two-root')).toBeTruthy();
    expect(screen.getByText('Tab Two')).toBeTruthy();
  });

  it('renders not-found page shell with baseline text', () => {
    const screen = render(<NotFoundScreen />);

    expect(screen.getByTestId('not-found-root')).toBeTruthy();
    expect(screen.getByText("This screen doesn't exist.")).toBeTruthy();
    expect(screen.getByText('Go to home screen!')).toBeTruthy();
  });

  it('renders modal page shell with baseline text', () => {
    const screen = render(<ModalScreen />);

    expect(screen.getByTestId('modal-root')).toBeTruthy();
    expect(screen.getByText('Modal')).toBeTruthy();
  });
});
