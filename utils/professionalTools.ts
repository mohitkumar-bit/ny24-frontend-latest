import { Alert } from 'react-native';
import i18n from '@/i18n';

export const professionalToolsInactiveTitle = () => i18n.t('professionalTools.inactiveTitle');

export const professionalToolsInactiveMessage = () => i18n.t('professionalTools.inactiveMessage');

/** Show a simple notice wherever the app used to open subscription/payment. */
export function showProfessionalToolsInactive() {
  Alert.alert(professionalToolsInactiveTitle(), professionalToolsInactiveMessage());
}
