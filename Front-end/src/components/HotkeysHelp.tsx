import React from 'react';

interface HotkeysHelpProps {
  open: boolean;
  onClose: () => void;
}

export const HotkeysHelp: React.FC<HotkeysHelpProps> = ({ open, onClose }) => {
  if (!open) return null;

  const items: Array<{ combo: string; desc: string }> = [
    { combo: 'Shift + /', desc: '打开/关闭快捷键帮助' },
    { combo: 'Esc', desc: '关闭快捷键帮助' },
    { combo: 'J 或 →', desc: '下一题' },
    { combo: 'K 或 ←', desc: '上一题' },
    {
      combo: '1 / 2 / 3 / 4 …',
      desc: '选择题：选择/切换 A/B/C/D（多选为切换勾选）',
    },
    { combo: 'Enter', desc: '当前题已作答时，跳到下一题' },
    { combo: 'Ctrl + Enter', desc: '提交试卷并开始批改' },
    { combo: 'Ctrl + L', desc: '打开/关闭日志面板' },
  ];

  return (
    <div
      role='dialog'
      aria-modal='true'
      className='fixed inset-0 z-50 flex items-center justify-center'
    >
      <div className='absolute inset-0 bg-black/40' onClick={onClose} />
      <div className='relative w-[520px] max-w-[92vw] rounded-lg bg-white shadow-xl'>
        <div className='flex items-center justify-between border-b px-4 py-3'>
          <h3 className='text-base font-semibold'>快捷键帮助</h3>
          <button
            type='button'
            className='rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100'
            onClick={onClose}
            aria-label='关闭'
          >
            关闭
          </button>
        </div>
        <div className='max-h-[60vh] overflow-auto p-4'>
          <ul className='space-y-2'>
            {items.map(item => (
              <li
                key={item.combo}
                className='flex items-center justify-between'
              >
                <span className='text-gray-600'>{item.desc}</span>
                <span className='font-mono text-sm text-gray-900'>
                  {item.combo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
