import { CodeIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'

/**
 * Python Code Execution Output Type
 */
export interface PythonExecutionOutput {
  success: boolean
  output: {
    result: any
    stdout: string
    stderr: string
    executionTime: number
    memoryUsage: number
    debugInfo?: any
    securityReport?: any
  }
}

/**
 * Python Code Block
 *
 * Provides secure Python code execution capabilities with:
 * - Data science library support (pandas, numpy, matplotlib, etc.)
 * - Virtual environment isolation
 * - Package management with pip
 * - Advanced debugging capabilities
 * - Jupyter-like notebook experience
 * - Resource monitoring and limits
 * - Docker-based secure sandboxing
 */
export const PythonBlock: BlockConfig<PythonExecutionOutput> = {
  type: 'python',
  name: 'Python Code',
  description: 'Execute Python code with data science libraries',
  longDescription:
    'Execute Python code in a secure sandbox environment with support for popular data science libraries like pandas, numpy, matplotlib, and scikit-learn. Includes virtual environment management, package installation, and advanced debugging features.',
  docsLink: 'https://docs.sim.ai/blocks/python',
  category: 'blocks',
  bgColor: '#3776ab',
  icon: CodeIcon,
  subBlocks: [
    {
      id: 'code',
      title: 'Python Code',
      type: 'code',
      language: 'python',
      layout: 'full',
      required: true,
      placeholder: 'Enter your Python code here...',
      rows: 15,
      description:
        'Write Python code that will be executed in a secure sandbox environment with data science libraries',
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert Python programmer specializing in data science, automation, and workflow processing.
Generate ONLY the raw Python code based on the user's request.
The code will be executed in a secure Python environment with access to popular libraries.

AVAILABLE LIBRARIES:
- Data Science: pandas, numpy, scipy, scikit-learn, matplotlib, seaborn, plotly
- Web: requests, urllib3, httpx, beautifulsoup4
- Utilities: python-dateutil, pytz, uuid, json, csv, pathlib
- File Processing: openpyxl, python-docx, PyPDF2, Pillow
- Database: sqlite3, pymongo, psycopg2-binary, SQLAlchemy
- Machine Learning: tensorflow, keras, torch (if available)

VARIABLE ACCESS PATTERNS:
Environment variables are available via os.environ dictionary
Input parameters are available as variables in the global scope
Previous block outputs are available as workflow_data dictionary

BEST PRACTICES:
1. Import required libraries at the top of your code
2. Use proper error handling with try/except blocks  
3. Include print() statements for debugging and progress tracking
4. Return data that can be serialized to JSON for downstream blocks
5. Use type hints where appropriate for better code clarity
6. Handle missing data and edge cases gracefully
7. Use pandas for data manipulation and analysis
8. Use matplotlib/seaborn for data visualization

EXAMPLE - Data Analysis:
\`\`\`python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime

# Access workflow data and parameters
data = workflow_data.get('previous_block_output', {})
threshold = float(os.environ.get('THRESHOLD', '0.5'))

# Load and process data
df = pd.DataFrame(data)
print(f"Processing {len(df)} records")

# Perform analysis
df['processed_date'] = pd.to_datetime(df['date'])
df['score'] = df['value'] * threshold
summary_stats = df['score'].describe()

# Create visualization
plt.figure(figsize=(10, 6))
plt.hist(df['score'], bins=20, alpha=0.7)
plt.title('Score Distribution')
plt.xlabel('Score')
plt.ylabel('Frequency')
plt.savefig('/tmp/score_distribution.png')

# Return results
result = {
    'total_records': len(df),
    'mean_score': float(df['score'].mean()),
    'max_score': float(df['score'].max()),
    'summary_stats': summary_stats.to_dict(),
    'chart_path': '/tmp/score_distribution.png'
}

print(f"Analysis complete: {result}")
result
\`\`\`

Generate clean, well-documented Python code without explanatory text.`,
        placeholder: 'Describe what you want the Python code to do...',
        generationType: 'python-function-body',
      },
    },
    {
      id: 'packages',
      title: 'Python Packages',
      type: 'checkbox-list',
      layout: 'full',
      description: 'Select Python packages to install via pip (from trusted PyPI sources)',
      options: [
        { label: 'pandas - Data manipulation and analysis', id: 'pandas' },
        { label: 'numpy - Numerical computing', id: 'numpy' },
        { label: 'matplotlib - Plotting and visualization', id: 'matplotlib' },
        { label: 'seaborn - Statistical data visualization', id: 'seaborn' },
        { label: 'scikit-learn - Machine learning library', id: 'scikit-learn' },
        { label: 'requests - HTTP library for API calls', id: 'requests' },
        { label: 'beautifulsoup4 - Web scraping and HTML parsing', id: 'beautifulsoup4' },
        { label: 'openpyxl - Excel file handling', id: 'openpyxl' },
        { label: 'python-docx - Word document processing', id: 'python-docx' },
        { label: 'Pillow - Image processing', id: 'Pillow' },
        { label: 'plotly - Interactive visualizations', id: 'plotly' },
        { label: 'scipy - Scientific computing', id: 'scipy' },
        { label: 'pymongo - MongoDB driver', id: 'pymongo' },
        { label: 'psycopg2-binary - PostgreSQL adapter', id: 'psycopg2-binary' },
        { label: 'SQLAlchemy - SQL toolkit and ORM', id: 'SQLAlchemy' },
        { label: 'python-dateutil - Date utilities', id: 'python-dateutil' },
        { label: 'pytz - Timezone handling', id: 'pytz' },
        { label: 'httpx - Modern HTTP client', id: 'httpx' },
        { label: 'PyPDF2 - PDF processing', id: 'PyPDF2' },
        { label: 'opencv-python - Computer vision', id: 'opencv-python' },
      ],
      multiSelect: true,
    },
    {
      id: 'customPackages',
      title: 'Custom Packages',
      type: 'long-input',
      layout: 'full',
      rows: 3,
      placeholder:
        'Enter additional pip packages (one per line)\ne.g. tensorflow==2.13.0\nnltk>=3.8',
      description:
        'Specify additional packages with optional version constraints (requires approval for security)',
    },
    {
      id: 'timeout',
      title: 'Execution Timeout',
      type: 'slider',
      layout: 'half',
      min: 10,
      max: 600,
      step: 10,
      description: 'Maximum execution time in seconds (10-600 seconds)',
      placeholder: '60',
    },
    {
      id: 'memoryLimit',
      title: 'Memory Limit',
      type: 'slider',
      layout: 'half',
      min: 128,
      max: 2048,
      step: 128,
      description: 'Maximum memory usage in MB (128-2048 MB)',
      placeholder: '512',
    },
    {
      id: 'enableDebugging',
      title: 'Enable Debugging',
      type: 'switch',
      layout: 'half',
      description: 'Enable Python debugging features with pdb and variable inspection',
    },
    {
      id: 'enableNetworking',
      title: 'Enable Network Access',
      type: 'switch',
      layout: 'half',
      description: 'Allow HTTP requests and external API access (subject to security policies)',
    },
    {
      id: 'pythonVersion',
      title: 'Python Version',
      type: 'dropdown',
      layout: 'half',
      description: 'Select Python interpreter version',
      options: [
        { label: 'Python 3.11 - Latest stable (Recommended)', id: '3.11' },
        { label: 'Python 3.10 - Stable with legacy support', id: '3.10' },
        { label: 'Python 3.9 - Compatibility mode', id: '3.9' },
      ],
    },
    {
      id: 'outputFormat',
      title: 'Output Format',
      type: 'dropdown',
      layout: 'half',
      description: 'How to handle the final result output',
      options: [
        { label: 'Auto - Detect and serialize automatically', id: 'auto' },
        { label: 'JSON - Force JSON serialization', id: 'json' },
        { label: 'String - Convert to string representation', id: 'string' },
        { label: 'Pickle - Python pickle format (binary)', id: 'pickle' },
        { label: 'CSV - Export as CSV if DataFrame', id: 'csv' },
      ],
    },
    {
      id: 'saveFiles',
      title: 'Save Generated Files',
      type: 'switch',
      layout: 'half',
      description: 'Save plots, CSV exports, and other generated files for download',
    },
    {
      id: 'logLevel',
      title: 'Log Level',
      type: 'dropdown',
      layout: 'half',
      description: 'Set logging verbosity for debugging',
      options: [
        { label: 'ERROR - Only errors', id: 'ERROR' },
        { label: 'WARNING - Warnings and errors', id: 'WARNING' },
        { label: 'INFO - General information', id: 'INFO' },
        { label: 'DEBUG - Detailed debugging', id: 'DEBUG' },
      ],
    },
  ],
  tools: {
    access: ['python_execute'],
    config: {
      tool: (params: Record<string, any>) => 'python_execute',
      params: (params: Record<string, any>) => ({
        code: params.code,
        packages: params.packages || [],
        customPackages: params.customPackages
          ? params.customPackages.split('\n').filter((p: string) => p.trim())
          : [],
        timeout: (params.timeout || 60) * 1000, // Convert to milliseconds
        memoryLimit: params.memoryLimit || 512,
        enableDebugging: params.enableDebugging || false,
        enableNetworking: params.enableNetworking || true,
        pythonVersion: params.pythonVersion || '3.11',
        outputFormat: params.outputFormat || 'auto',
        saveFiles: params.saveFiles || false,
        logLevel: params.logLevel || 'INFO',
        // Pass through workflow context
        envVars: params._context?.environmentVariables || {},
        workflowVariables: params._context?.workflowVariables || {},
        blockData: params._context?.blockData || {},
        blockNameMapping: params._context?.blockNameMapping || {},
        workflowId: params._context?.workflowId,
      }),
    },
  },
  inputs: {
    code: {
      type: 'string',
      description: 'Python code to execute with data science capabilities',
    },
    packages: {
      type: 'json',
      description: 'Array of Python packages to install via pip',
    },
    customPackages: {
      type: 'string',
      description: 'Additional custom packages with version constraints',
    },
    timeout: {
      type: 'number',
      description: 'Execution timeout in seconds',
    },
    memoryLimit: {
      type: 'number',
      description: 'Memory limit in MB',
    },
    enableDebugging: {
      type: 'boolean',
      description: 'Enable debugging features',
    },
    enableNetworking: {
      type: 'boolean',
      description: 'Allow network access',
    },
    pythonVersion: {
      type: 'string',
      description: 'Python interpreter version',
    },
    outputFormat: {
      type: 'string',
      description: 'Output serialization format',
    },
    saveFiles: {
      type: 'boolean',
      description: 'Save generated files for download',
    },
    logLevel: {
      type: 'string',
      description: 'Logging verbosity level',
    },
  },
  outputs: {
    result: {
      type: 'json',
      description: 'Return value from the executed Python code',
    },
    stdout: {
      type: 'string',
      description: 'Standard output from Python execution including print statements',
    },
    stderr: {
      type: 'string',
      description: 'Error messages and warnings from Python execution',
    },
    executionTime: {
      type: 'number',
      description: 'Actual execution time in milliseconds',
    },
    memoryUsage: {
      type: 'number',
      description: 'Peak memory usage in MB',
    },
    installedPackages: {
      type: 'json',
      description: 'List of successfully installed packages with versions',
    },
    generatedFiles: {
      type: 'json',
      description: 'List of files generated during execution (plots, exports, etc.)',
    },
    debugInfo: {
      type: 'json',
      description: 'Debugging information including variable states and execution trace',
    },
    securityReport: {
      type: 'json',
      description: 'Security analysis including network access attempts and resource usage',
    },
  },
}
