import i18n from '@/i18n';

export const REPORT_REASONS = [
  'Spam or misleading',
  'Scam or fraud',
  'Inappropriate content',
  'Fake profile or post',
  'Harassment',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export function reportReasonLabel(reason: ReportReason): string {
  switch (reason) {
    case 'Spam or misleading':
      return i18n.t('report.reasons.spamOrMisleading');
    case 'Scam or fraud':
      return i18n.t('report.reasons.scamOrFraud');
    case 'Inappropriate content':
      return i18n.t('report.reasons.inappropriateContent');
    case 'Fake profile or post':
      return i18n.t('report.reasons.fakeProfileOrPost');
    case 'Harassment':
      return i18n.t('report.reasons.harassment');
    case 'Other':
      return i18n.t('report.reasons.other');
    default:
      return reason;
  }
}
