import React from 'react';
import {View, StyleSheet} from 'react-native';
import {List} from 'react-native-paper';

export const SettingsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <List.Section>
        <List.Subheader>应用设置</List.Subheader>
        <List.Item
          title="主题"
          description="浅色 / 深色 / 跟随系统"
          left={(props: any) => <List.Icon {...props} icon="theme-light-dark" />}
        />
        <List.Item
          title="权限管理"
          description="相机、位置、麦克风"
          left={(props: any) => <List.Icon {...props} icon="shield-account" />}
        />
        <List.Item
          title="隐私与安全"
          description="数据加密、生物识别"
          left={(props: any) => <List.Icon {...props} icon="lock" />}
        />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
