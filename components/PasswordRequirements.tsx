import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

const REQUIREMENTS: { key: keyof Omit<PasswordChecks, 'isValid'>; label: string }[] = [
  { key: 'hasMinLength', label: 'At least 6 characters' },
  { key: 'hasLowercase', label: 'One lowercase letter' },
  { key: 'hasUppercase', label: 'One uppercase letter' },
  { key: 'hasNumber', label: 'One number' },
  { key: 'hasSymbol', label: 'One symbol' },
];

function RequirementRow({ met, label }: { met: boolean; label: string }) {
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
  const checks = useMemo(() => getPasswordChecks(password), [password]);

  if (checks.isValid) return null;

  return (
    <View style={styles.container}>
      {REQUIREMENTS.map(({ key, label }) => (
        <RequirementRow key={key} met={checks[key]} label={label} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
