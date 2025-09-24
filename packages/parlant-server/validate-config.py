#!/usr/bin/env python3

"""
Parlant Server Configuration Validation Script (Python)
=======================================================

Validates environment variables for Parlant server setup
Ensures all required configuration is present and valid
Compatible with Python-based Parlant server implementation
"""

import os
import sys
import re
from typing import Dict, List, Tuple, Optional, Callable
from urllib.parse import urlparse
import argparse

# Configuration validation rules
CONFIG_RULES = {
    'required': [
        'DATABASE_URL',
        'PARLANT_HOST',
        'PARLANT_PORT',
        'AI_PROVIDER',
        'OPENAI_API_KEY',
        'SIM_API_URL',
        'SIM_API_KEY',
    ],
    'optional': [
        'DEBUG',
        'AI_MODEL',
        'LOG_LEVEL',
        'SESSION_TIMEOUT',
        'SESSION_STORAGE',
        'MAX_CONCURRENT_SESSIONS',
        'CACHE_TTL',
        'ANTHROPIC_API_KEY',
        'CEREBRAS_API_KEY',
    ],
    'validation': {
        'PARLANT_PORT': lambda value: 1000 <= int(value) <= 65535,
        'DATABASE_URL': lambda value: value.startswith(('postgresql://', 'postgres://')),
        'SIM_API_URL': lambda value: value.startswith(('http://', 'https://')),
        'AI_PROVIDER': lambda value: value.lower() in ['openai', 'anthropic', 'cerebras', 'ollama'],
        'LOG_LEVEL': lambda value: value.upper() in ['DEBUG', 'INFO', 'WARN', 'ERROR'],
        'SESSION_TIMEOUT': lambda value: 300 <= int(value) <= 86400,  # 5 minutes to 24 hours
        'MAX_CONCURRENT_SESSIONS': lambda value: 1 <= int(value) <= 10000,
        'CACHE_TTL': lambda value: 60 <= int(value) <= 3600,  # 1 minute to 1 hour
        'DEBUG': lambda value: value.lower() in ['true', 'false', '1', '0', 'yes', 'no'],
    }
}

def load_env_file(env_path: str) -> Dict[str, str]:
    """Load environment variables from file."""
    if not os.path.exists(env_path):
        raise FileNotFoundError(f"Environment file not found: {env_path}")

    env_vars = {}

    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()

    return env_vars

def validate_config(config: Dict[str, str], environment: str = 'development') -> Tuple[List[str], List[str]]:
    """Validate configuration and return errors and warnings."""
    errors = []
    warnings = []

    print(f"\n🔍 Validating Parlant {environment} configuration...\n")

    # Check required variables
    for key in CONFIG_RULES['required']:
        if not config.get(key):
            errors.append(f"❌ Missing required variable: {key}")
        else:
            print(f"✅ {key}: Present")

    # Validate variable formats
    for key, validator in CONFIG_RULES['validation'].items():
        if config.get(key):
            try:
                if not validator(config[key]):
                    errors.append(f"❌ Invalid format for {key}: {config[key]}")
                else:
                    print(f"✅ {key}: Valid format")
            except (ValueError, TypeError) as e:
                errors.append(f"❌ Validation error for {key}: {str(e)}")

    # Environment-specific validations
    if environment == 'production':
        if config.get('DEBUG', '').lower() in ['true', '1', 'yes']:
            warnings.append("⚠️  DEBUG is enabled in production")
        if config.get('LOG_LEVEL', '').upper() == 'DEBUG':
            warnings.append("⚠️  LOG_LEVEL is DEBUG in production")

    # AI Provider specific checks
    ai_provider = config.get('AI_PROVIDER', '').lower()
    if ai_provider == 'openai' and not config.get('OPENAI_API_KEY'):
        errors.append("❌ OPENAI_API_KEY required when AI_PROVIDER is openai")

    if ai_provider == 'anthropic' and not config.get('ANTHROPIC_API_KEY'):
        errors.append("❌ ANTHROPIC_API_KEY required when AI_PROVIDER is anthropic")

    # Database connectivity check
    if config.get('DATABASE_URL'):
        try:
            parsed = urlparse(config['DATABASE_URL'])
            if not parsed.hostname or not parsed.port:
                warnings.append("⚠️  DATABASE_URL missing hostname or port")
        except Exception as e:
            errors.append(f"❌ Invalid DATABASE_URL format: {str(e)}")

    # Check for common configuration issues
    if config.get('SESSION_STORAGE') == 'postgresql' and not config.get('DATABASE_URL'):
        errors.append("❌ SESSION_STORAGE is postgresql but DATABASE_URL is missing")

    return errors, warnings

def check_python_requirements():
    """Check if Python requirements are met."""
    python_version = sys.version_info
    if python_version < (3, 7):
        print("❌ Python 3.7+ required for Parlant server")
        return False

    # Check for common required packages (basic check)
    try:
        import asyncio
        import logging
        print("✅ Python requirements check passed")
        return True
    except ImportError as e:
        print(f"⚠️  Missing Python module: {e}")
        return True  # Non-fatal for validation

def main():
    """Main validation function."""
    parser = argparse.ArgumentParser(description='Validate Parlant server configuration')
    parser.add_argument('environment', nargs='?', default='development',
                       help='Environment to validate (development, staging, production, example)')
    parser.add_argument('--check-python', action='store_true',
                       help='Also check Python requirements')

    args = parser.parse_args()
    environment = args.environment

    try:
        print("\n🚀 Parlant Server Configuration Validator")
        print(f"📋 Environment: {environment}")

        # Python requirements check
        if args.check_python:
            print("\n🐍 Checking Python requirements...")
            check_python_requirements()

        # Determine env file path
        script_dir = os.path.dirname(os.path.abspath(__file__))

        if environment == 'example':
            env_file = os.path.join(script_dir, '.env.example')
        else:
            env_file = os.path.join(script_dir, f'.env.{environment}')

        # Check if specific env file exists, fallback to .env
        if not os.path.exists(env_file):
            env_file = os.path.join(script_dir, '.env')
            if not os.path.exists(env_file):
                raise FileNotFoundError(f"No environment file found for '{environment}' environment")

        print(f"📄 Loading: {env_file}")

        # Load and validate configuration
        config = load_env_file(env_file)
        errors, warnings = validate_config(config, environment)

        # Display results
        print(f"\n📊 Validation Results:")
        print(f"   • Variables loaded: {len(config)}")
        print(f"   • Errors: {len(errors)}")
        print(f"   • Warnings: {len(warnings)}")

        if warnings:
            print(f"\n⚠️  Warnings:")
            for warning in warnings:
                print(f"   {warning}")

        if errors:
            print(f"\n❌ Errors:")
            for error in errors:
                print(f"   {error}")
            print(f"\n💡 Fix these errors before starting Parlant server")
            sys.exit(1)
        else:
            print(f"\n✨ Configuration validation passed!")
            print(f"🎉 Parlant server is ready to start with {environment} configuration\n")

            # Display next steps
            print("📋 Next steps:")
            print("   1. Copy .env.example to .env and fill in your values")
            print("   2. Install Parlant: pip install parlant")
            print("   3. Start the server: python your_parlant_server.py")

    except Exception as e:
        print(f"\n💥 Validation failed: {str(e)}\n")
        sys.exit(1)

if __name__ == '__main__':
    main()