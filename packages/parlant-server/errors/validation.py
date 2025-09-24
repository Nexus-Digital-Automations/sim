"""
Input Validation System for Parlant Integration

Comprehensive validation for all agent management APIs, workspace operations,
and integration endpoints with detailed error reporting.
"""

import re
import logging
from typing import Dict, Any, List, Optional, Union, Callable, Type
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

from .handlers import handle_validation_error


logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Base validation error for internal use"""
    pass


class ValidationType(Enum):
    """Types of validation rules"""
    REQUIRED = "required"
    TYPE = "type"
    MIN_LENGTH = "min_length"
    MAX_LENGTH = "max_length"
    PATTERN = "pattern"
    CHOICE = "choice"
    RANGE = "range"
    CUSTOM = "custom"


@dataclass
class ValidationRule:
    """Individual validation rule"""
    rule_type: ValidationType
    value: Any = None
    message: Optional[str] = None
    validator: Optional[Callable] = None


class InputValidator:
    """
    Comprehensive input validation system for Parlant integration APIs.

    Provides fluent interface for building validation rules and detailed
    error reporting for API endpoints.
    """

    def __init__(self):
        self.rules: Dict[str, List[ValidationRule]] = {}
        self.errors: Dict[str, List[str]] = {}

    def field(self, field_name: str) -> 'FieldValidator':
        """Start validation for a specific field"""
        if field_name not in self.rules:
            self.rules[field_name] = []
        return FieldValidator(self, field_name)

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate data against all defined rules.

        Args:
            data: Data dictionary to validate

        Returns:
            Validated and cleaned data

        Raises:
            ParlantValidationError: If validation fails
        """
        self.errors.clear()

        # Apply validation rules
        for field_name, field_rules in self.rules.items():
            field_value = data.get(field_name)
            field_errors = []

            for rule in field_rules:
                error_message = self._apply_rule(field_name, field_value, rule)
                if error_message:
                    field_errors.append(error_message)

            if field_errors:
                self.errors[field_name] = field_errors

        # Raise validation error if any errors found
        if self.errors:
            error_summary = f"Validation failed for {len(self.errors)} field(s)"
            raise handle_validation_error(
                message=error_summary,
                field_errors=self.errors
            )

        return data

    def _apply_rule(self, field_name: str, field_value: Any, rule: ValidationRule) -> Optional[str]:
        """Apply a single validation rule"""
        try:
            if rule.rule_type == ValidationType.REQUIRED:
                if field_value is None or field_value == "":
                    return rule.message or "This field is required"

            elif rule.rule_type == ValidationType.TYPE:
                if field_value is not None and not isinstance(field_value, rule.value):
                    return rule.message or f"Expected {rule.value.__name__}, got {type(field_value).__name__}"

            elif rule.rule_type == ValidationType.MIN_LENGTH:
                if field_value is not None and len(str(field_value)) < rule.value:
                    return rule.message or f"Minimum length is {rule.value}"

            elif rule.rule_type == ValidationType.MAX_LENGTH:
                if field_value is not None and len(str(field_value)) > rule.value:
                    return rule.message or f"Maximum length is {rule.value}"

            elif rule.rule_type == ValidationType.PATTERN:
                if field_value is not None and not re.match(rule.value, str(field_value)):
                    return rule.message or "Invalid format"

            elif rule.rule_type == ValidationType.CHOICE:
                if field_value is not None and field_value not in rule.value:
                    return rule.message or f"Must be one of: {', '.join(map(str, rule.value))}"

            elif rule.rule_type == ValidationType.RANGE:
                if field_value is not None:
                    min_val, max_val = rule.value
                    if not (min_val <= field_value <= max_val):
                        return rule.message or f"Must be between {min_val} and {max_val}"

            elif rule.rule_type == ValidationType.CUSTOM:
                if rule.validator and not rule.validator(field_value):
                    return rule.message or "Custom validation failed"

        except Exception as e:
            logger.error(f"Validation rule error for field {field_name}: {e}")
            return "Validation error occurred"

        return None


class FieldValidator:
    """Fluent interface for field validation rules"""

    def __init__(self, validator: InputValidator, field_name: str):
        self.validator = validator
        self.field_name = field_name

    def required(self, message: Optional[str] = None) -> 'FieldValidator':
        """Field is required"""
        self.validator.rules[self.field_name].append(
            ValidationRule(ValidationType.REQUIRED, message=message)
        )
        return self

    def type(self, expected_type: Type, message: Optional[str] = None) -> 'FieldValidator':
        """Field must be of specific type"""
        self.validator.rules[self.field_name].append(
            ValidationRule(ValidationType.TYPE, expected_type, message)
        )
        return self

    def min_length(self, min_len: int, message: Optional[str] = None) -> 'FieldValidator':
        """Field must have minimum length"""
        self.validator.rules[self.field_name].append(
            ValidationRule(ValidationType.MIN_LENGTH, min_len, message)
        )
        return self

    def max_length(self, max_len: int, message: Optional[str] = None) -> 'FieldValidator':
        """Field must not exceed maximum length"""
        self.validator.rules[self.field_name].append(
            ValidationRule(ValidationType.MAX_LENGTH, max_len, message)
        )
        return self

    def pattern(self, regex_pattern: str, message: Optional[str] = None) -> 'FieldValidator':
        """Field must match regex pattern"""
        self.validator.rules[self.field_name].append(
            ValidationRule(ValidationType.PATTERN, regex_pattern, message)
        )
        return self

    def choices(self, valid_choices: List[Any], message: Optional[str] = None) -> 'FieldValidator':
        """Field must be one of valid choices"""
        self.validator.rules[self.field_name].append(
            ValidationRule(ValidationType.CHOICE, valid_choices, message)
        )
        return self

    def range(self, min_val: Union[int, float], max_val: Union[int, float], message: Optional[str] = None) -> 'FieldValidator':
        """Field must be within numeric range"""
        self.validator.rules[self.field_name].append(
            ValidationRule(ValidationType.RANGE, (min_val, max_val), message)
        )
        return self

    def custom(self, validator_func: Callable[[Any], bool], message: Optional[str] = None) -> 'FieldValidator':
        """Custom validation function"""
        self.validator.rules[self.field_name].append(
            ValidationRule(ValidationType.CUSTOM, validator=validator_func, message=message)
        )
        return self

    def email(self, message: Optional[str] = None) -> 'FieldValidator':
        """Field must be valid email address"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return self.pattern(email_pattern, message or "Invalid email address")

    def url(self, message: Optional[str] = None) -> 'FieldValidator':
        """Field must be valid URL"""
        url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
        return self.pattern(url_pattern, message or "Invalid URL")

    def uuid(self, message: Optional[str] = None) -> 'FieldValidator':
        """Field must be valid UUID"""
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return self.pattern(uuid_pattern, message or "Invalid UUID format")


class AgentValidator:
    """Validator for agent creation and management operations"""

    @staticmethod
    def validate_agent_creation(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate agent creation data"""
        validator = InputValidator()

        # Core agent fields
        validator.field('name').required().type(str).min_length(1).max_length(100)
        validator.field('description').type(str).max_length(500)
        validator.field('model_provider').required().choices(['openai', 'anthropic'])
        validator.field('model_name').required().type(str).min_length(1)
        validator.field('temperature').type(int).range(0, 100)
        validator.field('max_tokens').type(int).range(1, 32000)
        validator.field('system_prompt').type(str).max_length(2000)
        validator.field('composition_mode').choices(['full_system', 'structured', 'tool_calling'])

        # Workspace context
        validator.field('workspace_id').required().uuid()

        # Optional configuration
        validator.field('guidelines').type(list)
        validator.field('tools').type(list)
        validator.field('journeys').type(list)

        return validator.validate(data)

    @staticmethod
    def validate_agent_update(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate agent update data"""
        validator = InputValidator()

        # Allow partial updates - no required fields except agent_id
        validator.field('agent_id').required().uuid()

        # Optional fields with same constraints as creation
        if 'name' in data:
            validator.field('name').type(str).min_length(1).max_length(100)
        if 'description' in data:
            validator.field('description').type(str).max_length(500)
        if 'model_provider' in data:
            validator.field('model_provider').choices(['openai', 'anthropic'])
        if 'model_name' in data:
            validator.field('model_name').type(str).min_length(1)
        if 'temperature' in data:
            validator.field('temperature').type(int).range(0, 100)
        if 'max_tokens' in data:
            validator.field('max_tokens').type(int).range(1, 32000)
        if 'system_prompt' in data:
            validator.field('system_prompt').type(str).max_length(2000)
        if 'composition_mode' in data:
            validator.field('composition_mode').choices(['full_system', 'structured', 'tool_calling'])

        return validator.validate(data)


class SessionValidator:
    """Validator for session management operations"""

    @staticmethod
    def validate_session_creation(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate session creation data"""
        validator = InputValidator()

        validator.field('agent_id').required().uuid()
        validator.field('workspace_id').required().uuid()
        validator.field('session_name').type(str).max_length(200)
        validator.field('initial_message').type(str).max_length(1000)
        validator.field('context').type(dict)

        return validator.validate(data)

    @staticmethod
    def validate_message_send(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate message sending data"""
        validator = InputValidator()

        validator.field('session_id').required().uuid()
        validator.field('message').required().type(str).min_length(1).max_length(4000)
        validator.field('message_type').choices(['user', 'system', 'tool'])

        return validator.validate(data)


class WorkspaceValidator:
    """Validator for workspace-related operations"""

    @staticmethod
    def validate_workspace_access(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate workspace access request"""
        validator = InputValidator()

        validator.field('workspace_id').required().uuid()
        validator.field('user_id').required().uuid()
        validator.field('required_permissions').type(list)

        return validator.validate(data)

    @staticmethod
    def validate_workspace_context(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate workspace context data"""
        validator = InputValidator()

        validator.field('workspace_id').required().uuid()
        validator.field('name').type(str).max_length(100)
        validator.field('settings').type(dict)
        validator.field('member_count').type(int).range(0, 1000)

        return validator.validate(data)


# Helper functions for common validation scenarios

def validate_pagination_params(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    max_limit: int = 100
) -> Dict[str, int]:
    """
    Validate pagination parameters.

    Args:
        page: Page number (1-based)
        limit: Items per page
        max_limit: Maximum allowed limit

    Returns:
        Validated pagination parameters
    """
    validator = InputValidator()

    data = {}
    if page is not None:
        data['page'] = page
        validator.field('page').type(int).range(1, 10000)

    if limit is not None:
        data['limit'] = limit
        validator.field('limit').type(int).range(1, max_limit)

    validated_data = validator.validate(data)

    # Set defaults
    return {
        'page': validated_data.get('page', 1),
        'limit': validated_data.get('limit', 20)
    }


def validate_sort_params(
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    allowed_sort_fields: Optional[List[str]] = None
) -> Dict[str, str]:
    """
    Validate sorting parameters.

    Args:
        sort_by: Field to sort by
        sort_order: Sort direction (asc/desc)
        allowed_sort_fields: List of allowed sort fields

    Returns:
        Validated sort parameters
    """
    validator = InputValidator()

    data = {}
    if sort_by is not None:
        data['sort_by'] = sort_by
        if allowed_sort_fields:
            validator.field('sort_by').choices(allowed_sort_fields)
        else:
            validator.field('sort_by').type(str).min_length(1)

    if sort_order is not None:
        data['sort_order'] = sort_order
        validator.field('sort_order').choices(['asc', 'desc'])

    validated_data = validator.validate(data)

    # Set defaults
    return {
        'sort_by': validated_data.get('sort_by', 'created_at'),
        'sort_order': validated_data.get('sort_order', 'desc')
    }


def validate_filter_params(filters: Dict[str, Any], allowed_filters: Dict[str, Type]) -> Dict[str, Any]:
    """
    Validate filter parameters.

    Args:
        filters: Filter parameters to validate
        allowed_filters: Dictionary of allowed filter names and their types

    Returns:
        Validated filter parameters
    """
    validator = InputValidator()

    # Only validate filters that are in the allowed list
    valid_filters = {}
    for filter_name, filter_value in filters.items():
        if filter_name in allowed_filters:
            valid_filters[filter_name] = filter_value
            validator.field(filter_name).type(allowed_filters[filter_name])

    return validator.validate(valid_filters)


def sanitize_string_input(input_str: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize string input for security.

    Args:
        input_str: String to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not isinstance(input_str, str):
        return ""

    # Basic sanitization
    sanitized = input_str.strip()

    # Remove null bytes and control characters
    sanitized = ''.join(char for char in sanitized if ord(char) >= 32 or char in '\n\r\t')

    # Truncate if necessary
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    return sanitized


def validate_json_data(data: Any, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Validate JSON data structure.

    Args:
        data: Data to validate
        schema: Optional JSON schema for validation

    Returns:
        Validated data

    Raises:
        ParlantValidationError: If validation fails
    """
    if not isinstance(data, dict):
        raise handle_validation_error(
            message="Request body must be a JSON object",
            error_code="INVALID_JSON"
        )

    # If schema is provided, validate against it
    if schema:
        # This could be extended to use jsonschema library
        # For now, just basic validation
        pass

    return data