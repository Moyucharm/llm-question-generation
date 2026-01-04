"""
Question Validator Service

Rule-based validation for generated questions
"""

import hashlib
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

from app.schemas.question import QuestionType


@dataclass
class ValidationError:
    """Validation error details"""
    field: str
    message: str
    severity: str = "error"  # error, warning


@dataclass
class ValidationResult:
    """Result of question validation"""
    is_valid: bool
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationError] = field(default_factory=list)

    def add_error(self, field: str, message: str):
        """Add an error"""
        self.errors.append(ValidationError(field=field, message=message, severity="error"))
        self.is_valid = False

    def add_warning(self, field: str, message: str):
        """Add a warning (doesn't invalidate)"""
        self.warnings.append(ValidationError(field=field, message=message, severity="warning"))


class ValidatorService:
    """
    Question Validator Service

    Performs rule-based validation on generated questions:
    - JSON structure validation
    - Single choice: answer must be in options and unique
    - Multiple choice: answers must be non-empty subset of options
    - Fill blank: blank count must match answer count
    - Short answer: must have rubric/keywords
    - Duplicate detection via stem hash
    """

    def __init__(self):
        """Initialize validator with empty seen hashes"""
        self._seen_hashes: set = set()

    def reset_duplicates(self):
        """Reset duplicate detection (call before new batch)"""
        self._seen_hashes.clear()

    def _compute_stem_hash(self, stem: str) -> str:
        """Compute hash of question stem for duplicate detection"""
        # Normalize: lowercase, remove extra whitespace
        normalized = re.sub(r'\s+', ' ', stem.lower().strip())
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()

    def validate(self, question: Dict[str, Any]) -> ValidationResult:
        """
        Validate a single question

        Args:
            question: Question dictionary from generator

        Returns:
            ValidationResult with errors and warnings
        """
        result = ValidationResult(is_valid=True)

        # 1. Basic structure validation
        self._validate_structure(question, result)
        if not result.is_valid:
            return result

        # 2. Type-specific validation
        q_type = question.get('type', '')
        if q_type == 'single' or q_type == QuestionType.SINGLE_CHOICE.value:
            self._validate_single_choice(question, result)
        elif q_type == 'multiple' or q_type == QuestionType.MULTIPLE_CHOICE.value:
            self._validate_multiple_choice(question, result)
        elif q_type == 'blank' or q_type == QuestionType.FILL_BLANK.value:
            self._validate_fill_blank(question, result)
        elif q_type == 'short' or q_type == QuestionType.SHORT_ANSWER.value:
            self._validate_short_answer(question, result)
        else:
            result.add_error('type', f"Unknown question type: {q_type}")

        # 3. Duplicate detection
        self._check_duplicate(question, result)

        # 4. Content quality checks (warnings)
        self._check_content_quality(question, result)

        return result

    def validate_batch(self, questions: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], ValidationResult]]:
        """
        Validate a batch of questions

        Args:
            questions: List of question dictionaries

        Returns:
            List of (question, validation_result) tuples
        """
        self.reset_duplicates()
        results = []
        for q in questions:
            result = self.validate(q)
            results.append((q, result))
        return results

    def _validate_structure(self, question: Dict[str, Any], result: ValidationResult):
        """Validate basic question structure"""
        # Required fields
        required = ['type', 'stem', 'answer']
        for field in required:
            if field not in question or question[field] is None:
                result.add_error(field, f"Missing required field: {field}")

        # Stem must not be empty
        stem = question.get('stem', '')
        if isinstance(stem, str) and len(stem.strip()) < 5:
            result.add_error('stem', "Stem is too short (minimum 5 characters)")

        # Difficulty check
        difficulty = question.get('difficulty')
        if difficulty is not None:
            if not isinstance(difficulty, int) or difficulty < 1 or difficulty > 5:
                result.add_error('difficulty', "Difficulty must be an integer between 1 and 5")

        # Explanation should exist
        if not question.get('explanation'):
            result.add_warning('explanation', "Missing explanation")

    def _validate_single_choice(self, question: Dict[str, Any], result: ValidationResult):
        """Validate single choice question"""
        options = question.get('options')
        answer = question.get('answer')

        # Options must be a dict with at least 2 options
        if not isinstance(options, dict):
            result.add_error('options', "Options must be a dictionary (e.g., {'A': '...', 'B': '...'})")
            return

        if len(options) < 2:
            result.add_error('options', "Must have at least 2 options")
            return

        # Check all options have content
        for key, value in options.items():
            if not value or (isinstance(value, str) and len(value.strip()) == 0):
                result.add_error('options', f"Option {key} is empty")

        # Answer must be a valid option key
        if not isinstance(answer, str):
            result.add_error('answer', "Answer must be a string (option key like 'A', 'B', etc.)")
            return

        answer = answer.upper().strip()
        if answer not in options:
            result.add_error('answer', f"Answer '{answer}' is not in options: {list(options.keys())}")

    def _validate_multiple_choice(self, question: Dict[str, Any], result: ValidationResult):
        """Validate multiple choice question"""
        options = question.get('options')
        answer = question.get('answer')

        # Options must be a dict
        if not isinstance(options, dict):
            result.add_error('options', "Options must be a dictionary")
            return

        if len(options) < 3:
            result.add_error('options', "Multiple choice must have at least 3 options")
            return

        # Answer must be a list with at least 2 items
        if not isinstance(answer, list):
            result.add_error('answer', "Answer must be a list of option keys")
            return

        if len(answer) < 2:
            result.add_error('answer', "Multiple choice must have at least 2 correct answers")
            return

        # All answers must be valid option keys
        answer_set = set(a.upper().strip() if isinstance(a, str) else a for a in answer)
        option_keys = set(options.keys())

        invalid = answer_set - option_keys
        if invalid:
            result.add_error('answer', f"Invalid answer options: {invalid}")

        # Warning if all options are correct
        if answer_set == option_keys:
            result.add_warning('answer', "All options are marked as correct")

    def _validate_fill_blank(self, question: Dict[str, Any], result: ValidationResult):
        """Validate fill in the blank question"""
        stem = question.get('stem', '')
        answer = question.get('answer')

        # Count blanks in stem (using ____ pattern)
        blank_count = len(re.findall(r'_{2,}', stem))

        if blank_count == 0:
            result.add_error('stem', "No blanks found in stem (use ____ to mark blanks)")
            return

        # Answer should be a list matching blank count
        if isinstance(answer, str):
            # Single answer is OK if there's only one blank
            if blank_count > 1:
                result.add_error('answer', f"Expected {blank_count} answers (list), got single string")
        elif isinstance(answer, list):
            if len(answer) != blank_count:
                result.add_error('answer', f"Blank count ({blank_count}) doesn't match answer count ({len(answer)})")

            # Check each answer is not empty
            for i, ans in enumerate(answer):
                if not ans or (isinstance(ans, str) and len(ans.strip()) == 0):
                    result.add_error('answer', f"Answer {i+1} is empty")
        else:
            result.add_error('answer', "Answer must be a string or list of strings")

    def _validate_short_answer(self, question: Dict[str, Any], result: ValidationResult):
        """Validate short answer question"""
        answer = question.get('answer')

        # Answer must be a non-empty string
        if not isinstance(answer, str) or len(answer.strip()) < 10:
            result.add_error('answer', "Short answer must have a reference answer (at least 10 characters)")

        # Should have keywords or rubric for grading
        keywords = question.get('keywords')
        rubric = question.get('rubric')

        if not keywords and not rubric:
            result.add_warning('keywords', "Missing keywords or rubric for grading")

        if keywords and not isinstance(keywords, list):
            result.add_error('keywords', "Keywords must be a list")

        if keywords and len(keywords) < 2:
            result.add_warning('keywords', "Should have at least 2 keywords for proper grading")

    def _check_duplicate(self, question: Dict[str, Any], result: ValidationResult):
        """Check for duplicate questions"""
        stem = question.get('stem', '')
        if not stem:
            return

        stem_hash = self._compute_stem_hash(stem)

        if stem_hash in self._seen_hashes:
            result.add_error('stem', "Duplicate question detected (same or very similar stem)")
        else:
            self._seen_hashes.add(stem_hash)

    def _check_content_quality(self, question: Dict[str, Any], result: ValidationResult):
        """Check content quality (warnings only)"""
        stem = question.get('stem', '')

        # Check stem length
        if len(stem) < 15:
            result.add_warning('stem', "Stem seems too short for a good question")

        # Check for question mark in stem
        if '?' not in stem and '？' not in stem and '____' not in stem:
            result.add_warning('stem', "Stem might be missing a question mark")

        # Check explanation length
        explanation = question.get('explanation', '')
        if explanation and len(explanation) < 20:
            result.add_warning('explanation', "Explanation seems too brief")
