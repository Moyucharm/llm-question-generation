import { QuestionType } from '@/types';

/**
 * 题型选项配置
 */
export const QUESTION_TYPE_OPTIONS = [
  {
    type: QuestionType.SINGLE_CHOICE,
    label: '单选题',
    description: '从多个选项中选择一个正确答案',
  },
  {
    type: QuestionType.MULTIPLE_CHOICE,
    label: '多选题',
    description: '从多个选项中选择多个正确答案',
  },
  {
    type: QuestionType.FILL_BLANK,
    label: '填空题',
    description: '在空白处填写正确答案',
  },
  {
    type: QuestionType.SHORT_ANSWER,
    label: '简答题',
    description: '用文字回答问题',
  },
];
