/**
 * Shared user and auth types
 */

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type UserLocationDetails = {
  address?: string;
  city?: string;
  state?: string;
  district?: string;
  pincode?: string;
  coordinates?: [number, number];
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  locationDetails?: UserLocationDetails | null;
  isWorker?: boolean;
  /** Saved app language; null for accounts that have not stored one yet */
  language?: 'en' | 'hi' | null;
  isVerified?: boolean;
  /** Phone OTP verified during registration */
  verified?: boolean;
  profilePicture?: string | null;
  verificationStatus?: VerificationStatus;
  canVerify?: boolean;
  subscription?: {
    plan?: 'free' | 'pro' | 'business';
    status?: string;
  };
  quota?: {
    plan: 'free' | 'pro' | 'business';
    subscriptionPostsUsed: number;
    subscriptionPostsRemaining: number;
    postLimit: number;
    subscriptionFeaturesUsed: number;
    subscriptionFeaturesRemaining: number;
    featuredLimit: number;
    extraPostCredits: number;
    extraFeatureCredits: number;
    videoPostCredits: number;
  };
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignUpCredentials = {
  name: string;
  phone?: string;
  email: string;
  password: string;
};

export type SendOtpPayload = {
  phone: string;
  purpose: 'login' | 'register';
  name?: string;
  email?: string;
};

export type VerifyOtpPayload = {
  phone: string;
  otp: string;
  name?: string;
  email?: string;
};


