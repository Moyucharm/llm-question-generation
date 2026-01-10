/**
 * 加载动画组件
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
}) => {
  return (
    <Loader2
      className={`animate-spin text-blue-600 ${sizeStyles[size]} ${className}`}
    />
  );
};

// 全屏加载
export const LoadingScreen: React.FC<{ message?: string }> = ({
  message = '加载中...',
}) => {
  return (
    <div className='min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4'>
      <Spinner size='lg' />
      <p className='text-gray-500'>{message}</p>
    </div>
  );
};
