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
  isVerified?: boolean;
  profilePicture?: string | null;
  verificationStatus?: VerificationStatus;
  canVerify?: boolean;
  subscription?: {
    plan?: 'free' | 'pro' | 'business';
    status?: string;
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


