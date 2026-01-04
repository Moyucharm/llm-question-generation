"""
Question Generator Service

Uses LLM to generate questions based on requirements
"""

import json
import re
from typing import List, Optional, Dict, Any

from app.services.llm_service import LLMService
from app.core.llm.base import Message
from app.models.llm_log import LLMScene
from app.schemas.question import (
    QuestionType,
    GenerationRequest,
    GeneratedQuestion,
)


# Prompt templates for different question types
GENERATION_PROMPTS = {
    QuestionType.SINGLE_CHOICE: """你是一个专业的出题专家。请根据以下要求生成{count}道单选题。

课程/科目: {course_name}
知识点: {knowledge_point}
难度等级: {difficulty}/5 (1最简单，5最难)
语言: {language}
{additional_requirements}

请严格按照以下JSON格式输出，不要添加任何其他内容:
```json
[
  {{
    "type": "single",
    "stem": "题干内容（问题描述）",
    "options": {{
      "A": "选项A内容",
      "B": "选项B内容",
      "C": "选项C内容",
      "D": "选项D内容"
    }},
    "answer": "正确选项字母(A/B/C/D)",
    "explanation": "详细的答案解析，解释为什么选这个答案",
    "difficulty": {difficulty},
    "knowledge_point": "{knowledge_point}"
  }}
]
```

要求:
1. 题目必须准确、无歧义
2. 四个选项要有一定迷惑性，但只有一个正确答案
3. 解析要详细说明正确答案的原因
4. 难度要符合要求
5. 输出必须是合法的JSON数组""",

    QuestionType.MULTIPLE_CHOICE: """你是一个专业的出题专家。请根据以下要求生成{count}道多选题。

课程/科目: {course_name}
知识点: {knowledge_point}
难度等级: {difficulty}/5 (1最简单，5最难)
语言: {language}
{additional_requirements}

请严格按照以下JSON格式输出:
```json
[
  {{
    "type": "multiple",
    "stem": "题干内容（问题描述，明确说明是多选题）",
    "options": {{
      "A": "选项A内容",
      "B": "选项B内容",
      "C": "选项C内容",
      "D": "选项D内容"
    }},
    "answer": ["正确选项1", "正确选项2"],
    "explanation": "详细的答案解析",
    "difficulty": {difficulty},
    "knowledge_point": "{knowledge_point}"
  }}
]
```

要求:
1. 正确答案必须是2-3个选项
2. 题干要明确说明是多选题
3. 解析要说明每个正确选项的原因""",

    QuestionType.FILL_BLANK: """你是一个专业的出题专家。请根据以下要求生成{count}道填空题。

课程/科目: {course_name}
知识点: {knowledge_point}
难度等级: {difficulty}/5 (1最简单，5最难)
语言: {language}
{additional_requirements}

请严格按照以下JSON格式输出:
```json
[
  {{
    "type": "blank",
    "stem": "题干内容，使用____表示填空位置（每个空用4个下划线）",
    "options": null,
    "answer": ["第一空答案", "第二空答案"],
    "explanation": "详细的答案解析",
    "difficulty": {difficulty},
    "knowledge_point": "{knowledge_point}"
  }}
]
```

要求:
1. 填空位置用____（4个下划线）表示
2. answer数组的顺序要与空的顺序对应
3. 每个空的答案要简洁明确""",

    QuestionType.SHORT_ANSWER: """你是一个专业的出题专家。请根据以下要求生成{count}道简答题。

课程/科目: {course_name}
知识点: {knowledge_point}
难度等级: {difficulty}/5 (1最简单，5最难)
语言: {language}
{additional_requirements}

请严格按照以下JSON格式输出:
```json
[
  {{
    "type": "short",
    "stem": "题干内容（问题描述）",
    "options": null,
    "answer": "参考答案（完整的标准答案）",
    "explanation": "答案解析和评分要点",
    "difficulty": {difficulty},
    "knowledge_point": "{knowledge_point}",
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "rubric": "评分标准：包含关键词1得2分，包含关键词2得2分..."
  }}
]
```

要求:
1. 问题要明确，答案要完整
2. 提供评分关键词和评分标准
3. 解析要详细""",
}


class GeneratorService:
    """
    Question Generator Service

    Uses LLM to generate questions based on course, knowledge point,
    question type, and difficulty requirements.
    """

    def __init__(self, llm_service: LLMService):
        """
        Initialize generator service

        Args:
            llm_service: LLM service for API calls
        """
        self.llm_service = llm_service

    def _build_prompt(self, request: GenerationRequest) -> str:
        """Build generation prompt from request"""
        template = GENERATION_PROMPTS.get(request.question_type)
        if not template:
            raise ValueError(f"Unknown question type: {request.question_type}")

        additional = ""
        if request.additional_requirements:
            additional = f"额外要求: {request.additional_requirements}"

        language_map = {"zh": "中文", "en": "English"}
        language = language_map.get(request.language, request.language)

        return template.format(
            count=request.count,
            course_name=request.course_name,
            knowledge_point=request.knowledge_point or "通用",
            difficulty=request.difficulty,
            language=language,
            additional_requirements=additional,
        )

    def _extract_json(self, text: str) -> List[Dict[str, Any]]:
        """Extract JSON array from LLM response"""
        # Try to find JSON in code blocks
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if json_match:
            json_str = json_match.group(1).strip()
        else:
            # Try to find raw JSON array
            json_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', text)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = text.strip()

        try:
            result = json.loads(json_str)
            if isinstance(result, dict):
                result = [result]
            return result
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {e}\nResponse: {text[:500]}")

    async def generate(
        self,
        request: GenerationRequest,
        user_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate questions based on request

        Args:
            request: Generation request parameters
            user_id: Optional user ID for logging

        Returns:
            List of generated question dictionaries
        """
        prompt = self._build_prompt(request)

        messages = [
            Message(role="system", content="你是一个专业的教育出题专家，擅长生成高质量的考试题目。"),
            Message(role="user", content=prompt),
        ]

        # Call LLM
        response = await self.llm_service.chat(
            messages=messages,
            scene=LLMScene.GENERATE,
            user_id=user_id,
            request_summary=f"Generate {request.count} {request.question_type.value} questions",
            temperature=0.7,  # Some creativity for question generation
        )

        # Parse response
        questions = self._extract_json(response.content)

        # Ensure each question has required fields
        for q in questions:
            if 'type' not in q:
                q['type'] = request.question_type.value
            if 'difficulty' not in q:
                q['difficulty'] = request.difficulty
            if 'knowledge_point' not in q:
                q['knowledge_point'] = request.knowledge_point

        return questions

    async def generate_stream(
        self,
        request: GenerationRequest,
        user_id: Optional[int] = None,
    ):
        """
        Generate questions with streaming output

        Yields partial content as it's generated.
        The final chunk will be a special marker with the full content.
        """
        prompt = self._build_prompt(request)

        messages = [
            Message(role="system", content="你是一个专业的教育出题专家，擅长生成高质量的考试题目。"),
            Message(role="user", content=prompt),
        ]

        full_content = ""
        async for chunk in self.llm_service.chat_stream(
            messages=messages,
            scene=LLMScene.GENERATE,
            user_id=user_id,
            request_summary=f"Generate {request.count} {request.question_type.value} questions (stream)",
            temperature=0.7,
        ):
            full_content += chunk.content
            yield {"type": "chunk", "content": chunk.content}

        # Yield parsed questions at the end
        try:
            questions = self._extract_json(full_content)
            yield {"type": "complete", "questions": questions}
        except Exception as e:
            yield {"type": "error", "message": str(e)}
