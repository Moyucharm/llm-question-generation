/**
 * 输入弹窗组件
 */

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

export const InputModal: React.FC<InputModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  label,
  placeholder = '请输入...',
  defaultValue = '',
  confirmText = '确定',
  cancelText = '取消',
}) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时重置值并聚焦
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size='sm'>
      <form onSubmit={handleSubmit}>
        {label && (
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            {label}
          </label>
        )}
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
        />
        <div className='flex justify-end gap-3 mt-6'>
          <Button type='button' variant='outline' onClick={onClose}>
            {cancelText}
          </Button>
          <Button type='submit' disabled={!value.trim()}>
            {confirmText}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
