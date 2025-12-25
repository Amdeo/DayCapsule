import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../app/App';

describe('App Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<App />);
    
    // 检查应用是否渲染
    expect(getByText('MemoryCapsule')).toBeTruthy();
  });
});
