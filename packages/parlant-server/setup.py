#!/usr/bin/env python3
"""
Setup script for Parlant Server - Sim Integration
=================================================

This script helps set up the Parlant server for integration with Sim.
It handles dependency installation, environment configuration validation,
and basic testing of the integration.
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


class ParlantServerSetup:
    """Setup manager for Parlant Server installation and configuration"""

    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path(__file__).parent
        self.venv_path = self.project_root / "venv"
        self.requirements_file = self.project_root / "requirements.txt"
        self.env_example_file = self.project_root / ".env.example"
        self.env_file = self.project_root / ".env"

    def check_python_version(self) -> bool:
        """Check if Python version is compatible"""
        min_version = (3, 10)
        current_version = sys.version_info[:2]

        if current_version < min_version:
            logger.error(f"Python {min_version[0]}.{min_version[1]}+ is required. Current: {current_version[0]}.{current_version[1]}")
            return False

        logger.info(f"✅ Python version check passed: {current_version[0]}.{current_version[1]}")
        return True

    def check_virtual_environment(self) -> bool:
        """Check if we're in a virtual environment"""
        in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)

        if not in_venv:
            logger.warning("⚠️  Not running in a virtual environment")
            logger.info("Consider activating the virtual environment:")
            logger.info(f"  source {self.venv_path}/bin/activate")
        else:
            logger.info("✅ Running in virtual environment")

        return True

    def install_dependencies(self) -> bool:
        """Install Python dependencies"""
        if not self.requirements_file.exists():
            logger.error(f"Requirements file not found: {self.requirements_file}")
            return False

        try:
            logger.info("📦 Installing Python dependencies...")
            cmd = [sys.executable, "-m", "pip", "install", "-r", str(self.requirements_file)]
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                logger.error(f"Failed to install dependencies: {result.stderr}")
                return False

            logger.info("✅ Dependencies installed successfully")
            return True

        except Exception as e:
            logger.error(f"Error installing dependencies: {e}")
            return False

    def create_env_file(self) -> bool:
        """Create .env file from .env.example if it doesn't exist"""
        if self.env_file.exists():
            logger.info("✅ .env file already exists")
            return True

        if not self.env_example_file.exists():
            logger.error(f".env.example file not found: {self.env_example_file}")
            return False

        try:
            # Copy .env.example to .env
            with open(self.env_example_file, 'r') as example_file:
                content = example_file.read()

            with open(self.env_file, 'w') as env_file:
                env_file.write(content)

            logger.info("✅ .env file created from .env.example")
            logger.warning("⚠️  Please edit .env file with your actual configuration values")
            return True

        except Exception as e:
            logger.error(f"Error creating .env file: {e}")
            return False

    def validate_environment_config(self) -> Tuple[bool, List[str]]:
        """Validate environment configuration"""
        missing_vars = []
        warnings = []

        # Load .env file if it exists
        if self.env_file.exists():
            from dotenv import load_dotenv
            load_dotenv(self.env_file)

        # Required variables
        required_vars = [
            ('DATABASE_URL', 'PostgreSQL database connection URL'),
            ('POSTGRES_URL', 'Alternative PostgreSQL connection URL (Vercel)')
        ]

        # At least one database URL is required
        database_url = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
        if not database_url:
            missing_vars.append('DATABASE_URL or POSTGRES_URL is required')

        # At least one AI provider API key is required
        openai_key = os.getenv('OPENAI_API_KEY')
        anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        if not openai_key and not anthropic_key:
            missing_vars.append('At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY is required')

        # Optional but recommended variables
        recommended_vars = [
            ('BETTER_AUTH_SECRET', 'Shared secret for Sim authentication integration'),
            ('ALLOWED_ORIGINS', 'CORS origins for frontend integration')
        ]

        for var_name, description in recommended_vars:
            if not os.getenv(var_name):
                warnings.append(f'{var_name} is not set ({description})')

        # Validation results
        is_valid = len(missing_vars) == 0

        if is_valid:
            logger.info("✅ Environment configuration validation passed")
        else:
            logger.error("❌ Environment configuration validation failed")
            for missing in missing_vars:
                logger.error(f"  Missing: {missing}")

        if warnings:
            logger.warning("⚠️  Environment configuration warnings:")
            for warning in warnings:
                logger.warning(f"  {warning}")

        return is_valid, missing_vars

    def test_parlant_import(self) -> bool:
        """Test that Parlant SDK can be imported"""
        try:
            import parlant.sdk
            logger.info("✅ Parlant SDK import successful")
            return True
        except ImportError as e:
            logger.error(f"❌ Failed to import Parlant SDK: {e}")
            return False

    def test_server_creation(self) -> bool:
        """Test basic server configuration creation"""
        try:
            # Set minimal test environment
            os.environ.setdefault('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
            os.environ.setdefault('OPENAI_API_KEY', 'test_key')

            from parlant_server import SimParlantServerConfig, SimParlantServer

            config = SimParlantServerConfig()
            server = SimParlantServer(config)

            logger.info("✅ Server configuration and creation test passed")
            return True

        except Exception as e:
            logger.error(f"❌ Server creation test failed: {e}")
            return False

    def run_setup(self) -> bool:
        """Run complete setup process"""
        logger.info("🚀 Starting Parlant Server setup for Sim integration...")

        steps = [
            ("Checking Python version", self.check_python_version),
            ("Checking virtual environment", self.check_virtual_environment),
            ("Installing dependencies", self.install_dependencies),
            ("Creating .env file", self.create_env_file),
            ("Testing Parlant import", self.test_parlant_import),
            ("Testing server creation", self.test_server_creation)
        ]

        for step_name, step_func in steps:
            logger.info(f"\n📋 {step_name}...")
            if not step_func():
                logger.error(f"❌ Setup failed at: {step_name}")
                return False

        # Validate environment (non-blocking)
        logger.info("\n📋 Validating environment configuration...")
        is_valid, missing_vars = self.validate_environment_config()

        if not is_valid:
            logger.warning("⚠️  Environment validation failed, but setup can continue")
            logger.info("Please update your .env file with the required values")

        logger.info("\n🎉 Parlant Server setup completed successfully!")
        self.print_next_steps()

        return True

    def print_next_steps(self):
        """Print next steps for the user"""
        logger.info("\n📝 Next Steps:")
        logger.info("1. Edit .env file with your actual configuration:")
        logger.info(f"   - Database URL (same as your Sim application)")
        logger.info(f"   - OpenAI API key or Anthropic API key")
        logger.info(f"   - Better Auth secret (same as Sim)")
        logger.info("")
        logger.info("2. Test the server:")
        logger.info("   python parlant_server.py")
        logger.info("")
        logger.info("3. Or run via main.py for integration:")
        logger.info("   python main.py")
        logger.info("")
        logger.info("4. Access API documentation:")
        logger.info("   http://localhost:8800/docs (Parlant)")
        logger.info("   http://localhost:8001/docs (FastAPI bridge)")


def main():
    """Main setup entry point"""
    setup = ParlantServerSetup()

    try:
        success = setup.run_setup()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\n⏹️  Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error during setup: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()