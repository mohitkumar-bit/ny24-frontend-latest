import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    /** Rebuild RN FormData after token refresh — body is consumed on first send. */
    _nativeUploadMeta?: {
      uri: string;
      mimeType: string;
      filename: string;
    };
  }
}
