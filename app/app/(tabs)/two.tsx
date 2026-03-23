import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';

export default function TabTwoScreen() {
  return (
    <View testID="tab-two-root" className="flex-1 items-center justify-center">
      <Text className="text-[20px] font-bold">Tab Two</Text>
      <View className="my-[30px] h-px w-4/5" lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/two.tsx" />
    </View>
  );
}
