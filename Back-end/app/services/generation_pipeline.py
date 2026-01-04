"""
Question Generation Pipeline

Orchestrates the three-stage quality control pipeline:
Generator → Validator → Reviewer
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

from app.services.llm_service import LLMService
from app.services.generator_service import GeneratorService
from app.services.validator_service import ValidatorService, ValidationResult
from app.services.reviewer_service import ReviewerService, ReviewResult
from app.schemas.question import GenerationRequest, QuestionType


class QuestionStatus(str, Enum):
    """Status of a processed question"""
    APPROVED = "approved"           # Passed all stages
    NEEDS_REVIEW = "needs_review"   # Failed review, needs human check
    REJECTED = "rejected"           # Failed validation, cannot be fixed


@dataclass
class ProcessedQuestion:
    """A question that has been through the pipeline"""
    question: Dict[str, Any]
    status: QuestionStatus
    validation_result: Optional[ValidationResult] = None
    review_result: Optional[ReviewResult] = None
    original_question: Optional[Dict[str, Any]] = None  # Before fixes


@dataclass
class PipelineResult:
    """Result of running the generation pipeline"""
    approved: List[ProcessedQuestion] = field(default_factory=list)
    needs_review: List[ProcessedQuestion] = field(default_factory=list)
    rejected: List[ProcessedQuestion] = field(default_factory=list)

    @property
    def total_generated(self) -> int:
        return len(self.approved) + len(self.needs_review) + len(self.rejected)

    @property
    def success_rate(self) -> float:
        if self.total_generated == 0:
            return 0.0
        return len(self.approved) / self.total_generated

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "summary": {
                "total": self.total_generated,
                "approved": len(self.approved),
                "needs_review": len(self.needs_review),
                "rejected": len(self.rejected),
                "success_rate": round(self.success_rate * 100, 1),
            },
            "approved_questions": [
                {
                    "question": pq.question,
                    "review_comment": pq.review_result.review_comment if pq.review_result else None,
                }
                for pq in self.approved
            ],
            "needs_review_questions": [
                {
                    "question": pq.question,
                    "original": pq.original_question,
                    "issues": [
                        {"type": issue.type, "description": issue.description}
                        for issue in (pq.review_result.issues if pq.review_result else [])
                    ],
                }
                for pq in self.needs_review
            ],
            "rejected_questions": [
                {
                    "question": pq.question,
                    "validation_errors": [
                        {"field": err.field, "message": err.message}
                        for err in (pq.validation_result.errors if pq.validation_result else [])
                    ],
                }
                for pq in self.rejected
            ],
        }


class GenerationPipeline:
    """
    Question Generation Pipeline

    Three-stage quality control:
    1. Generator: LLM generates questions based on requirements
    2. Validator: Rule-based validation (format, structure, duplicates)
    3. Reviewer: AI-based review (facts, ambiguity, difficulty)

    Strategies:
    - Validation failure: Reject (cannot auto-fix format issues)
    - Review failure: Attempt one fix, then mark as needs_review
    """

    def __init__(self, llm_service: LLMService):
        """
        Initialize pipeline with shared LLM service

        Args:
            llm_service: LLM service for generation and review
        """
        self.llm_service = llm_service
        self.generator = GeneratorService(llm_service)
        self.validator = ValidatorService()
        self.reviewer = ReviewerService(llm_service)

    async def generate(
        self,
        request: GenerationRequest,
        user_id: Optional[int] = None,
        skip_review: bool = False,
    ) -> PipelineResult:
        """
        Run the full generation pipeline

        Args:
            request: Generation request parameters
            user_id: Optional user ID for logging
            skip_review: Skip AI review stage (for testing/speed)

        Returns:
            PipelineResult with categorized questions
        """
        result = PipelineResult()

        # Stage 1: Generate questions
        try:
            raw_questions = await self.generator.generate(request, user_id)
            print(f"[Pipeline] Generated {len(raw_questions)} raw questions")
        except Exception as e:
            # Generation failed completely
            print(f"[Pipeline] Generation failed: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return result

        # Stage 2: Validate all questions
        validated = self.validator.validate_batch(raw_questions)

        for question, validation_result in validated:
            if not validation_result.is_valid:
                # Validation failed - reject
                result.rejected.append(ProcessedQuestion(
                    question=question,
                    status=QuestionStatus.REJECTED,
                    validation_result=validation_result,
                ))
                continue

            # Stage 3: AI Review (if not skipped)
            if skip_review:
                # Skip review - approve directly
                result.approved.append(ProcessedQuestion(
                    question=question,
                    status=QuestionStatus.APPROVED,
                    validation_result=validation_result,
                ))
                continue

            # Perform AI review
            review_result = await self.reviewer.review(question, user_id)

            if review_result.is_approved:
                # Passed review - approve
                result.approved.append(ProcessedQuestion(
                    question=question,
                    status=QuestionStatus.APPROVED,
                    validation_result=validation_result,
                    review_result=review_result,
                ))
            else:
                # Review failed - try to fix once
                original = question.copy()

                if review_result.fixed_question:
                    # Use fix from review response
                    fixed_question = review_result.fixed_question
                else:
                    # Try to fix
                    fixed_question = await self.reviewer.fix(
                        question, review_result.issues, user_id
                    )

                if fixed_question:
                    # Re-validate fixed question
                    fix_validation = self.validator.validate(fixed_question)

                    if fix_validation.is_valid:
                        # Re-review fixed question
                        fix_review = await self.reviewer.review(fixed_question, user_id)

                        if fix_review.is_approved:
                            # Fixed successfully
                            result.approved.append(ProcessedQuestion(
                                question=fixed_question,
                                status=QuestionStatus.APPROVED,
                                validation_result=fix_validation,
                                review_result=fix_review,
                                original_question=original,
                            ))
                            continue

                # Fix failed or still not approved - needs human review
                result.needs_review.append(ProcessedQuestion(
                    question=fixed_question or question,
                    status=QuestionStatus.NEEDS_REVIEW,
                    validation_result=validation_result,
                    review_result=review_result,
                    original_question=original if fixed_question else None,
                ))

        return result

    async def generate_quick(
        self,
        request: GenerationRequest,
        user_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Quick generation without full pipeline

        Skips AI review stage for faster generation.
        Use for drafts or when speed is critical.

        Args:
            request: Generation request parameters
            user_id: Optional user ID for logging

        Returns:
            List of validated questions (no AI review)
        """
        result = await self.generate(request, user_id, skip_review=True)
        return [pq.question for pq in result.approved]

    async def generate_single(
        self,
        course_name: str,
        question_type: QuestionType,
        difficulty: int = 3,
        knowledge_point: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Optional[ProcessedQuestion]:
        """
        Generate a single question with full pipeline

        Convenience method for generating one question at a time.

        Args:
            course_name: Name of the course
            question_type: Type of question to generate
            difficulty: Difficulty level (1-5)
            knowledge_point: Optional knowledge point
            user_id: Optional user ID for logging

        Returns:
            ProcessedQuestion or None if generation failed
        """
        request = GenerationRequest(
            course_name=course_name,
            question_type=question_type,
            difficulty=difficulty,
            knowledge_point=knowledge_point,
            count=1,
        )

        result = await self.generate(request, user_id)

        if result.approved:
            return result.approved[0]
        elif result.needs_review:
            return result.needs_review[0]
        elif result.rejected:
            return result.rejected[0]

        return None
