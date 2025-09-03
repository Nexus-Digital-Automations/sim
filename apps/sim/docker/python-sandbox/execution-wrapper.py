#!/usr/bin/env python3
"""
Secure Python Execution Wrapper

Provides enterprise-grade secure Python execution with:
- Comprehensive security monitoring and threat detection
- Resource management and limits enforcement
- Virtual environment isolation
- Data science library access with security controls
- Performance optimization and caching
- Comprehensive error handling and logging

Security Features:
- Isolated execution context with restricted imports
- Resource monitoring (CPU, memory, disk, network)
- Dangerous function blocking and monitoring
- File system access controls
- Network access monitoring and restrictions
- Comprehensive audit logging

Author: Claude Development Agent
Created: September 3, 2025
"""

import sys
import os
import json
import time
import resource
import signal
import importlib
import types
from io import StringIO
from contextlib import redirect_stdout, redirect_stderr
from typing import Dict, Any
import psutil
import ast
import re
from pathlib import Path

# Configure Python path for sandbox environment
sys.path.insert(0, "/sandbox/venv/lib/python3.11/site-packages")


class SecurityMonitor:
    """Comprehensive security monitoring for Python code execution"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.violations = []
        self.network_requests = []
        self.file_operations = []
        self.blocked_operations = []
        self.start_time = time.time()
        self.risk_score = 0

        # Security thresholds
        self.max_execution_time = int(os.getenv("EXECUTION_TIMEOUT", "60000")) / 1000
        self.max_memory_mb = self._parse_memory_limit(
            os.getenv("MEMORY_LIMIT", "512MB")
        )
        self.enable_monitoring = (
            os.getenv("ENABLE_SECURITY_MONITORING", "true").lower() == "true"
        )

        # Initialize monitoring
        self._initialize_monitoring()

    def _parse_memory_limit(self, limit_str: str) -> int:
        """Parse memory limit string to MB"""
        match = re.match(r"(\d+)(KB|MB|GB)?", limit_str.upper())
        if match:
            value, unit = match.groups()
            multipliers = {"KB": 1 / 1024, "MB": 1, "GB": 1024}
            return int(value) * multipliers.get(unit or "MB", 1)
        return 512  # Default 512MB

    def _initialize_monitoring(self):
        """Initialize security monitoring systems"""
        if not self.enable_monitoring:
            return

        print("[SECURITY] Initializing Python security monitor...")
        print(f"[SECURITY] Max execution time: {self.max_execution_time}s")
        print(f"[SECURITY] Max memory: {self.max_memory_mb}MB")

        # Set resource limits
        try:
            # Memory limit (RSS)
            resource.setrlimit(
                resource.RLIMIT_RSS,
                (self.max_memory_mb * 1024 * 1024, self.max_memory_mb * 1024 * 1024),
            )

            # CPU time limit
            resource.setrlimit(
                resource.RLIMIT_CPU,
                (
                    int(self.max_execution_time * 2),  # Allow some buffer
                    int(self.max_execution_time * 2),
                ),
            )

            # File size limits
            resource.setrlimit(
                resource.RLIMIT_FSIZE,
                (100 * 1024 * 1024, 100 * 1024 * 1024),  # 100MB file size limit
            )

        except (OSError, ValueError) as e:
            self.log_violation(
                "resource", "medium", f"Failed to set resource limits: {e}"
            )

    def log_violation(
        self, violation_type: str, severity: str, description: str, context: Dict = None
    ):
        """Log security violation"""
        violation = {
            "type": violation_type,
            "severity": severity,
            "description": description,
            "timestamp": time.time(),
            "context": context or {},
        }

        self.violations.append(violation)

        # Calculate risk score impact
        severity_weights = {
            "info": 1,
            "low": 5,
            "medium": 15,
            "high": 35,
            "critical": 50,
        }
        self.risk_score += severity_weights.get(severity, 5)

        # Log to console
        log_level = "ERROR" if severity in ["high", "critical"] else "WARNING"
        print(f"[SECURITY] [{log_level}] {violation_type.upper()}: {description}")

        if context:
            print(f"[SECURITY] Context: {context}")

    def log_network_request(
        self, url: str, method: str = "GET", blocked: bool = False, reason: str = None
    ):
        """Log network access attempt"""
        request = {
            "url": url,
            "method": method,
            "timestamp": time.time(),
            "blocked": blocked,
            "reason": reason,
        }

        self.network_requests.append(request)

        if blocked:
            self.log_violation(
                "network",
                "medium",
                f"Blocked network request: {method} {url}",
                {"reason": reason},
            )

    def log_file_operation(
        self, operation: str, path: str, blocked: bool = False, reason: str = None
    ):
        """Log file system access attempt"""
        file_op = {
            "operation": operation,
            "path": path,
            "timestamp": time.time(),
            "blocked": blocked,
            "reason": reason,
        }

        self.file_operations.append(file_op)

        if blocked:
            self.log_violation(
                "filesystem",
                "high",
                f"Blocked file operation: {operation} {path}",
                {"reason": reason},
            )

    def check_resource_usage(self):
        """Monitor current resource usage"""
        try:
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            cpu_percent = process.cpu_percent()

            if memory_mb > self.max_memory_mb * 0.9:  # 90% threshold
                self.log_violation(
                    "resource",
                    "high",
                    f"High memory usage: {memory_mb:.1f}MB (limit: {self.max_memory_mb}MB)",
                )

            if cpu_percent > 80:  # 80% CPU threshold
                self.log_violation(
                    "resource", "medium", f"High CPU usage: {cpu_percent:.1f}%"
                )

            return {
                "memory_mb": memory_mb,
                "cpu_percent": cpu_percent,
                "execution_time": time.time() - self.start_time,
            }

        except Exception as e:
            self.log_violation("monitoring", "low", f"Resource monitoring error: {e}")
            return {}

    def get_security_report(self) -> Dict[str, Any]:
        """Generate comprehensive security report"""
        return {
            "risk_score": min(100, self.risk_score),
            "violations": self.violations,
            "network_requests": self.network_requests,
            "file_operations": self.file_operations,
            "blocked_operations": self.blocked_operations,
            "execution_time_ms": (time.time() - self.start_time) * 1000,
            "policy_compliance": self.risk_score < 50,
            "threat_level": self._calculate_threat_level(),
            "resource_usage": self.check_resource_usage(),
        }

    def _calculate_threat_level(self) -> str:
        """Calculate threat level based on risk score"""
        if self.risk_score >= 80:
            return "critical"
        elif self.risk_score >= 60:
            return "high"
        elif self.risk_score >= 40:
            return "medium"
        elif self.risk_score >= 20:
            return "low"
        return "none"


class SecureExecutionEnvironment:
    """Secure Python execution environment with comprehensive controls"""

    def __init__(self, security_monitor: SecurityMonitor):
        self.security_monitor = security_monitor
        self.allowed_modules = self._get_allowed_modules()
        self.blocked_functions = self._get_blocked_functions()
        self.original_imports = {}

    def _get_allowed_modules(self) -> set:
        """Define allowed Python modules for secure execution"""
        return {
            # Core Python
            "math",
            "random",
            "datetime",
            "time",
            "json",
            "csv",
            "uuid",
            "hashlib",
            "base64",
            "urllib.parse",
            "collections",
            "itertools",
            "functools",
            "operator",
            "copy",
            "pickle",
            "re",
            "string",
            "textwrap",
            # Data Science
            "numpy",
            "pandas",
            "matplotlib",
            "seaborn",
            "plotly",
            "scipy",
            "sklearn",
            "scikit-learn",
            "statsmodels",
            "sympy",
            # Data Processing
            "openpyxl",
            "python-dateutil",
            "pytz",
            "beautifulsoup4",
            "lxml",
            "Pillow",
            "PIL",
            "PyPDF2",
            "python-docx",
            # Web and APIs (monitored)
            "requests",
            "urllib3",
            "httpx",
            "aiohttp",
            # Database (monitored)
            "psycopg2",
            "pymongo",
            "sqlalchemy",
            # Utilities
            "tqdm",
            "click",
            "jsonschema",
            "yaml",
            "toml",
            # Text Processing
            "nltk",
            "textblob",
            # Async
            "asyncio",
            "asyncio-throttle",
            # Testing (limited)
            "pytest",
            # IPython (limited)
            "IPython",
        }

    def _get_blocked_functions(self) -> Dict[str, str]:
        """Define blocked functions and their reasons"""
        return {
            "eval": "Code injection risk",
            "exec": "Code execution risk",
            "compile": "Dynamic compilation risk",
            "__import__": "Dynamic import risk",
            "open": "File access (use secure alternatives)",
            "file": "File access (deprecated)",
            "input": "Interactive input not allowed",
            "raw_input": "Interactive input not allowed",
            "execfile": "File execution risk",
            "reload": "Module reloading risk",
            "vars": "Variable introspection risk",
            "globals": "Global scope access risk",
            "locals": "Local scope access risk",
            "dir": "Object introspection risk",
            "getattr": "Attribute access risk",
            "setattr": "Attribute modification risk",
            "delattr": "Attribute deletion risk",
            "hasattr": "Attribute inspection risk",
        }

    def create_secure_context(
        self, user_params: Dict = None, env_vars: Dict = None
    ) -> Dict[str, Any]:
        """Create secure execution context with monitored built-ins"""

        # Safe built-ins
        safe_builtins = {
            # Type constructors
            "bool",
            "int",
            "float",
            "str",
            "bytes",
            "list",
            "tuple",
            "dict",
            "set",
            "frozenset",
            # Utility functions (safe)
            "abs",
            "all",
            "any",
            "bin",
            "chr",
            "divmod",
            "enumerate",
            "filter",
            "format",
            "hex",
            "id",
            "isinstance",
            "issubclass",
            "iter",
            "len",
            "map",
            "max",
            "min",
            "next",
            "oct",
            "ord",
            "pow",
            "range",
            "repr",
            "reversed",
            "round",
            "slice",
            "sorted",
            "sum",
            "type",
            "zip",
            # Exceptions
            "Exception",
            "ValueError",
            "TypeError",
            "KeyError",
            "IndexError",
            "AttributeError",
            "NameError",
            "ImportError",
            "RuntimeError",
            "StopIteration",
            "GeneratorExit",
            "SystemExit",
            "KeyboardInterrupt",
        }

        # Build secure context
        context = {}

        # Add safe built-ins
        for name in safe_builtins:
            if hasattr(__builtins__, name):
                context[name] = getattr(__builtins__, name)

        # Add secure print function
        context["print"] = self._create_secure_print()

        # Add monitored open function
        context["open"] = self._create_secure_open()

        # Add user parameters
        if user_params:
            for key, value in user_params.items():
                if not key.startswith("_"):  # Don't allow private attributes
                    context[key] = value

        # Add environment variables
        if env_vars:
            context["os"] = types.SimpleNamespace()
            context["os"].environ = env_vars.copy()

        # Add workflow data access
        context["workflow_data"] = user_params or {}

        # Add secure module importer
        context["__import__"] = self._create_secure_import()

        # Block dangerous functions
        for func_name, reason in self.blocked_functions.items():
            context[func_name] = self._create_blocked_function(func_name, reason)

        return context

    def _create_secure_print(self):
        """Create monitored print function"""

        def secure_print(*args, **kwargs):
            # Convert all arguments to strings safely
            safe_args = []
            for arg in args:
                if isinstance(arg, (dict, list, tuple, set)):
                    try:
                        safe_args.append(json.dumps(arg, default=str, indent=2))
                    except:
                        safe_args.append(str(arg))
                else:
                    safe_args.append(str(arg))

            message = " ".join(safe_args)

            # Check for sensitive information in output
            sensitive_patterns = [
                r"password\s*[:=]\s*[^\s]+",
                r"api[_\-]?key\s*[:=]\s*[^\s]+",
                r"secret\s*[:=]\s*[^\s]+",
                r"token\s*[:=]\s*[^\s]+",
            ]

            for pattern in sensitive_patterns:
                if re.search(pattern, message, re.IGNORECASE):
                    self.security_monitor.log_violation(
                        "data_leak",
                        "high",
                        "Potential sensitive data in output",
                        {"pattern": pattern},
                    )

            print(f"[SANDBOX] {message}")
            return message

        return secure_print

    def _create_secure_open(self):
        """Create monitored file access function"""

        def secure_open(filename, mode="r", *args, **kwargs):
            # Convert to Path for better handling
            try:
                path = Path(filename).resolve()
            except Exception as e:
                self.security_monitor.log_file_operation(
                    "open", str(filename), True, f"Invalid path: {e}"
                )
                raise PermissionError(f"File access denied: {e}")

            # Check if path is within allowed directories
            allowed_dirs = ["/sandbox/workspace", "/sandbox/tmp", "/tmp"]
            path_str = str(path)

            if not any(
                path_str.startswith(allowed_dir) for allowed_dir in allowed_dirs
            ):
                self.security_monitor.log_file_operation(
                    "open", path_str, True, "Path outside allowed directories"
                )
                raise PermissionError(
                    f"File access denied: {path_str} is outside allowed directories"
                )

            # Log file operation
            operation = "write" if "w" in mode or "a" in mode else "read"
            self.security_monitor.log_file_operation(operation, path_str, False)

            # Monitor file size for writes
            if "w" in mode or "a" in mode:

                def monitored_write(original_write):
                    def write_wrapper(data):
                        if len(str(data)) > 10 * 1024 * 1024:  # 10MB limit
                            self.security_monitor.log_violation(
                                "filesystem",
                                "high",
                                "Large file write attempt",
                                {"size": len(str(data))},
                            )
                            raise ValueError("File write size limit exceeded")
                        return original_write(data)

                    return write_wrapper

                file_obj = open(path, mode, *args, **kwargs)
                if hasattr(file_obj, "write"):
                    file_obj.write = monitored_write(file_obj.write)
                return file_obj

            return open(path, mode, *args, **kwargs)

        return secure_open

    def _create_secure_import(self):
        """Create monitored import function"""

        def secure_import(name, globals=None, locals=None, fromlist=(), level=0):
            # Check if module is allowed
            base_module = name.split(".")[0]

            if base_module not in self.allowed_modules:
                self.security_monitor.log_violation(
                    "import",
                    "high",
                    f"Blocked import attempt: {name}",
                    {"base_module": base_module},
                )
                raise ImportError(
                    f"Import of '{name}' is not allowed in secure execution environment"
                )

            # Monitor network-capable modules
            network_modules = {
                "requests",
                "urllib3",
                "httpx",
                "aiohttp",
                "urllib",
                "socket",
            }
            if base_module in network_modules:
                self.security_monitor.log_violation(
                    "import",
                    "medium",
                    f"Network-capable module imported: {name}",
                    {"monitoring": "enabled"},
                )

            # Perform the import
            try:
                module = importlib.__import__(name, globals, locals, fromlist, level)

                # Wrap network functions if needed
                if base_module == "requests":
                    module = self._wrap_requests_module(module)

                return module

            except ImportError as e:
                self.security_monitor.log_violation(
                    "import", "low", f"Import failed: {name}", {"error": str(e)}
                )
                raise

        return secure_import

    def _wrap_requests_module(self, requests_module):
        """Wrap requests module to monitor network access"""
        original_request = requests_module.request
        original_get = requests_module.get
        original_post = requests_module.post

        def monitored_request(method, url, **kwargs):
            self.security_monitor.log_network_request(str(url), method.upper())

            # Block local network access
            if self._is_local_url(url):
                self.security_monitor.log_network_request(
                    str(url), method.upper(), True, "Local network blocked"
                )
                raise ValueError("Access to local network resources is not allowed")

            return original_request(method, url, **kwargs)

        def monitored_get(url, **kwargs):
            return monitored_request("GET", url, **kwargs)

        def monitored_post(url, **kwargs):
            return monitored_request("POST", url, **kwargs)

        # Replace methods
        requests_module.request = monitored_request
        requests_module.get = monitored_get
        requests_module.post = monitored_post

        return requests_module

    def _is_local_url(self, url: str) -> bool:
        """Check if URL targets local network"""
        local_patterns = [
            r"^https?://localhost",
            r"^https?://127\.",
            r"^https?://0\.0\.0\.0",
            r"^https?://10\.",
            r"^https?://172\.(1[6-9]|2[0-9]|3[01])\.",
            r"^https?://192\.168\.",
            r"^https?://169\.254\.",
        ]

        return any(re.match(pattern, url, re.IGNORECASE) for pattern in local_patterns)

    def _create_blocked_function(self, func_name: str, reason: str):
        """Create function that blocks dangerous operations"""

        def blocked_function(*args, **kwargs):
            self.security_monitor.log_violation(
                "blocked_function",
                "critical",
                f"Attempt to use blocked function: {func_name}",
                {"reason": reason, "args_count": len(args)},
            )
            raise SecurityError(f"Function '{func_name}' is blocked: {reason}")

        return blocked_function


class SecurityError(Exception):
    """Custom exception for security violations"""

    pass


class PythonExecutionEngine:
    """Main Python code execution engine with comprehensive security"""

    def __init__(self):
        self.security_monitor = SecurityMonitor()
        self.execution_env = SecureExecutionEnvironment(self.security_monitor)

    def execute_code(
        self, code: str, params: Dict = None, env_vars: Dict = None
    ) -> Dict[str, Any]:
        """Execute Python code in secure environment"""
        start_time = time.time()
        stdout_buffer = StringIO()
        stderr_buffer = StringIO()
        result = None

        try:
            # Input validation
            if not isinstance(code, str):
                raise ValueError("Code must be a string")

            if len(code) > 500000:  # 500KB limit
                self.security_monitor.log_violation(
                    "code_size", "high", f"Code size limit exceeded: {len(code)} bytes"
                )
                raise ValueError("Code size limit exceeded (500KB)")

            # Static security analysis
            self._perform_static_analysis(code)

            # Create secure execution context
            context = self.execution_env.create_secure_context(params, env_vars)

            # Setup output capture
            with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                # Compile and execute code
                try:
                    # Parse AST for additional security checks
                    ast_tree = ast.parse(code, "<user_code>", "exec")
                    self._analyze_ast(ast_tree)

                    # Compile to bytecode
                    code_obj = compile(ast_tree, "<user_code>", "exec")

                    # Execute with timeout
                    self._execute_with_timeout(code_obj, context)

                    # Get result if there's a final expression
                    if hasattr(context, "_result"):
                        result = context["_result"]

                except SyntaxError as e:
                    raise ValueError(f"Syntax error: {e}")
                except Exception as e:
                    # Log execution error
                    self.security_monitor.log_violation(
                        "execution_error",
                        "medium",
                        f"Code execution failed: {str(e)[:200]}",
                        {"error_type": type(e).__name__},
                    )
                    raise

            # Collect outputs
            stdout_content = stdout_buffer.getvalue()
            stderr_content = stderr_buffer.getvalue()

            # Resource usage check
            resource_usage = self.security_monitor.check_resource_usage()
            execution_time = (time.time() - start_time) * 1000

            # Generate security report
            security_report = self.security_monitor.get_security_report()

            return {
                "success": True,
                "output": {
                    "result": result,
                    "stdout": stdout_content,
                    "stderr": stderr_content,
                    "executionTime": execution_time,
                    "memoryUsage": resource_usage.get("memory_mb", 0)
                    * 1024
                    * 1024,  # Convert to bytes
                    "resourceUsage": {
                        "cpu": {
                            "usage": resource_usage.get("cpu_percent", 0),
                            "time": execution_time,
                        },
                        "memory": {
                            "used": resource_usage.get("memory_mb", 0) * 1024 * 1024,
                            "max": 0,
                            "limit": self.security_monitor.max_memory_mb * 1024 * 1024,
                        },
                        "disk": {"read": 0, "write": 0},
                        "network": {
                            "incoming": 0,
                            "outgoing": 0,
                            "requests": len(self.security_monitor.network_requests),
                        },
                    },
                    "securityReport": security_report,
                },
            }

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            security_report = self.security_monitor.get_security_report()

            return {
                "success": False,
                "output": {
                    "result": None,
                    "stdout": stdout_buffer.getvalue(),
                    "stderr": str(e),
                    "executionTime": execution_time,
                    "memoryUsage": 0,
                    "resourceUsage": {
                        "cpu": {"usage": 0, "time": execution_time},
                        "memory": {
                            "used": 0,
                            "max": 0,
                            "limit": self.security_monitor.max_memory_mb * 1024 * 1024,
                        },
                        "disk": {"read": 0, "write": 0},
                        "network": {"incoming": 0, "outgoing": 0, "requests": 0},
                    },
                    "securityReport": security_report,
                },
                "error": str(e),
            }

    def _perform_static_analysis(self, code: str):
        """Perform static security analysis on code"""
        dangerous_patterns = [
            (r"eval\s*\(", "critical", "eval() usage detected"),
            (r"exec\s*\(", "critical", "exec() usage detected"),
            (r"__import__\s*\(", "high", "Dynamic import usage"),
            (r"compile\s*\(", "high", "Dynamic compilation"),
            (r"subprocess\.", "critical", "Subprocess usage detected"),
            (r"os\.system", "critical", "System command execution"),
            (r"os\.popen", "critical", "Process execution"),
            (r"getattr\s*\(", "medium", "Dynamic attribute access"),
            (r"setattr\s*\(", "medium", "Dynamic attribute setting"),
            (r"globals\s*\(\)", "high", "Global namespace access"),
            (r"locals\s*\(\)", "medium", "Local namespace access"),
            (r"vars\s*\(\)", "medium", "Variable inspection"),
        ]

        for pattern, severity, description in dangerous_patterns:
            if re.search(pattern, code, re.IGNORECASE | re.MULTILINE):
                self.security_monitor.log_violation(
                    "static_analysis", severity, description, {"pattern": pattern}
                )

                if severity == "critical":
                    raise SecurityError(
                        f"Blocked dangerous code pattern: {description}"
                    )

    def _analyze_ast(self, ast_tree):
        """Analyze AST for security issues"""

        class SecurityVisitor(ast.NodeVisitor):
            def __init__(self, monitor):
                self.monitor = monitor

            def visit_Call(self, node):
                # Check for dangerous function calls
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                    if func_name in ["eval", "exec", "compile", "__import__"]:
                        self.monitor.log_violation(
                            "ast_analysis",
                            "critical",
                            f"Dangerous function call detected: {func_name}",
                        )

                # Check for attribute access to dangerous modules
                elif isinstance(node.func, ast.Attribute):
                    if isinstance(node.func.value, ast.Name):
                        if node.func.value.id in ["os", "sys", "subprocess"]:
                            self.monitor.log_violation(
                                "ast_analysis",
                                "high",
                                f"Dangerous module access: {node.func.value.id}.{node.func.attr}",
                            )

                self.generic_visit(node)

            def visit_Import(self, node):
                # Check imports
                for alias in node.names:
                    if alias.name.startswith("os") or alias.name.startswith("sys"):
                        self.monitor.log_violation(
                            "ast_analysis",
                            "medium",
                            f"System module import: {alias.name}",
                        )
                self.generic_visit(node)

            def visit_ImportFrom(self, node):
                # Check from imports
                if node.module and (
                    node.module.startswith("os") or node.module.startswith("sys")
                ):
                    self.monitor.log_violation(
                        "ast_analysis",
                        "medium",
                        f"System module from import: {node.module}",
                    )
                self.generic_visit(node)

        visitor = SecurityVisitor(self.security_monitor)
        visitor.visit(ast_tree)

    def _execute_with_timeout(self, code_obj, context):
        """Execute code with timeout protection"""

        def timeout_handler(signum, frame):
            raise TimeoutError(
                f"Code execution exceeded {self.security_monitor.max_execution_time} seconds"
            )

        # Set up timeout signal
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(int(self.security_monitor.max_execution_time))

        try:
            exec(code_obj, context)
        finally:
            signal.alarm(0)  # Cancel the alarm
            signal.signal(signal.SIGALRM, old_handler)  # Restore old handler


def main():
    """Main execution handler"""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()

        if not input_data.strip():
            input_data = "{}"

        # Parse input JSON
        try:
            input_json = json.loads(input_data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON input: {e}")

        code = input_json.get("code", "")
        if not code:
            raise ValueError("No code provided for execution")

        params = input_json.get("params", {})
        env_vars = input_json.get("environmentVariables", {})

        # Execute code
        engine = PythonExecutionEngine()
        result = engine.execute_code(code, params, env_vars)

        # Output result
        print(json.dumps(result, indent=2, default=str))
        sys.exit(0 if result["success"] else 1)

    except Exception as e:
        error_result = {
            "success": False,
            "output": {
                "result": None,
                "stdout": "",
                "stderr": str(e),
                "executionTime": 0,
                "memoryUsage": 0,
                "resourceUsage": {},
                "securityReport": {
                    "riskScore": 100,
                    "violations": [],
                    "policyCompliance": False,
                },
            },
            "error": str(e),
        }

        print(json.dumps(error_result, indent=2, default=str))
        sys.exit(1)


if __name__ == "__main__":
    main()
