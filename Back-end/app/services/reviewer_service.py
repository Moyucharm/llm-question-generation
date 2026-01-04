"""
Question Reviewer Service

Uses LLM to review and validate generated questions
"""

import json
import re
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field

from app.services.llm_service import LLMService
from app.core.llm.base import Message
from app.models.llm_log import LLMScene
from app.schemas.question import QuestionType


@dataclass
class ReviewIssue:
    """A single issue found during review"""
    type: str  # fact_error, answer_ambiguous, unclear_stem, difficulty_mismatch, other
    description: str
    severity: str = "error"  # error, warning


@dataclass
class ReviewResult:
    """Result of AI review"""
    is_approved: bool
    issues: List[ReviewIssue] = field(default_factory=list)
    fixed_question: Optional[Dict[str, Any]] = None
    review_comment: str = ""

    def add_issue(self, issue_type: str, description: str, severity: str = "error"):
        """Add an issue"""
        self.issues.append(ReviewIssue(type=issue_type, description=description, severity=severity))
        if severity == "error":
            self.is_approved = False


# Review prompt template
REVIEW_PROMPT = """你是一个专业的教育题目审核专家。请仔细审核以下题目的质量。

**题目信息**:
- 题型: {question_type}
- 题干: {stem}
- 选项: {options}
- 答案: {answer}
- 解析: {explanation}
- 知识点: {knowledge_point}
- 难度: {difficulty}/5

**审核要点**:
1. **事实正确性**: 题目内容和答案是否符合专业知识？
2. **答案唯一性**: 对于客观题，是否只有一个(或题目要求的)正确答案？是否存在争议？
3. **表述清晰性**: 题干是否清晰无歧义？选项是否表述准确？
4. **难度匹配**: 题目难度是否与声称的难度等级相符？
5. **解析完整**: 解析是否正确且有助于理解？

请严格按照以下JSON格式输出审核结果:
```json
{{
  "is_correct": true或false,
  "issues": [
    {{
      "type": "问题类型(fact_error/answer_ambiguous/unclear_stem/difficulty_mismatch/explanation_error/other)",
      "description": "问题描述",
      "severity": "error或warning"
    }}
  ],
  "comment": "总体评价(一句话)",
  "fixed_question": null或修正后的完整题目对象(如果有问题需要修复)
}}
```

如果题目没有问题，issues为空数组，is_correct为true。
如果有问题但可以修复，请在fixed_question中提供修正后的完整题目。
如果问题严重无法修复，fixed_question为null。"""


FIX_PROMPT = """请修复以下有问题的题目。

**原题目**:
{original_question}

**发现的问题**:
{issues}

请提供修正后的完整题目，保持原有格式，只修改有问题的部分。
严格按照以下JSON格式输出:
```json
{{
  "type": "{question_type}",
  "stem": "修正后的题干",
  "options": {{"A": "...", "B": "...", ...}},
  "answer": "修正后的答案",
  "explanation": "修正后的解析",
  "difficulty": {difficulty},
  "knowledge_point": "{knowledge_point}"
}}
```"""


class ReviewerService:
    """
    Question Reviewer Service

    Uses LLM to review generated questions for:
    - Factual correctness
    - Answer uniqueness/validity
    - Clarity of expression
    - Difficulty matching
    - Explanation quality

    Can also attempt to fix problematic questions.
    """

    def __init__(self, llm_service: LLMService):
        """
        Initialize reviewer service

        Args:
            llm_service: LLM service for API calls
        """
        self.llm_service = llm_service

    def _format_options(self, options: Optional[Dict[str, str]]) -> str:
        """Format options for display"""
        if not options:
            return "无"
        return "\n".join([f"  {k}: {v}" for k, v in options.items()])

    def _format_answer(self, answer: Any) -> str:
        """Format answer for display"""
        if isinstance(answer, list):
            return ", ".join(str(a) for a in answer)
        return str(answer)

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response"""
        # Try to find JSON in code blocks
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if json_match:
            json_str = json_match.group(1).strip()
        else:
            # Try to find raw JSON object
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = text.strip()

        return json.loads(json_str)

    async def review(
        self,
        question: Dict[str, Any],
        user_id: Optional[int] = None,
    ) -> ReviewResult:
        """
        Review a single question

        Args:
            question: Question dictionary to review
            user_id: Optional user ID for logging

        Returns:
            ReviewResult with approval status and issues
        """
        # Build review prompt
        q_type = question.get('type', 'unknown')
        prompt = REVIEW_PROMPT.format(
            question_type=q_type,
            stem=question.get('stem', ''),
            options=self._format_options(question.get('options')),
            answer=self._format_answer(question.get('answer')),
            explanation=question.get('explanation', '无'),
            knowledge_point=question.get('knowledge_point', '未指定'),
            difficulty=question.get('difficulty', 3),
        )

        messages = [
            Message(role="system", content="你是一个严格的题目审核专家，善于发现题目中的问题。"),
            Message(role="user", content=prompt),
        ]

        try:
            response = await self.llm_service.chat(
                messages=messages,
                scene=LLMScene.REVIEW,
                user_id=user_id,
                request_summary=f"Review {q_type} question",
                temperature=0.3,  # Lower temperature for more consistent review
            )

            # Parse response
            review_data = self._extract_json(response.content)

            result = ReviewResult(is_approved=review_data.get('is_correct', False))
            result.review_comment = review_data.get('comment', '')

            # Process issues
            for issue in review_data.get('issues', []):
                result.add_issue(
                    issue_type=issue.get('type', 'other'),
                    description=issue.get('description', ''),
                    severity=issue.get('severity', 'error'),
                )

            # Get fixed question if provided
            if review_data.get('fixed_question'):
                result.fixed_question = review_data['fixed_question']

            return result

        except json.JSONDecodeError as e:
            result = ReviewResult(is_approved=False)
            result.add_issue('parse_error', f"Failed to parse review response: {e}")
            return result
        except Exception as e:
            result = ReviewResult(is_approved=False)
            result.add_issue('review_error', f"Review failed: {str(e)}")
            return result

    async def fix(
        self,
        question: Dict[str, Any],
        issues: List[ReviewIssue],
        user_id: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Attempt to fix a problematic question

        Args:
            question: Original question with issues
            issues: List of issues to fix
            user_id: Optional user ID for logging

        Returns:
            Fixed question or None if fix failed
        """
        # Format issues
        issues_text = "\n".join([
            f"- [{issue.type}] {issue.description}"
            for issue in issues
            if issue.severity == "error"
        ])

        prompt = FIX_PROMPT.format(
            original_question=json.dumps(question, ensure_ascii=False, indent=2),
            issues=issues_text,
            question_type=question.get('type', 'single'),
            difficulty=question.get('difficulty', 3),
            knowledge_point=question.get('knowledge_point', ''),
        )

        messages = [
            Message(role="system", content="你是一个专业的题目修正专家。请根据问题描述修正题目。"),
            Message(role="user", content=prompt),
        ]

        try:
            response = await self.llm_service.chat(
                messages=messages,
                scene=LLMScene.REVIEW,
                user_id=user_id,
                request_summary="Fix question",
                temperature=0.5,
            )

            fixed = self._extract_json(response.content)
            return fixed

        except Exception:
            return None

    async def review_batch(
        self,
        questions: List[Dict[str, Any]],
        user_id: Optional[int] = None,
        auto_fix: bool = True,
    ) -> List[tuple[Dict[str, Any], ReviewResult]]:
        """
        Review a batch of questions

        Args:
            questions: List of questions to review
            user_id: Optional user ID for logging
            auto_fix: Whether to attempt fixing problematic questions

        Returns:
            List of (question, review_result) tuples
        """
        results = []

        for question in questions:
            review_result = await self.review(question, user_id)

            # Attempt fix if not approved and auto_fix is enabled
            if not review_result.is_approved and auto_fix:
                # Use fixed_question from review if available
                if review_result.fixed_question:
                    question = review_result.fixed_question
                    # Re-review the fixed question
                    review_result = await self.review(question, user_id)
                else:
                    # Try to fix
                    fixed = await self.fix(question, review_result.issues, user_id)
                    if fixed:
                        question = fixed
                        review_result = await self.review(question, user_id)

            results.append((question, review_result))

        return results
