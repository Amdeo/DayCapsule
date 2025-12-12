/**
 * Redux hooks
 */

import {useDispatch, useSelector as useAppSelectorOriginal} from 'react-redux';
import {AppDispatch, RootState} from './index';

// 类型安全的hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T) => useAppSelectorOriginal(selector);

// 导出默认hooks
export {useDispatch, useSelector} from 'react-redux';