'use client';

import { useMemo, useState } from 'react';
import { useFirebaseApp } from '@/firebase';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTaskSnapshot,
} from 'firebase/storage';

interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  downloadURL: string | null;
}

export function useFileUpload() {
  const firebaseApp = useFirebaseApp();
  const storage = useMemo(() => getStorage(firebaseApp), [firebaseApp]);
  const [uploadState, setUploadState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    downloadURL: null,
  });

  const uploadFile = (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      setUploadState({
        isUploading: true,
        progress: 0,
        error: null,
        downloadURL: null,
      });

      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadState((prev) => ({ ...prev, progress }));
        },
        (error) => {
          console.error('Upload error:', error);
          const errorMsg = 'Falha no upload. Verifique as regras de segurança do Storage.';
          setUploadState((prev) => ({
            ...prev,
            isUploading: false,
            error: errorMsg,
          }));
          reject(new Error(errorMsg));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadState((prev) => ({
              ...prev,
              isUploading: false,
              downloadURL,
            }));
            resolve(downloadURL);
          } catch (error) {
            console.error('Failed to get download URL:', error);
            const errorMsg = 'Falha ao obter a URL do arquivo.';
            setUploadState((prev) => ({
                ...prev,
                isUploading: false,
                error: errorMsg,
            }));
            reject(new Error(errorMsg));
          }
        }
      );
    });
  };

  return { ...uploadState, uploadFile };
}
