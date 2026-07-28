import { Platform } from 'react-native';
import { api, postMultipart } from './api';
import { buildProfileImageFormData } from './formDataUpload';
import { forceLogout } from './authSession';
import { tokenStorage } from './tokenStorage';
import { registerAndSyncPushToken } from './pushRegistration';
import type { LoginCredentials, SignUpCredentials } from '@/types';

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post('/auth/login', credentials);

    const { accessToken, refreshToken, user } = response.data;

    await tokenStorage.setTokens(accessToken, refreshToken);

    registerAndSyncPushToken().catch(() => {});

    return user;
  },

  async signUp(credentials: SignUpCredentials) {
    const response = await api.post('/auth/register', credentials);

    const { accessToken, refreshToken, user } = response.data;

    await tokenStorage.setTokens(accessToken, refreshToken);

    registerAndSyncPushToken().catch(() => {});

    return user;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Token may already be invalid — still clear locally
    } finally {
      await forceLogout();
    }
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  async updateProfile(data: {
    name: string;
    phone: string;
    bio?: string;
    location?: string;
    locationData?: {
      address?: string;
      city?: string;
      state?: string;
      district?: string;
      pincode?: string;
      coordinates?: [number, number];
    };
  }) {
    const response = await api.patch('/auth/me', data);
    return response.data.user;
  },

  async uploadProfilePicture(uri: string) {
    if (Platform.OS === 'web') {
      const formData = await buildProfileImageFormData(uri);
      const response = await api.post('/auth/upload-profile-picture', formData, {
        timeout: 120000,
      });
      return response.data.user;
    }

    const data = await postMultipart<{ user: Awaited<ReturnType<typeof authService.getProfile>> }>(
      '/auth/upload-profile-picture',
      () => buildProfileImageFormData(uri)
    );
    return data.user;
  },

  async removeProfilePicture() {
    const response = await api.delete('/auth/profile-picture');
    return response.data.user;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },
};
