export const REPORT_REASONS = [
  'Spam or misleading',
  'Scam or fraud',
  'Inappropriate content',
  'Fake profile or post',
  'Harassment',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
