import React from 'react';

export const Provider = ({children}) => <>{children}</>;

export const useDispatch = () => jest.fn();

export const useSelector = () => ({
  loading: false,
  recentEntries: [],
  error: null,
});

export const connect = () => Component => Component;
