import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIDEBAR_MENU_ITEMS, type SidebarAction } from './sidebarConfig';
import { sidebarStyles as styles } from './Sidebar.styles';

interface SidebarPanelProps {
  testID?: string;
  headerTopPadding: number;
  footerBottomPadding: number;
  onClose: () => void;
  onPressMenuItem: (action: SidebarAction) => void;
}

export function SidebarPanel({
  testID,
  headerTopPadding,
  footerBottomPadding,
  onClose,
  onPressMenuItem,
}: SidebarPanelProps) {
  return (
    <View testID={testID} style={styles.container}>
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>菜单</Text>
          <Text style={styles.headerSubtitle}>快速进入统计、同步和系统设置</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#4A4A4A" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuList}>
        {SIDEBAR_MENU_ITEMS.map((item) => (
          <React.Fragment key={item.action}>
            {item.dividerBefore ? <View style={styles.divider} /> : null}
            <TouchableOpacity
              testID={`sidebar-menu-${item.action}`}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => onPressMenuItem(item.action)}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon} size={22} color={item.iconColor} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>{item.label}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <View style={styles.menuChevronContainer}>
                <Ionicons name="chevron-forward" size={16} color="#C8CFDB" />
              </View>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      <View testID="sidebar-footer" style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
        <Text style={styles.versionText}>DayCapsule v1.0.0</Text>
      </View>
    </View>
  );
}
