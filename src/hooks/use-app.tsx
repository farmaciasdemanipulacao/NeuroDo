'use client';

import { useContext } from 'react';
import { AppContext } from '@/context/app-provider';

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
