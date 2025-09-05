/**
 * PyAutoGUI RPA Engine Implementation
 * 
 * Legacy desktop automation engine using PyAutoGUI through Python subprocess.
 * Provides basic desktop interaction capabilities as a fallback option.
 * Note: This engine is disabled by default due to security considerations.
 * 
 * @fileoverview PyAutoGUI engine implementation for basic automation
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { 
    IRPAEngine, 
    RPAWorkflow, 
    WorkflowExecutionContext, 
    WorkflowResult, 
    EngineStatus, 
    WorkflowStep 
} from '../types/agent-types';

/**
 * PyAutoGUI Engine Configuration
 */
interface PyAutoGUIEngineConfig {
    logLevel: string;
    timeout: number;
    failSafe: boolean;
    childProcess: boolean;
    pythonPath?: string;
    scriptPath?: string;
}

/**
 * Python script execution result
 */
interface PythonScriptResult {
    success: boolean;
    result?: any;
    error?: string;
    stdout?: string;
    stderr?: string;
}

/**
 * PyAutoGUI RPA Engine Implementation
 * 
 * Provides basic desktop automation using PyAutoGUI through Python subprocess:
 * - Basic mouse and keyboard automation
 * - Screen capture and image recognition
 * - Simple coordinate-based interactions
 * - Fallback automation capabilities
 * 
 * WARNING: This engine has security limitations and should only be used
 * in trusted environments with proper sandboxing.
 */
export class PyAutoGUIEngine extends EventEmitter implements IRPAEngine {
    public readonly name = 'PyAutoGUI Engine';
    public readonly type = 'pyautogui' as const;
    public readonly version = '1.0.0';
    
    private config: PyAutoGUIEngineConfig;
    private status: EngineStatus = {
        status: 'initializing',
        lastActivity: new Date(),
        activeExecutions: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0
    };
    
    private isInitialized = false;
    private activeExecutions: Map<string, ChildProcess> = new Map();
    private pythonPath: string;
    private scriptPath: string;

    constructor() {
        super();
        
        this.config = {
            logLevel: 'info',
            timeout: 30000,
            failSafe: true,
            childProcess: true,
            pythonPath: process.platform === 'win32' ? 'python' : 'python3'
        };

        this.pythonPath = this.config.pythonPath!;
        this.scriptPath = path.join(__dirname, '../scripts/pyautogui-runner.py');

        this.log('info', '🐍 PyAutoGUI Engine created');
    }

    /**
     * Initialize the PyAutoGUI engine
     */
    public async initialize(config?: Partial<PyAutoGUIEngineConfig>): Promise<boolean> {
        try {
            this.log('info', '🚀 Initializing PyAutoGUI engine...');
            
            if (config) {
                this.config = { ...this.config, ...config };
                if (config.pythonPath) {
                    this.pythonPath = config.pythonPath;
                }
            }

            // Test Python and PyAutoGUI availability
            await this.testPythonAvailability();
            await this.testPyAutoGUIAvailability();

            // Create Python script
            await this.createPythonScript();

            this.isInitialized = true;
            this.status = {
                ...this.status,
                status: 'ready',
                lastActivity: new Date()
            };

            this.log('info', '✅ PyAutoGUI engine initialized successfully');
            return true;

        } catch (error) {
            this.log('error', '❌ Failed to initialize PyAutoGUI engine:', error);
            this.status.status = 'error';
            return false;
        }
    }

    /**
     * Execute a workflow using PyAutoGUI
     */
    public async execute(workflow: RPAWorkflow, context: WorkflowExecutionContext): Promise<WorkflowResult> {
        if (!this.isInitialized) {
            throw new Error('PyAutoGUI engine not initialized');
        }

        const executionId = context.executionId;
        const startTime = Date.now();

        try {
            this.log('info', `🚀 Executing workflow: ${workflow.name}`);
            
            this.status.activeExecutions++;
            this.status.totalExecutions++;

            // Execute workflow steps
            const result = await this.executeSteps(workflow.steps, context, executionId);

            // Update statistics
            this.status.successfulExecutions++;
            this.status.lastActivity = new Date();

            this.log('info', `✅ Workflow execution completed: ${workflow.name}`);

            return {
                status: 'completed',
                executionId,
                workflowId: workflow.id,
                startTime: new Date(startTime),
                endTime: new Date(),
                duration: Date.now() - startTime,
                result: result,
                steps: result.steps || [],
                error: null
            };

        } catch (error) {
            this.status.failedExecutions++;
            this.log('error', `❌ Workflow execution failed: ${workflow.name}`, error);

            return {
                status: 'failed',
                executionId,
                workflowId: workflow.id,
                startTime: new Date(startTime),
                endTime: new Date(),
                duration: Date.now() - startTime,
                result: null,
                steps: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };

        } finally {
            this.status.activeExecutions--;
        }
    }

    /**
     * Stop workflow execution
     */
    public async stop(executionId: string): Promise<boolean> {
        try {
            const process = this.activeExecutions.get(executionId);
            if (!process) {
                this.log('warn', `⚠️ Execution not found: ${executionId}`);
                return false;
            }

            // Kill the Python process
            process.kill('SIGTERM');
            this.activeExecutions.delete(executionId);

            this.log('info', `🛑 Execution stopped: ${executionId}`);
            return true;

        } catch (error) {
            this.log('error', `❌ Failed to stop execution: ${executionId}`, error);
            return false;
        }
    }

    /**
     * Get engine status
     */
    public getStatus(): EngineStatus {
        return { ...this.status };
    }

    /**
     * Shutdown the engine
     */
    public async shutdown(): Promise<void> {
        try {
            this.log('info', '🛑 Shutting down PyAutoGUI engine...');

            // Stop all active executions
            const executionIds = Array.from(this.activeExecutions.keys());
            for (const id of executionIds) {
                await this.stop(id);
            }

            this.isInitialized = false;
            this.status.status = 'stopped';

            this.log('info', '✅ PyAutoGUI engine shutdown complete');

        } catch (error) {
            this.log('error', '❌ Error during shutdown:', error);
        }
    }

    /**
     * Test Python availability
     */
    private async testPythonAvailability(): Promise<void> {
        return new Promise((resolve, reject) => {
            const process = spawn(this.pythonPath, ['--version']);
            
            let output = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    this.log('debug', `🐍 Python available: ${output.trim()}`);
                    resolve();
                } else {
                    reject(new Error(`Python not available or failed to execute: ${output}`));
                }
            });
            
            process.on('error', (error) => {
                reject(new Error(`Failed to spawn Python process: ${error.message}`));
            });
        });
    }

    /**
     * Test PyAutoGUI availability
     */
    private async testPyAutoGUIAvailability(): Promise<void> {
        return new Promise((resolve, reject) => {
            const process = spawn(this.pythonPath, ['-c', 'import pyautogui; print("PyAutoGUI available:", pyautogui.VERSION)']);
            
            let output = '';
            let error = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0 && output.includes('PyAutoGUI available')) {
                    this.log('debug', `🖱️ ${output.trim()}`);
                    resolve();
                } else {
                    reject(new Error(`PyAutoGUI not available: ${error || output}`));
                }
            });
            
            process.on('error', (error) => {
                reject(new Error(`Failed to test PyAutoGUI: ${error.message}`));
            });
        });
    }

    /**
     * Create Python script for PyAutoGUI operations
     */
    private async createPythonScript(): Promise<void> {
        const scriptContent = `#!/usr/bin/env python3
"""
PyAutoGUI RPA Runner Script
Executes automation commands received via JSON input
"""
import json
import sys
import pyautogui
import time
from typing import Dict, Any, List

# Configure PyAutoGUI
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.5

class PyAutoGUIRunner:
    def __init__(self):
        self.screen_width, self.screen_height = pyautogui.size()
    
    def execute_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single automation step"""
        step_type = step.get('type')
        parameters = step.get('parameters', {})
        
        try:
            if step_type == 'click':
                return self._click(parameters)
            elif step_type == 'type':
                return self._type_text(parameters)
            elif step_type == 'key':
                return self._press_key(parameters)
            elif step_type == 'move':
                return self._move_mouse(parameters)
            elif step_type == 'screenshot':
                return self._screenshot(parameters)
            elif step_type == 'wait':
                return self._wait(parameters)
            elif step_type == 'find-image':
                return self._find_image(parameters)
            else:
                raise ValueError(f"Unsupported step type: {step_type}")
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'step_type': step_type
            }
    
    def _click(self, params: Dict[str, Any]) -> Dict[str, Any]:
        x = params.get('x')
        y = params.get('y')
        button = params.get('button', 'left')
        clicks = params.get('clicks', 1)
        
        if x is None or y is None:
            raise ValueError("Click coordinates (x, y) are required")
            
        pyautogui.click(x, y, clicks=clicks, button=button)
        
        return {
            'success': True,
            'action': 'click',
            'x': x, 'y': y, 'button': button, 'clicks': clicks
        }
    
    def _type_text(self, params: Dict[str, Any]) -> Dict[str, Any]:
        text = params.get('text')
        interval = params.get('interval', 0.01)
        
        if not text:
            raise ValueError("Text is required for typing")
            
        pyautogui.write(text, interval=interval)
        
        return {
            'success': True,
            'action': 'type',
            'text': text,
            'length': len(text)
        }
    
    def _press_key(self, params: Dict[str, Any]) -> Dict[str, Any]:
        key = params.get('key')
        modifiers = params.get('modifiers', [])
        
        if not key:
            raise ValueError("Key is required")
            
        if modifiers:
            # Handle modifier keys
            keys_to_press = modifiers + [key]
            pyautogui.hotkey(*keys_to_press)
        else:
            pyautogui.press(key)
        
        return {
            'success': True,
            'action': 'key',
            'key': key,
            'modifiers': modifiers
        }
    
    def _move_mouse(self, params: Dict[str, Any]) -> Dict[str, Any]:
        x = params.get('x')
        y = params.get('y')
        duration = params.get('duration', 0.5)
        
        if x is None or y is None:
            raise ValueError("Move coordinates (x, y) are required")
            
        pyautogui.moveTo(x, y, duration=duration)
        
        return {
            'success': True,
            'action': 'move',
            'x': x, 'y': y, 'duration': duration
        }
    
    def _screenshot(self, params: Dict[str, Any]) -> Dict[str, Any]:
        region = params.get('region')
        filename = params.get('filename', f'screenshot_{int(time.time())}.png')
        
        if region:
            screenshot = pyautogui.screenshot(region=region)
        else:
            screenshot = pyautogui.screenshot()
            
        screenshot.save(filename)
        
        return {
            'success': True,
            'action': 'screenshot',
            'filename': filename,
            'region': region
        }
    
    def _wait(self, params: Dict[str, Any]) -> Dict[str, Any]:
        duration = params.get('duration', 1.0) / 1000.0  # Convert ms to seconds
        time.sleep(duration)
        
        return {
            'success': True,
            'action': 'wait',
            'duration_ms': duration * 1000
        }
    
    def _find_image(self, params: Dict[str, Any]) -> Dict[str, Any]:
        image_path = params.get('imagePath')
        confidence = params.get('confidence', 0.8)
        
        if not image_path:
            raise ValueError("Image path is required")
            
        try:
            location = pyautogui.locateOnScreen(image_path, confidence=confidence)
            if location:
                center = pyautogui.center(location)
                return {
                    'success': True,
                    'action': 'find-image',
                    'found': True,
                    'location': {
                        'x': location.left,
                        'y': location.top,
                        'width': location.width,
                        'height': location.height
                    },
                    'center': {'x': center.x, 'y': center.y},
                    'confidence': confidence
                }
            else:
                return {
                    'success': True,
                    'action': 'find-image',
                    'found': False,
                    'confidence': confidence
                }
        except pyautogui.ImageNotFoundException:
            return {
                'success': True,
                'action': 'find-image',
                'found': False,
                'confidence': confidence
            }

def main():
    """Main execution function"""
    try:
        # Read JSON input from stdin
        input_data = sys.stdin.read()
        command = json.loads(input_data)
        
        runner = PyAutoGUIRunner()
        
        if command.get('type') == 'execute_steps':
            steps = command.get('steps', [])
            results = []
            
            for step in steps:
                result = runner.execute_step(step)
                results.append(result)
                
                # Stop on failure if required
                if not result.get('success', False) and step.get('stopOnFailure', True):
                    break
            
            response = {
                'success': True,
                'results': results,
                'total_steps': len(steps),
                'completed_steps': len(results)
            }
            
        else:
            # Single step execution
            result = runner.execute_step(command)
            response = result
        
        print(json.dumps(response))
        
    except Exception as e:
        error_response = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
`;

        const scriptDir = path.dirname(this.scriptPath);
        if (!fs.existsSync(scriptDir)) {
            fs.mkdirSync(scriptDir, { recursive: true });
        }

        fs.writeFileSync(this.scriptPath, scriptContent);
        
        // Make script executable on Unix-like systems
        if (process.platform !== 'win32') {
            fs.chmodSync(this.scriptPath, '755');
        }

        this.log('debug', '🐍 Python script created successfully');
    }

    /**
     * Execute workflow steps using Python subprocess
     */
    private async executeSteps(steps: WorkflowStep[], context: WorkflowExecutionContext, executionId: string): Promise<any> {
        const results: any[] = [];
        let stepIndex = 0;

        // Convert steps to Python-compatible format
        const pythonSteps = steps.filter(step => step.enabled).map(step => ({
            type: step.type,
            parameters: step.parameters,
            stopOnFailure: step.onFailure === 'stop'
        }));

        try {
            const command = {
                type: 'execute_steps',
                steps: pythonSteps
            };

            const result = await this.executePythonScript(command, executionId);
            
            if (result.success && result.results) {
                for (let i = 0; i < result.results.length; i++) {
                    const stepResult = result.results[i];
                    const originalStep = steps.filter(s => s.enabled)[i];
                    
                    results.push({
                        stepId: originalStep.id,
                        name: originalStep.name,
                        result: stepResult,
                        status: stepResult.success ? 'completed' : 'failed',
                        error: stepResult.error,
                        timestamp: new Date()
                    });

                    // Report progress
                    if (context.onProgress) {
                        context.onProgress({
                            percentage: Math.round(((i + 1) / pythonSteps.length) * 100),
                            currentStep: i + 1,
                            totalSteps: pythonSteps.length,
                            stepName: originalStep.name,
                            message: `Completed step: ${originalStep.name}`
                        });
                    }
                }
            }

            return {
                steps: results,
                totalSteps: pythonSteps.length,
                completedSteps: result.completed_steps || 0,
                failedSteps: results.filter(r => r.status === 'failed').length
            };

        } catch (error) {
            throw new Error(`Python execution failed: ${error}`);
        }
    }

    /**
     * Execute Python script with command
     */
    private async executePythonScript(command: any, executionId: string): Promise<PythonScriptResult> {
        return new Promise((resolve, reject) => {
            const process = spawn(this.pythonPath, [this.scriptPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.activeExecutions.set(executionId, process);

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                this.activeExecutions.delete(executionId);

                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve({
                            success: true,
                            result,
                            stdout,
                            stderr
                        });
                    } catch (error) {
                        resolve({
                            success: false,
                            error: `Failed to parse JSON response: ${error}`,
                            stdout,
                            stderr
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        error: `Process exited with code ${code}`,
                        stdout,
                        stderr
                    });
                }
            });

            process.on('error', (error) => {
                this.activeExecutions.delete(executionId);
                reject(error);
            });

            // Send command to Python script
            process.stdin.write(JSON.stringify(command));
            process.stdin.end();

            // Set timeout
            setTimeout(() => {
                if (this.activeExecutions.has(executionId)) {
                    process.kill('SIGTERM');
                    this.activeExecutions.delete(executionId);
                    reject(new Error('Python script execution timeout'));
                }
            }, this.config.timeout);
        });
    }

    /**
     * Logging utility
     */
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [PyAutoGUIEngine] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }
}