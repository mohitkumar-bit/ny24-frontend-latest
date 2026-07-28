import { Platform } from 'react-native';

/** Append an image picked in the app to FormData (works on native + web). */
export async function appendImageToFormData(
  formData: FormData,
  field: string,
  uri: string,
  filename: string
) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg';
    formData.append(field, new File([blob], filename, { type }));
    return;
  }

  formData.append(field, {
    uri,
    type: 'image/jpeg',
    name: filename,
  } as any);
}

/** Append chat media (image or audio) to FormData. */
export async function appendChatMediaToFormData(
  formData: FormData,
  uri: string,
  mimeType: string,
  filename: string
) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const type =
      blob.type && blob.type !== 'application/octet-stream' ? blob.type : mimeType;
    formData.append('media', new File([blob], filename, { type }));
    return;
  }

  formData.append('media', {
    uri,
    type: mimeType,
    name: filename,
  } as any);
}

export async function buildChatMediaFormData(
  uri: string,
  mimeType: string,
  filename: string
) {
  const formData = new FormData();
  await appendChatMediaToFormData(formData, uri, mimeType, filename);
  return formData;
}

export async function buildProfileImageFormData(uri: string) {
  const formData = new FormData();
  await appendImageToFormData(formData, 'image', uri, 'profile.jpg');
  return formData;
}
