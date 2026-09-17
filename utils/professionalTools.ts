import { Alert } from 'react-native';

export const PROFESSIONAL_TOOLS_INACTIVE_TITLE = 'Professional tools are not active';

export const PROFESSIONAL_TOOLS_INACTIVE_MESSAGE =
  'Professional tools are not active. Subscription and payment options are unavailable in the app right now.';

/** Show a simple notice wherever the app used to open subscription/payment. */
export function showProfessionalToolsInactive() {
  Alert.alert(PROFESSIONAL_TOOLS_INACTIVE_TITLE, PROFESSIONAL_TOOLS_INACTIVE_MESSAGE);
}
