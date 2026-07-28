import { api } from './api';

export const subscribeToPlan = async (planData: {
  plan: string;
  billingCycle: string;
  amount: number;
}) => {
  try {
    const response = await api.post('/subscription/subscribe', planData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || 'Failed to subscribe';
  }
};

export const createPhonePeOrder = async (plan: string) => {
  try {
    const response = await api.post('/subscription/create-order', { plan });
    return response.data as {
      merchantOrderId: string;
      checkoutUrl: string;
      amount: number;
      plan: string;
      billingCycle: string;
      months: number;
    };
  } catch (error: any) {
    throw error.response?.data?.message || 'Failed to start PhonePe payment';
  }
};

export const verifyPhonePeOrder = async (merchantOrderId: string) => {
  try {
    const response = await api.post('/subscription/verify-order', { merchantOrderId });
    return response.data as {
      status: 'success' | 'failed' | 'pending';
      state?: string;
      subscription?: any;
      transaction?: any;
      message?: string;
    };
  } catch (error: any) {
    throw error.response?.data?.message || 'Failed to verify payment';
  }
};

export const getSubscriptionStatus = async () => {
  try {
    const response = await api.get('/subscription/status');
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || 'Failed to fetch subscription status';
  }
};
