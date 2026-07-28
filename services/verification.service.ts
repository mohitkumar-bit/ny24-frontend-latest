import { Platform } from 'react-native';
import { api, postMultipart } from './api';
import { appendImageToFormData } from './formDataUpload';

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface VerificationInfo {
  isVerified: boolean;
  status: VerificationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  canReviewAt?: string;
  hoursUntilReview?: number;
  canSubmit?: boolean;
  eligible?: boolean;
}

async function buildVerificationFormData(
  selfieUri: string,
  aadhaarUri: string,
  panUri: string
) {
  const formData = new FormData();
  await appendImageToFormData(formData, 'selfie', selfieUri, 'selfie.jpg');
  await appendImageToFormData(formData, 'aadhaar', aadhaarUri, 'aadhaar.jpg');
  await appendImageToFormData(formData, 'pan', panUri, 'pan.jpg');
  return formData;
}

export const verificationService = {
  async getStatus() {
    const response = await api.get('/verification/status');
    return response.data.verification as VerificationInfo;
  },

  async getEligibility() {
    const response = await api.get('/verification/eligibility');
    return response.data as {
      eligible: boolean;
      message: string;
      verification: VerificationInfo;
    };
  },

  async submitDocuments(selfieUri: string, aadhaarUri: string, panUri: string) {
    // Native: use fetch multipart (axios FormData often drops files on Android/iOS).
    if (Platform.OS !== 'web') {
      return postMultipart('/verification/submit', () =>
        buildVerificationFormData(selfieUri, aadhaarUri, panUri)
      );
    }

    const formData = await buildVerificationFormData(selfieUri, aadhaarUri, panUri);
    const response = await api.post('/verification/submit', formData, {
      timeout: 120000,
    });
    return response.data;
  },
};

export const adminVerificationService = {
  async listPending(adminSecret: string) {
    const response = await api.get('/admin/verifications/pending', {
      headers: { 'x-admin-secret': adminSecret },
    });
    return response.data.pending;
  },

  async approve(userId: string, adminSecret: string) {
    const response = await api.post(
      `/admin/verifications/${userId}/approve`,
      {},
      { headers: { 'x-admin-secret': adminSecret } }
    );
    return response.data;
  },

  async reject(userId: string, adminSecret: string, reason?: string) {
    const response = await api.post(
      `/admin/verifications/${userId}/reject`,
      { reason },
      { headers: { 'x-admin-secret': adminSecret } }
    );
    return response.data;
  },
};
