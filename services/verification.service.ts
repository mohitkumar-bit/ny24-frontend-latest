import { api } from './api';

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

  async sendAadhaarOtp(aadhaarNumber: string) {
    const response = await api.post('/verification/aadhaar/send-otp', {
      aadhaar_number: aadhaarNumber,
    });
    return response.data as {
      success: boolean;
      message: string;
      maskedAadhaar?: string;
      expiresAt?: string;
    };
  },

  async verifyAadhaarAndSubmit(aadhaarNumber: string, otp: string) {
    const response = await api.post('/verification/aadhaar/verify', {
      aadhaar_number: aadhaarNumber,
      otp,
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
