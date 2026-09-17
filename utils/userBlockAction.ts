import { Alert } from 'react-native';
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
    'Block user?',
    `${displayName} will not be able to message you.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(userId);
            onBlocked();
            Alert.alert('Blocked', 'This user has been blocked.');
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Could not block user');
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
    Alert.alert('Unblocked', 'You can message this user again.');
  } catch (error: any) {
    Alert.alert('Error', error.response?.data?.message || 'Could not unblock user');
  }
}
