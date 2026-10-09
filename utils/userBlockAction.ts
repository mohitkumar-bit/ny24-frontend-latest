import { Alert } from 'react-native';
import i18n from '@/i18n';
import { blockUser, getBlockStatus, unblockUser } from '@/services/chat.service';

export async function refreshBlockStatus(userId: string) {
  const status = await getBlockStatus(userId);
  return status.blockedByMe;
}

export function confirmBlockUser(
  userId: string,
  displayName: string,
  onBlocked: () => void
) {
  Alert.alert(
    i18n.t('block.confirmTitle'),
    i18n.t('block.confirmMessage', { name: displayName }),
    [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.block'),
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(userId);
            onBlocked();
            Alert.alert(i18n.t('block.blockedTitle'), i18n.t('block.blockedMessage'));
          } catch (error: any) {
            Alert.alert(
              i18n.t('common.error'),
              error.response?.data?.message || i18n.t('block.blockFailed')
            );
          }
        },
      },
    ]
  );
}

export async function unblockUserWithAlert(userId: string, onUnblocked: () => void) {
  try {
    await unblockUser(userId);
    onUnblocked();
    Alert.alert(i18n.t('block.unblockedTitle'), i18n.t('block.unblockedMessage'));
  } catch (error: any) {
    Alert.alert(
      i18n.t('common.error'),
      error.response?.data?.message || i18n.t('block.unblockFailed')
    );
  }
}
