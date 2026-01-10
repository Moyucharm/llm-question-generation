import { useEffect, useState } from 'react';
import { AppRouter } from '@/router/AppRouter';
import { LogPanelProvider } from '@/components/LogPanel/LogPanelProvider';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { syncTimeRecorderWithAppState } from '@/stores/timeRecorderStore';
import { useLogStore } from '@/stores/useLogStore';
import { HotkeysHelp } from '@/components/HotkeysHelp';
import { OptimizedFloatingTimeRecorder } from '@/components/TimeRecorder';
import { DashboardLayout } from '@/components/Layout';
import { LoadingScreen } from '@/components/UI';
import { LoginPage, RegisterPage } from '@/pages/auth';
import { CourseManagementPage } from '@/pages/course/CourseManagementPage';
import { ExamListPage, CreateExamPage, ExamDetailPage, TakeExamPage } from '@/pages/exam';
import { QuestionBankPage } from '@/pages/question-bank';

/**
 * 主应用组件
 * QGen - AI智能出题系统
 */
function App() {
  const { generation, nextQuestion, previousQuestion, submitQuiz, startGrading } = useAppStore();
  const { user, isLoading, isInitialized, initialize, logout } = useAuthStore();
  const { toggleVisibility } = useLogStore();

  const [showHelp, setShowHelp] = useState(false);
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState('generation');
  const [currentExamId, setCurrentExamId] = useState<number | null>(null);

  // 初始化认证状态
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 同步时间记录状态
  useEffect(() => {
    syncTimeRecorderWithAppState(generation);
  }, [generation]);

  // 注册快捷键
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 未登录时不处理快捷键
      if (!user) return;

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
  }, [nextQuestion, previousQuestion, submitQuiz, startGrading, toggleVisibility, showHelp, user]);

  // 处理页面切换
  const handlePageChange = (page: string, examId?: number) => {
    setCurrentPage(page);
    if (examId) {
      setCurrentExamId(examId);
    } else if (!page.startsWith('exam-detail')) {
      setCurrentExamId(null);
    }
  };

  // 加载中状态
  if (!isInitialized || isLoading) {
    return <LoadingScreen message="正在加载..." />;
  }

  // 未登录：显示认证页面
  if (!user) {
    if (authPage === 'login') {
      return <LoginPage onSwitchToRegister={() => setAuthPage('register')} />;
    }
    return <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />;
  }

  // 已登录：显示仪表板布局
  return (
    <LogPanelProvider>
      <DashboardLayout
        user={user}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onLogout={logout}
      >
        {/* 根据当前页面显示内容 */}
        {currentPage === 'dashboard' ? (
          // 仪表板首页 - 暂时显示欢迎信息
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                欢迎回来，{user.name}！
              </h2>
              <p className="text-gray-500 mb-6">
                准备好开始智能出题了吗？
              </p>
              <button
                onClick={() => setCurrentPage('generation')}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                开始 AI 出题
              </button>
            </div>
          </div>
        ) : currentPage === 'courses' ? (
          <CourseManagementPage />
        ) : currentPage === 'question-bank' ? (
          <QuestionBankPage />
        ) : currentPage === 'exams' ? (
          <ExamListPage onNavigate={handlePageChange} />
        ) : currentPage === 'exam-create' ? (
          <CreateExamPage onNavigate={handlePageChange} />
        ) : currentPage === 'exam-detail' && currentExamId ? (
          <ExamDetailPage examId={currentExamId} onNavigate={handlePageChange} />
        ) : currentPage === 'exam-take' && currentExamId ? (
          <TakeExamPage examId={currentExamId} onNavigate={handlePageChange} />
        ) : (
          // AI出题页面 - 使用现有的状态路由
          <>
            <AppRouter />
            <OptimizedFloatingTimeRecorder />
          </>
        )}
        <HotkeysHelp open={showHelp} onClose={() => setShowHelp(false)} />
      </DashboardLayout>
    </LogPanelProvider>
  );
}

export default App;
