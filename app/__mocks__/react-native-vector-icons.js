import React from 'react';
import {View} from 'react-native';

export default ({name, size, color, ...props}) => <View {...props} testID={`icon-${name}`} />;
