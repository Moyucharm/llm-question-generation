import { useEffect, useState } from 'react';
import { AppRouter } from '@/router/AppRouter';
import { LogPanelProvider } from '@/components/LogPanel/LogPanelProvider';
import { useAppStore } from '@/stores/useAppStore';
import { syncTimeRecorderWithAppState } from '@/stores/timeRecorderStore';
import { useLogStore } from '@/stores/useLogStore';
import { HotkeysHelp } from '@/components/HotkeysHelp';
import { OptimizedFloatingTimeRecorder } from '@/components/TimeRecorder';
// import { Header } from '@/components/Header';

/**
 * 主应用组件
 * QuAIz - AI智能出题系统
 */
function App() {
  const { generation, nextQuestion, previousQuestion, submitQuiz, startGrading } = useAppStore();
  const { toggleVisibility } = useLogStore();
  const [showHelp, setShowHelp] = useState(false);

  // 同步时间记录状态
  useEffect(() => {
    syncTimeRecorderWithAppState(generation);
  }, [generation]);

  // 注册快捷键
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Shift + / 或 Shift + ? 或键码 Slash 打开帮助
      const isSlash = e.key === '/' || e.key === '?' || e.code === 'Slash';
      if (e.shiftKey && isSlash) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }
      // Esc 关闭帮助
      if (showHelp && e.key === 'Escape') {
        e.preventDefault();
        setShowHelp(false);
        return;
      }

      // 在帮助面板打开时不再处理其他快捷键
      if (showHelp) return;

      // J/→ 下一题
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowRight') {
        nextQuestion();
        return;
      }
      // K/← 上一题
      if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowLeft') {
        previousQuestion();
        return;
      }
      // Ctrl + Enter 提交
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void (async () => {
          await submitQuiz();
          await startGrading();
        })();
        return;
      }
      // Ctrl + L 日志开关
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        toggleVisibility();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextQuestion, previousQuestion, submitQuiz, startGrading, toggleVisibility, showHelp]);

  //

  return (
    <LogPanelProvider>
      <div className='App'>
        <AppRouter />
        <OptimizedFloatingTimeRecorder />
        <HotkeysHelp open={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    </LogPanelProvider>
  );
}

export default App;
