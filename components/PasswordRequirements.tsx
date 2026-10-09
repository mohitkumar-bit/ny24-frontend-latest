import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useScriptStyles } from '@/hooks/useScriptStyles';
import type { TFunction } from 'i18next';

export type PasswordChecks = {
  hasMinLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isValid: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  const hasMinLength = password.length >= 6;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return {
    hasMinLength,
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSymbol,
    isValid:
      hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSymbol,
  };
}

const getRequirements = (t: TFunction): { key: keyof Omit<PasswordChecks, 'isValid'>; label: string }[] => [
  { key: 'hasMinLength', label: t('changePassword.requirements.minLength') },
  { key: 'hasLowercase', label: t('changePassword.requirements.lowercase') },
  { key: 'hasUppercase', label: t('changePassword.requirements.uppercase') },
  { key: 'hasNumber', label: t('changePassword.requirements.number') },
  { key: 'hasSymbol', label: t('changePassword.requirements.symbol') },
];

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  const styles = useScriptStyles(baseStyles);
  return (
    <View style={styles.row}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={17}
        color={met ? '#00A300' : '#CBD5E1'}
      />
      <Text style={[styles.label, met && styles.labelMet]}>{label}</Text>
    </View>
  );
}

export function PasswordRequirements({ password }: { password: string }) {
  const { t } = useTranslation();
  const styles = useScriptStyles(baseStyles);
  const checks = useMemo(() => getPasswordChecks(password), [password]);

  if (checks.isValid) return null;

  return (
    <View style={styles.container}>
      {getRequirements(t).map(({ key, label }) => (
        <RequirementRow key={key} met={checks[key]} label={label} />
      ))}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
  },
  labelMet: {
    color: '#166534',
    fontFamily: 'Inter_500Medium',
  },
});
