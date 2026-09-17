import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ReportOptionsMenuProps = {
  onReport: () => void;
  onBlock?: () => void;
  onMenuOpen?: () => void;
  blockedByMe?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
  iconColor?: string;
  iconSize?: number;
  reportLabel?: string;
  align?: 'left' | 'right';
};

export function ReportOptionsMenu({
  onReport,
  onBlock,
  onMenuOpen,
  blockedByMe = false,
  buttonStyle,
  iconColor = '#64748B',
  iconSize = 22,
  reportLabel = 'Report',
  align = 'right',
}: ReportOptionsMenuProps) {
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [menuLayout, setMenuLayout] = useState({ top: 0, left: 0, width: 160 });

  const closeMenu = () => setVisible(false);

  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      const dropdownWidth = 160;
      const left =
        align === 'right'
          ? Math.min(Math.max(12, x + width - dropdownWidth), screenWidth - dropdownWidth - 12)
          : Math.min(Math.max(12, x), screenWidth - dropdownWidth - 12);

      setMenuLayout({
        top: y + height + 6,
        left,
        width: dropdownWidth,
      });
      setVisible(true);
      onMenuOpen?.();
    });
  };

  const handleReport = () => {
    closeMenu();
    onReport();
  };

  const handleBlock = () => {
    closeMenu();
    onBlock?.();
  };

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.menuBtn, buttonStyle]}
          onPress={openMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={iconSize} color={iconColor} />
        </TouchableOpacity>
      </View>

      {visible ? (
        <Modal visible transparent animationType="fade" onRequestClose={closeMenu}>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMenu} />
            <View
              style={[
                styles.dropdown,
                {
                  top: menuLayout.top,
                  left: menuLayout.left,
                  width: menuLayout.width,
                },
              ]}
            >
              <TouchableOpacity style={styles.dropdownItem} onPress={handleReport}>
                <Ionicons name="flag-outline" size={18} color="#FF9500" />
                <Text style={styles.dropdownItemText}>{reportLabel}</Text>
              </TouchableOpacity>
              {onBlock ? (
                <>
                  <View style={styles.divider} />
                  <TouchableOpacity style={styles.dropdownItem} onPress={handleBlock}>
                    <Ionicons
                      name={blockedByMe ? 'checkmark-circle-outline' : 'ban-outline'}
                      size={18}
                      color={blockedByMe ? '#00A300' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        blockedByMe ? styles.unblockText : styles.blockText,
                      ]}
                    >
                      {blockedByMe ? 'Unblock' : 'Block'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  blockText: {
    color: '#EF4444',
  },
  unblockText: {
    color: '#00A300',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 10,
  },
});
