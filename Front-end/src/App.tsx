import { useCallback, useEffect, useState } from 'react';
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
import {
  ExamListPage,
  CreateExamPage,
  ExamDetailPage,
  TakeExamPage,
  ExamResultPage,
  GradeAttemptPage,
} from '@/pages/exam';
import { QuestionBankPage } from '@/pages/question-bank';

/**
 * 主应用组件
 * QGen - AI智能出题系统
 */
function App() {
  const {
    generation,
    nextQuestion,
    previousQuestion,
    submitQuiz,
    startGrading,
  } = useAppStore();
  const { user, isInitialized, initialize, logout } = useAuthStore();
  const { toggleVisibility } = useLogStore();

  const [showHelp, setShowHelp] = useState(false);
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentExamId, setCurrentExamId] = useState<number | null>(null);
  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);

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
  }, [
    nextQuestion,
    previousQuestion,
    submitQuiz,
    startGrading,
    toggleVisibility,
    showHelp,
    user,
  ]);

  const setPathname = (pathname: string, replace = false) => {
    if (window.location.pathname === pathname) return;
    if (replace) {
      window.history.replaceState(null, '', pathname);
    } else {
      window.history.pushState(null, '', pathname);
    }
  };

  const getPathForPage = (page: string, examId: number | null, attemptId?: number | null) => {
    switch (page) {
      case 'dashboard':
        return '/dashboard';
      case 'generation':
        return '/generation';
      case 'courses':
        return '/courses';
      case 'question-bank':
        return '/question-bank';
      case 'exams':
        return '/exams';
      case 'exam-create':
        return '/exams/create';
      case 'exam-detail':
        return examId ? `/exams/${examId}` : '/exams';
      case 'exam-take':
        return examId ? `/exams/${examId}/take` : '/exams';
      case 'exam-result':
        return examId ? `/exams/${examId}/result` : '/exams';
      case 'exam-grade':
        return examId && attemptId ? `/exams/${examId}/attempts/${attemptId}/grade` : '/exams';
      default:
        return '/dashboard';
    }
  };

  const applyPathname = useCallback(
    (pathname: string) => {
      const clean = pathname.split('?')[0]?.split('#')[0] || '/';
      const parts = clean.split('/').filter(Boolean);

      if (parts.length === 0) {
        if (user) {
          setCurrentPage('dashboard');
          setCurrentExamId(null);
        } else {
          setAuthPage('login');
        }
        return;
      }

      const [first, second, third] = parts;

      if (first === 'login') {
        setAuthPage('login');
        return;
      }
      if (first === 'register') {
        setAuthPage('register');
        return;
      }

      if (first === 'dashboard') {
        setCurrentPage('dashboard');
        setCurrentExamId(null);
        return;
      }
      if (first === 'generation' || first === 'quiz' || first === 'result') {
        setCurrentPage('generation');
        setCurrentExamId(null);
        return;
      }
      if (first === 'courses') {
        setCurrentPage('courses');
        setCurrentExamId(null);
        return;
      }
      if (first === 'question-bank') {
        setCurrentPage('question-bank');
        setCurrentExamId(null);
        return;
      }
      if (first === 'exams') {
        if (!second) {
          setCurrentPage('exams');
          setCurrentExamId(null);
          setCurrentAttemptId(null);
          return;
        }
        if (second === 'create') {
          setCurrentPage('exam-create');
          setCurrentExamId(null);
          setCurrentAttemptId(null);
          return;
        }

        const examId = Number(second);
        if (!Number.isFinite(examId)) {
          setCurrentPage('exams');
          setCurrentExamId(null);
          setCurrentAttemptId(null);
          return;
        }
        setCurrentExamId(examId);

        if (third === 'take') {
          setCurrentPage('exam-take');
          setCurrentAttemptId(null);
        } else if (third === 'result') {
          setCurrentPage('exam-result');
          setCurrentAttemptId(null);
        } else if (third === 'attempts') {
          // /exams/:examId/attempts/:attemptId/grade
          const fourth = parts[3];
          const fifth = parts[4];
          const attemptId = Number(fourth);
          if (Number.isFinite(attemptId) && fifth === 'grade') {
            setCurrentAttemptId(attemptId);
            setCurrentPage('exam-grade');
          } else {
            setCurrentPage('exam-detail');
            setCurrentAttemptId(null);
          }
        } else {
          setCurrentPage('exam-detail');
          setCurrentAttemptId(null);
        }
        return;
      }

      setCurrentPage('dashboard');
      setCurrentExamId(null);
    },
    [user]
  );

  useEffect(() => {
    if (!isInitialized) return;

    applyPathname(window.location.pathname);

    const onPopState = () => applyPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyPathname, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const path = window.location.pathname;

    if (!user) {
      if (path !== '/login' && path !== '/register') {
        setAuthPage('login');
        setPathname('/login', true);
      }
      return;
    }

    if (path === '/' || path === '/login' || path === '/register') {
      setCurrentPage('dashboard');
      setCurrentExamId(null);
      setPathname('/dashboard', true);
    }
  }, [isInitialized, user]);

  // 处理页面切换
  const handlePageChange = (page: string, examId?: number, attemptId?: number) => {
    let nextExamId = currentExamId;
    let nextAttemptId = currentAttemptId;

    setCurrentPage(page);
    if (typeof examId === 'number') {
      nextExamId = examId;
    } else if (!page.startsWith('exam-')) {
      nextExamId = null;
    }
    setCurrentExamId(nextExamId);

    if (typeof attemptId === 'number') {
      nextAttemptId = attemptId;
    } else if (page !== 'exam-grade') {
      nextAttemptId = null;
    }
    setCurrentAttemptId(nextAttemptId);

    setPathname(getPathForPage(page, nextExamId, nextAttemptId));
  };

  // 初始化加载中状态（仅用于启动时的 token 校验等）
  if (!isInitialized) {
    return <LoadingScreen message='正在加载...' />;
  }

  // 未登录：显示认证页面
  if (!user) {
    if (authPage === 'login') {
      return (
        <LoginPage
          onSwitchToRegister={() => {
            setAuthPage('register');
            setPathname('/register');
          }}
        />
      );
    }
    return (
      <RegisterPage
        onSwitchToLogin={() => {
          setAuthPage('login');
          setPathname('/login');
        }}
      />
    );
  }

  // 已登录：显示仪表板布局
  return (
    <LogPanelProvider>
      <DashboardLayout
        user={user}
        currentPage={currentPage}
        onPageChange={page => handlePageChange(page)}
        onLogout={() => {
          logout();
          setAuthPage('login');
          setPathname('/login', true);
        }}
      >
        {/* 根据当前页面显示内容 */}
        {currentPage === 'dashboard' ? (
          // 仪表板首页 - 暂时显示欢迎信息
          <div className='max-w-4xl mx-auto'>
            <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                欢迎回来，{user.name}！
              </h2>
              <p className='text-gray-500 mb-6'>准备好开始智能出题了吗？</p>
              <button
                onClick={() => handlePageChange('generation')}
                className='px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors'
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
          <ExamDetailPage
            examId={currentExamId}
            onNavigate={handlePageChange}
          />
        ) : currentPage === 'exam-take' && currentExamId ? (
          <TakeExamPage examId={currentExamId} onNavigate={handlePageChange} />
        ) : currentPage === 'exam-result' && currentExamId ? (
          <ExamResultPage examId={currentExamId} onNavigate={handlePageChange} />
        ) : currentPage === 'exam-grade' && currentExamId && currentAttemptId ? (
          <GradeAttemptPage
            examId={currentExamId}
            attemptId={currentAttemptId}
            onNavigate={handlePageChange}
          />
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
