/**
 * 页面内容容器组件
 */

import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <main className={`flex-1 overflow-auto bg-gray-100 p-6 ${className}`}>
      {children}
    </main>
  );
};
