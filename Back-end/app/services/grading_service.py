"""
AI Grading Service

Uses LLM to grade subjective questions (short answer, fill-in-the-blank)
"""

import json
from typing import Optional
from app.services.llm_service import LLMService


class GradingService:
    """AI-powered grading service for subjective questions"""

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    async def grade_short_answer(
        self,
        question_stem: str,
        reference_answer: str,
        student_answer: str,
        max_score: float,
        explanation: Optional[str] = None,
    ) -> dict:
        """
        Grade a short answer question using AI

        Returns:
            {
                "score": float,
                "feedback": str,
                "analysis": str
            }
        """
        if not student_answer or not student_answer.strip():
            return {
                "score": 0,
                "feedback": "未作答",
                "analysis": "学生未提交答案"
            }

        prompt = f"""你是一个专业的教师，正在批改学生的简答题。请根据以下信息进行评分：

## 题目
{question_stem}

## 参考答案
{reference_answer}

{f"## 答案解析{chr(10)}{explanation}" if explanation else ""}

## 学生答案
{student_answer}

## 评分要求
- 满分为 {max_score} 分
- 根据学生答案与参考答案的匹配程度、关键点覆盖情况进行评分
- 允许学生使用不同的表述方式，只要意思正确即可
- 对于部分正确的答案给予部分分数

请以JSON格式返回评分结果：
{{
    "score": <得分，0到{max_score}之间的数字>,
    "feedback": "<简短的评语，说明得分原因>",
    "analysis": "<详细分析学生答案的优缺点>"
}}

只返回JSON，不要有其他内容。"""

        try:
            # 使用 simple_chat 方法，它直接接受字符串并返回字符串
            response = await self.llm.simple_chat(prompt)

            # Parse JSON response
            result = self._parse_json_response(response, max_score)
            return result

        except Exception as e:
            # Fallback: return a neutral score
            return {
                "score": max_score * 0.5,
                "feedback": f"AI评分暂时不可用: {str(e)}",
                "analysis": "无法完成自动评分，建议教师手动批改"
            }

    async def grade_fill_blank(
        self,
        question_stem: str,
        correct_blanks: list,
        student_blanks: list,
        max_score: float,
    ) -> dict:
        """
        Grade fill-in-the-blank questions using AI for fuzzy matching

        Returns:
            {
                "score": float,
                "feedback": str,
                "blank_scores": list[float]
            }
        """
        if not student_blanks:
            return {
                "score": 0,
                "feedback": "未作答",
                "blank_scores": [0] * len(correct_blanks)
            }

        # Ensure same length
        while len(student_blanks) < len(correct_blanks):
            student_blanks.append("")

        prompt = f"""你是一个专业的教师，正在批改学生的填空题。请对每个空进行评分。

## 题目
{question_stem}

## 正确答案
{json.dumps(correct_blanks, ensure_ascii=False)}

## 学生答案
{json.dumps(student_blanks[:len(correct_blanks)], ensure_ascii=False)}

## 评分要求
- 共有 {len(correct_blanks)} 个空，总分 {max_score} 分
- 每个空的分值为 {max_score / len(correct_blanks):.2f} 分
- 允许同义词、近义词、不同表述方式
- 允许轻微的拼写错误（如果意思明确）
- 对于部分正确的答案可以给部分分

请以JSON格式返回评分结果：
{{
    "score": <总得分，0到{max_score}之间>,
    "feedback": "<整体评语>",
    "blank_scores": [<第1空得分>, <第2空得分>, ...]
}}

只返回JSON，不要有其他内容。"""

        try:
            # 使用 simple_chat 方法，它直接接受字符串并返回字符串
            response = await self.llm.simple_chat(prompt)

            result = self._parse_json_response(response, max_score)

            # Ensure blank_scores exists
            if "blank_scores" not in result:
                result["blank_scores"] = [result["score"] / len(correct_blanks)] * len(correct_blanks)

            return result

        except Exception as e:
            # Fallback: simple string matching
            correct_count = sum(
                1 for s, c in zip(student_blanks, correct_blanks)
                if str(s).strip().lower() == str(c).strip().lower()
            )
            score = (correct_count / len(correct_blanks)) * max_score

            return {
                "score": score,
                "feedback": f"答对 {correct_count}/{len(correct_blanks)} 个空",
                "blank_scores": [
                    max_score / len(correct_blanks)
                    if str(s).strip().lower() == str(c).strip().lower()
                    else 0
                    for s, c in zip(student_blanks, correct_blanks)
                ]
            }

    def _parse_json_response(self, response: str, max_score: float) -> dict:
        """Parse JSON from LLM response"""
        # Clean up response
        response = response.strip()

        # Try to extract JSON from markdown code blocks
        if "```json" in response:
            start = response.find("```json") + 7
            end = response.find("```", start)
            if end > start:
                response = response[start:end].strip()
        elif "```" in response:
            start = response.find("```") + 3
            end = response.find("```", start)
            if end > start:
                response = response[start:end].strip()

        # Remove potential leading/trailing characters
        if response.startswith("{"):
            # Find the matching closing brace
            depth = 0
            end_idx = 0
            for i, char in enumerate(response):
                if char == "{":
                    depth += 1
                elif char == "}":
                    depth -= 1
                    if depth == 0:
                        end_idx = i + 1
                        break
            response = response[:end_idx]

        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            # Fallback
            return {
                "score": max_score * 0.5,
                "feedback": "AI评分解析失败",
                "analysis": response[:200]
            }

        # Validate and clamp score
        score = float(result.get("score", max_score * 0.5))
        score = max(0, min(max_score, score))
        result["score"] = score

        # Ensure feedback exists
        if "feedback" not in result:
            result["feedback"] = "AI已评分"

        return result


async def create_grading_service() -> GradingService:
    """Factory function to create GradingService with LLM"""
    # LLMService 不需要传入 settings，它会自动从全局 settings 获取配置
    # db 参数是可选的，用于日志记录，这里不需要
    llm_service = LLMService()

    return GradingService(llm_service)
