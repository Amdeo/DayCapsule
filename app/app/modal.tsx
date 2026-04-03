import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View testID="modal-root" className="flex-1 items-center justify-center">
      <Text className="text-[20px] font-bold">Modal</Text>
      <StatusBar style={process.env.EXPO_OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
