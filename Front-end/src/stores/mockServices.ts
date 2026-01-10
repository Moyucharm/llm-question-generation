/**
 * ??????
 * ?LLM?????????????
 * ?useAppStore??????????????
 */

import type { GenerationRequest, Quiz, Question, GradingResult } from '@/types';
import { QuestionType } from '@/types';

/**
 * ???????????
 * @param ms ?????
 */
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * ?????
 * @param id ??ID
 * @param subject ????
 * @param index ????
 */
const createSingleChoiceQuestion = (
  id: string,
  subject: string,
  index: number
): Question => ({
  id,
  type: QuestionType.SINGLE_CHOICE,
  question: `??${subject}???? ${index + 1}????????????`,
  options: ['??A', '??B', '??C', '??D'],
  correctAnswer: 0,
});

/**
 * ?????
 * @param id ??ID
 * @param subject ????
 * @param index ????
 */
const createMultipleChoiceQuestion = (
  id: string,
  subject: string,
  index: number
): Question => ({
  id,
  type: QuestionType.MULTIPLE_CHOICE,
  question: `??${subject}???? ${index + 1}????????????`,
  options: ['??A', '??B', '??C', '??D'],
  correctAnswers: [0, 2],
});

/**
 * ?????
 * @param id ??ID
 * @param subject ????
 * @param index ????
 */
const createFillBlankQuestion = (
  id: string,
  subject: string,
  index: number
): Question => ({
  id,
  type: QuestionType.FILL_BLANK,
  question: `??${subject}???? ${index + 1}????????___????????????___?`,
  correctAnswers: ['??A', '??B'],
});

/**
 * ?????
 * @param id ??ID
 * @param subject ????
 * @param index ????
 */
const createShortAnswerQuestion = (
  id: string,
  subject: string,
  index: number
): Question => ({
  id,
  type: QuestionType.SHORT_ANSWER,
  question: `??${subject}???? ${index + 1}?????????????`,
  referenceAnswer: '????????????????????????',
});

/**
 * ????????
 */
const questionGenerators = {
  'single-choice': createSingleChoiceQuestion,
  'multiple-choice': createMultipleChoiceQuestion,
  'fill-blank': createFillBlankQuestion,
  'short-answer': createShortAnswerQuestion,
} as const;

/**
 * ??LLM API?? - ????
 * ?LLM?????????????
 * @param request ??????
 * @returns ?????
 */
export const mockGenerateQuiz = async (
  request: GenerationRequest
): Promise<Quiz> => {
  // ??????
  await delay(2000);

  const questions: Question[] = [];
  let questionId = 1;

  // ?????????????
  for (const config of request.questionConfigs) {
    const generator = questionGenerators[config.type];

    if (!generator) {
      console.warn(`???????: ${config.type}`);
      continue;
    }

    for (let i = 0; i < config.count; i++) {
      const id = `q${questionId++}`;
      const question = generator(id, request.subject, i);
      questions.push(question);
    }
  }

  return {
    id: `quiz_${Date.now()}`,
    title: `${request.subject} - ???`,
    questions,
    createdAt: Date.now(),
  };
};

/**
 * ???????
 * @param question ????
 * @returns ?????
 */
const gradeSingleChoice = (question: Question) => {
  if (question.type !== 'single-choice') {
    return { score: 0, feedback: '??????' };
  }

  if (question.userAnswer === question.correctAnswer) {
    return { score: 10, feedback: '?????' };
  }

  return {
    score: 0,
    feedback: `????????????${String.fromCharCode(65 + question.correctAnswer)}`,
  };
};

/**
 * ???????
 * @param question ????
 * @returns ?????
 */
const gradeMultipleChoice = (question: Question) => {
  if (question.type !== 'multiple-choice') {
    return { score: 0, feedback: '??????' };
  }

  const userAnswers = question.userAnswer || [];
  const correctAnswers = question.correctAnswers;

  if (
    JSON.stringify(userAnswers.sort()) === JSON.stringify(correctAnswers.sort())
  ) {
    return { score: 10, feedback: '???????' };
  }

  return { score: 5, feedback: '??????????' };
};

/**
 * ????????
 * @param question ????
 * @returns ?????
 */
const gradeOtherQuestion = (question: Question) => {
  const score = question.userAnswer ? 8 : 0;
  const feedback = question.userAnswer ? '???????????' : '???';
  return { score, feedback };
};

/**
 * ????????
 */
const questionGraders = {
  'single-choice': gradeSingleChoice,
  'multiple-choice': gradeMultipleChoice,
} as const;

/**
 * ??LLM API?? - ????
 * ?LLM?????????????
 * @param quiz ??????
 * @returns ????
 */
export const mockGradeQuiz = async (quiz: Quiz): Promise<GradingResult> => {
  // ??????
  await delay(3000);

  const results = quiz.questions.map(question => {
    const grader =
      questionGraders[question.type as keyof typeof questionGraders];
    const { score, feedback } = grader
      ? grader(question)
      : gradeOtherQuestion(question);

    return {
      questionId: question.id,
      score,
      feedback,
    };
  });

  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const maxScore = quiz.questions.length * 10;

  // ??????
  const getOverallFeedback = (score: number, max: number): string => {
    const percentage = score / max;
    if (percentage >= 0.8) return '??';
    if (percentage >= 0.6) return '??';
    return '????';
  };

  return {
    totalScore,
    maxScore,
    results,
    overallFeedback: `????${getOverallFeedback(totalScore, maxScore)}??????`,
  };
};
