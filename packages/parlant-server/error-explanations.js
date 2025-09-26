/**
 * User-Friendly Error Explanation System
 *
 * This module provides comprehensive, contextual error explanations with multiple skill levels,
 * interactive guidance, and actionable resolution steps. It transforms technical errors into
 * understandable messages that help users resolve issues effectively.
 */
import { createLogger } from '../../apps/sim/lib/logs/console/logger';
import { ErrorSeverity, RecoveryStrategy, } from './error-taxonomy';
const logger = createLogger('ErrorExplanations');
/**
 * User skill levels for tailored explanations
 */
export var UserSkillLevel;
(function (UserSkillLevel) {
    UserSkillLevel["BEGINNER"] = "beginner";
    UserSkillLevel["INTERMEDIATE"] = "intermediate";
    UserSkillLevel["ADVANCED"] = "advanced";
    UserSkillLevel["DEVELOPER"] = "developer";
})(UserSkillLevel || (UserSkillLevel = {}));
/**
 * Explanation formats for different presentation contexts
 */
export var ExplanationFormat;
(function (ExplanationFormat) {
    ExplanationFormat["BRIEF"] = "brief";
    ExplanationFormat["DETAILED"] = "detailed";
    ExplanationFormat["INTERACTIVE"] = "interactive";
    ExplanationFormat["TECHNICAL"] = "technical";
})(ExplanationFormat || (ExplanationFormat = {}));
/**
 * Error explanation service
 */
export class ErrorExplanationService {
    explanationTemplates = new Map();
    contextualModifiers = new Map();
    constructor() {
        this.initializeExplanationTemplates();
        this.initializeContextualModifiers();
        logger.info('Error Explanation Service initialized');
    }
    /**
     * Generate comprehensive error explanation
     */
    generateExplanation(error, userSkillLevel = UserSkillLevel.INTERMEDIATE, format = ExplanationFormat.DETAILED, userContext) {
        const explanationId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        // Get base template for error category and subcategory
        const templateKey = `${error.category}:${error.subcategory}`;
        const template = this.explanationTemplates.get(templateKey) ||
            this.explanationTemplates.get(error.category) ||
            this.getDefaultTemplate();
        // Apply contextual modifications
        const modifiedTemplate = this.applyContextualModifications(template, error, userSkillLevel, userContext);
        // Generate skill-level specific messages
        const messages = this.generateSkillLevelMessages(error, modifiedTemplate);
        // Create resolution steps
        const resolutionSteps = this.generateResolutionSteps(error, modifiedTemplate, userSkillLevel);
        // Create quick actions
        const quickActions = this.generateQuickActions(error, modifiedTemplate, userSkillLevel);
        // Generate prevention tips
        const preventionTips = this.generatePreventionTips(error, modifiedTemplate);
        // Create troubleshooting tree
        const troubleshootingTree = this.generateTroubleshootingTree(error, modifiedTemplate);
        // Generate diagnostic questions
        const diagnosticQuestions = this.generateDiagnosticQuestions(error, modifiedTemplate);
        // Find documentation links
        const documentationLinks = this.findDocumentationLinks(error, userSkillLevel);
        const explanation = {
            id: explanationId,
            errorId: error.id,
            title: this.generateTitle(error, modifiedTemplate),
            summary: this.generateSummary(error, modifiedTemplate, userSkillLevel),
            messages,
            resolutionSteps,
            quickActions,
            preventionTips,
            category: error.category,
            severity: error.severity,
            impact: error.impact,
            timeToResolve: this.estimateTimeToResolve(error),
            relatedErrors: this.findRelatedErrors(error),
            documentationLinks,
            troubleshootingTree,
            diagnosticQuestions,
            timestamp: new Date().toISOString(),
            context: error.context,
        };
        logger.debug('Error explanation generated', {
            explanationId,
            errorId: error.id,
            userSkillLevel,
            format,
            resolutionSteps: resolutionSteps.length,
            quickActions: quickActions.length,
        });
        return explanation;
    }
    /**
     * Generate skill-level specific messages
     */
    generateSkillLevelMessages(error, template) {
        const toolName = error.context.toolName || 'the tool';
        return {
            [UserSkillLevel.BEGINNER]: this.interpolateTemplate(template.beginnerMessage, error, {
                toolName,
            }),
            [UserSkillLevel.INTERMEDIATE]: this.interpolateTemplate(template.intermediateMessage, error, {
                toolName,
            }),
            [UserSkillLevel.ADVANCED]: this.interpolateTemplate(template.advancedMessage, error, {
                toolName,
            }),
            [UserSkillLevel.DEVELOPER]: this.interpolateTemplate(template.developerMessage, error, {
                toolName,
            }),
        };
    }
    /**
     * Generate resolution steps based on error and skill level
     */
    generateResolutionSteps(error, template, userSkillLevel) {
        const steps = [];
        let order = 1;
        // Add general steps from template
        template.resolutionSteps.forEach((stepTemplate) => {
            if (this.shouldIncludeStep(stepTemplate, userSkillLevel, error)) {
                steps.push({
                    id: `step-${order}`,
                    order: order++,
                    title: stepTemplate.title,
                    description: this.interpolateTemplate(stepTemplate.description, error),
                    skillLevel: stepTemplate.skillLevel,
                    estimatedTime: stepTemplate.estimatedTime,
                    difficulty: stepTemplate.difficulty,
                    instructions: {
                        [UserSkillLevel.BEGINNER]: stepTemplate.instructions.beginner.map((inst) => this.interpolateTemplate(inst, error)),
                        [UserSkillLevel.INTERMEDIATE]: stepTemplate.instructions.intermediate.map((inst) => this.interpolateTemplate(inst, error)),
                        [UserSkillLevel.ADVANCED]: stepTemplate.instructions.advanced.map((inst) => this.interpolateTemplate(inst, error)),
                        [UserSkillLevel.DEVELOPER]: stepTemplate.instructions.developer.map((inst) => this.interpolateTemplate(inst, error)),
                    },
                    successCriteria: this.interpolateTemplate(stepTemplate.successCriteria, error),
                    commonMistakes: stepTemplate.commonMistakes.map((mistake) => this.interpolateTemplate(mistake, error)),
                    prerequisites: stepTemplate.prerequisites,
                    dependsOn: stepTemplate.dependsOn,
                    codeExamples: stepTemplate.codeExamples?.map((example) => ({
                        ...example,
                        code: this.interpolateTemplate(example.code, error),
                        explanation: this.interpolateTemplate(example.explanation, error),
                    })),
                });
            }
        });
        // Add error-specific steps
        this.addErrorSpecificSteps(steps, error);
        return steps.sort((a, b) => a.order - b.order);
    }
    /**
     * Generate quick actions for immediate problem resolution
     */
    generateQuickActions(error, template, userSkillLevel) {
        const actions = [];
        // Add template-based actions
        template.quickActions.forEach((actionTemplate) => {
            if (this.shouldIncludeAction(actionTemplate, userSkillLevel, error)) {
                actions.push({
                    id: `action-${actions.length + 1}`,
                    title: actionTemplate.title,
                    description: this.interpolateTemplate(actionTemplate.description, error),
                    action: actionTemplate.action,
                    customAction: actionTemplate.customAction,
                    parameters: actionTemplate.parameters,
                    skillLevel: actionTemplate.skillLevel,
                    estimatedTime: actionTemplate.estimatedTime,
                    requiresAuth: actionTemplate.requiresAuth,
                    requiresElevation: actionTemplate.requiresElevation,
                    reversible: actionTemplate.reversible,
                    warningMessage: actionTemplate.warningMessage,
                    confirmationMessage: actionTemplate.confirmationMessage,
                    successMessage: this.interpolateTemplate(actionTemplate.successMessage, error),
                });
            }
        });
        // Add universal actions
        if (error.recoverable && error.recoveryStrategy === RecoveryStrategy.RETRY) {
            actions.push({
                id: 'universal-retry',
                title: 'Try Again',
                description: 'Attempt the operation again',
                action: 'retry',
                skillLevel: UserSkillLevel.BEGINNER,
                estimatedTime: '< 1 minute',
                requiresAuth: false,
                requiresElevation: false,
                reversible: true,
                successMessage: 'Operation completed successfully',
            });
        }
        return actions;
    }
    /**
     * Generate prevention tips
     */
    generatePreventionTips(error, template) {
        return template.preventionTips.map((tipTemplate, index) => ({
            id: `tip-${index + 1}`,
            title: tipTemplate.title,
            description: this.interpolateTemplate(tipTemplate.description, error),
            category: tipTemplate.category,
            applicability: tipTemplate.applicability,
            implementationSteps: tipTemplate.implementationSteps.map((step) => this.interpolateTemplate(step, error)),
            tools: tipTemplate.tools,
            resources: tipTemplate.resources,
        }));
    }
    /**
     * Generate interactive troubleshooting tree
     */
    generateTroubleshootingTree(error, template) {
        return this.interpolateTroubleshootingNode(template.troubleshootingTree, error);
    }
    /**
     * Generate diagnostic questions
     */
    generateDiagnosticQuestions(error, template) {
        return template.diagnosticQuestions.map((questionTemplate, index) => ({
            id: `question-${index + 1}`,
            question: this.interpolateTemplate(questionTemplate.question, error),
            type: questionTemplate.type,
            options: questionTemplate.options,
            required: questionTemplate.required,
            helpText: this.interpolateTemplate(questionTemplate.helpText, error),
            dependsOn: questionTemplate.dependsOn,
            showIf: questionTemplate.showIf,
        }));
    }
    /**
     * Template interpolation with error context
     */
    interpolateTemplate(template, error, additionalContext = {}) {
        let result = template;
        const context = {
            ...additionalContext,
            toolName: error.context.toolName || 'the tool',
            errorMessage: error.message,
            component: error.component,
            severity: error.severity,
            category: error.category,
            subcategory: error.subcategory,
            userId: error.context.userId,
            workspaceId: error.context.workspaceId,
            timestamp: new Date(error.timestamp).toLocaleString(),
        };
        Object.entries(context).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, String(value || ''));
        });
        return result;
    }
    /**
     * Initialize explanation templates for different error types
     */
    initializeExplanationTemplates() {
        // Tool Adapter Error Templates
        this.explanationTemplates.set('tool_adapter:interface_mismatch', {
            beginnerMessage: "{{toolName}} isn't working properly with the system. This usually means there's a version mismatch.",
            intermediateMessage: "{{toolName}} has an interface compatibility issue. The tool's API may have changed or your system needs an update.",
            advancedMessage: "Interface mismatch detected for {{toolName}}. The tool's API contract doesn't match the expected schema in the adapter layer.",
            developerMessage: 'Tool adapter interface mismatch for {{toolName}}: {{errorMessage}}. Check API versioning and schema compatibility.',
            resolutionSteps: [
                {
                    title: 'Check for Updates',
                    description: 'Verify if {{toolName}} or the system has available updates',
                    skillLevel: UserSkillLevel.BEGINNER,
                    difficulty: 'easy',
                    estimatedTime: '2-3 minutes',
                    instructions: {
                        beginner: [
                            'Go to the settings or preferences section',
                            "Look for an 'Updates' or 'Check for Updates' option",
                            'Install any available updates',
                        ],
                        intermediate: [
                            "Check {{toolName}}'s version in settings",
                            'Compare with the latest version on the official website',
                            'Update if necessary and restart the application',
                        ],
                        advanced: [
                            'Run system update check: check for updates',
                            'Verify {{toolName}} API version compatibility',
                            'Update adapter configuration if needed',
                        ],
                        developer: [
                            'Check package.json or equivalent for {{toolName}} version',
                            'Compare API schema versions in adapter configuration',
                            'Update dependencies: npm update {{toolName}}',
                            'Regenerate adapter interface if schema changed',
                        ],
                    },
                    successCriteria: '{{toolName}} loads without errors',
                    commonMistakes: [
                        'Forgetting to restart after update',
                        'Not checking system compatibility',
                    ],
                    prerequisites: [],
                    dependsOn: [],
                },
            ],
            quickActions: [
                {
                    title: 'Refresh Connection',
                    description: 'Refresh the connection to {{toolName}}',
                    action: 'refresh',
                    skillLevel: UserSkillLevel.BEGINNER,
                    estimatedTime: '30 seconds',
                    requiresAuth: false,
                    requiresElevation: false,
                    reversible: true,
                    successMessage: 'Connection to {{toolName}} refreshed successfully',
                },
            ],
            preventionTips: [
                {
                    title: 'Enable Automatic Updates',
                    description: 'Keep {{toolName}} and the system updated automatically',
                    category: 'configuration',
                    applicability: [UserSkillLevel.BEGINNER, UserSkillLevel.INTERMEDIATE],
                    implementationSteps: [
                        'Enable automatic updates in system settings',
                        'Subscribe to {{toolName}} update notifications',
                    ],
                    tools: [],
                    resources: [],
                },
            ],
            troubleshootingTree: {
                id: 'root',
                question: 'When did this error first occur?',
                answers: [
                    {
                        id: 'recent',
                        text: 'Just started happening recently',
                        nextNode: {
                            id: 'recent-changes',
                            question: 'Did you recently update anything?',
                            answers: [
                                {
                                    id: 'updated-tool',
                                    text: 'Yes, I updated {{toolName}}',
                                    resolution: 'This is likely a version compatibility issue. Try rolling back to the previous version or wait for a compatibility update.',
                                },
                                {
                                    id: 'updated-system',
                                    text: 'Yes, I updated the system',
                                    resolution: 'The system update may have changed compatibility requirements. Check for {{toolName}} updates or contact support.',
                                },
                            ],
                        },
                    },
                    {
                        id: 'always',
                        text: 'This has never worked',
                        resolution: '{{toolName}} may not be properly installed or configured. Check the installation guide.',
                    },
                ],
            },
            diagnosticQuestions: [
                {
                    question: 'What version of {{toolName}} are you using?',
                    type: 'text',
                    required: true,
                    helpText: 'You can usually find this in the About or Help menu',
                },
                {
                    question: 'When did you last update {{toolName}}?',
                    type: 'text',
                    required: false,
                    helpText: 'Help us understand if this is related to a recent change',
                },
            ],
        });
        // Add more templates for other error types...
        this.addToolExecutionTemplates();
        this.addAuthenticationTemplates();
        this.addSystemResourceTemplates();
        this.addUserInputTemplates();
    }
    /**
     * Add tool execution error templates
     */
    addToolExecutionTemplates() {
        this.explanationTemplates.set('tool_execution:timeout', {
            beginnerMessage: "{{toolName}} is taking too long to respond. This usually means it's busy or having connection issues.",
            intermediateMessage: '{{toolName}} operation timed out. The tool may be overloaded or experiencing network issues.',
            advancedMessage: '{{toolName}} execution timeout after waiting for response. Check tool performance and network connectivity.',
            developerMessage: 'Tool execution timeout for {{toolName}}: {{errorMessage}}. Review timeout settings and tool performance metrics.',
            resolutionSteps: [
                {
                    title: 'Wait and Retry',
                    description: 'Wait a few moments and try the operation again',
                    skillLevel: UserSkillLevel.BEGINNER,
                    difficulty: 'easy',
                    estimatedTime: '1-2 minutes',
                    instructions: {
                        beginner: [
                            'Wait 30 seconds',
                            'Try the same operation again',
                            'If it fails again, wait longer before retrying',
                        ],
                        intermediate: [
                            'Check {{toolName}} status',
                            'Wait for 1-2 minutes',
                            'Retry with simpler parameters if possible',
                        ],
                        advanced: [
                            'Check network connectivity',
                            'Monitor {{toolName}} performance',
                            'Consider increasing timeout settings',
                        ],
                        developer: [
                            'Check tool response times in monitoring',
                            'Review timeout configuration',
                            'Implement exponential backoff retry',
                        ],
                    },
                    successCriteria: 'Operation completes within expected timeframe',
                    commonMistakes: [
                        'Retrying immediately without waiting',
                        'Not checking network connectivity',
                    ],
                    prerequisites: [],
                    dependsOn: [],
                },
            ],
            quickActions: [
                {
                    title: 'Retry Now',
                    description: 'Try the operation again immediately',
                    action: 'retry',
                    skillLevel: UserSkillLevel.BEGINNER,
                    estimatedTime: '30 seconds',
                    requiresAuth: false,
                    requiresElevation: false,
                    reversible: true,
                    successMessage: 'Operation completed successfully',
                },
            ],
            preventionTips: [
                {
                    title: 'Optimize Request Size',
                    description: 'Break large operations into smaller chunks',
                    category: 'best_practice',
                    applicability: [UserSkillLevel.INTERMEDIATE, UserSkillLevel.ADVANCED],
                    implementationSteps: [
                        'Identify operations that consistently timeout',
                        'Break them into smaller, manageable pieces',
                        'Process in batches with appropriate delays',
                    ],
                    tools: [],
                    resources: [],
                },
            ],
            troubleshootingTree: {
                id: 'root',
                question: 'How large or complex was the operation that timed out?',
                answers: [
                    {
                        id: 'large',
                        text: 'Large dataset or complex operation',
                        resolution: 'Try breaking the operation into smaller parts or use batch processing.',
                    },
                    {
                        id: 'simple',
                        text: 'Simple, small operation',
                        nextNode: {
                            id: 'frequency',
                            question: 'Does this happen frequently?',
                            answers: [
                                {
                                    id: 'frequent',
                                    text: 'Yes, happens often',
                                    resolution: '{{toolName}} may be experiencing performance issues. Contact support or check service status.',
                                },
                                {
                                    id: 'rare',
                                    text: 'No, this is unusual',
                                    resolution: 'This may be a temporary issue. Try again in a few minutes.',
                                },
                            ],
                        },
                    },
                ],
            },
            diagnosticQuestions: [
                {
                    question: 'How long did you wait before the timeout occurred?',
                    type: 'text',
                    required: true,
                    helpText: 'This helps us understand if the timeout setting is appropriate',
                },
            ],
        });
    }
    /**
     * Add authentication error templates
     */
    addAuthenticationTemplates() {
        // Implementation for authentication templates...
    }
    /**
     * Add system resource error templates
     */
    addSystemResourceTemplates() {
        // Implementation for system resource templates...
    }
    /**
     * Add user input error templates
     */
    addUserInputTemplates() {
        // Implementation for user input templates...
    }
    /**
     * Initialize contextual modifiers
     */
    initializeContextualModifiers() {
        // Contextual modifiers based on user behavior, time of day, etc.
    }
    /**
     * Apply contextual modifications to templates
     */
    applyContextualModifications(template, error, userSkillLevel, userContext) {
        // Apply modifications based on context
        return template; // Simplified for now
    }
    /**
     * Helper methods
     */
    shouldIncludeStep(stepTemplate, userSkillLevel, error) {
        return true; // Simplified logic
    }
    shouldIncludeAction(actionTemplate, userSkillLevel, error) {
        return true; // Simplified logic
    }
    addErrorSpecificSteps(steps, error) {
        // Add steps specific to the error instance
    }
    generateTitle(error, template) {
        return `Issue with ${error.context.toolName || error.component}`;
    }
    generateSummary(error, template, userSkillLevel) {
        return template[`${userSkillLevel}Message`] || error.getUserMessage();
    }
    estimateTimeToResolve(error) {
        switch (error.severity) {
            case ErrorSeverity.WARNING:
                return '1-2 minutes';
            case ErrorSeverity.ERROR:
                return '5-10 minutes';
            case ErrorSeverity.CRITICAL:
                return '15-30 minutes';
            case ErrorSeverity.FATAL:
                return '30+ minutes';
            default:
                return '2-5 minutes';
        }
    }
    findRelatedErrors(error) {
        // Find related error patterns
        return [];
    }
    findDocumentationLinks(error, userSkillLevel) {
        // Generate relevant documentation links
        return [];
    }
    interpolateTroubleshootingNode(node, error) {
        return {
            ...node,
            question: this.interpolateTemplate(node.question, error),
            answers: node.answers.map((answer) => ({
                ...answer,
                text: this.interpolateTemplate(answer.text, error),
                resolution: answer.resolution
                    ? this.interpolateTemplate(answer.resolution, error)
                    : undefined,
                nextNode: answer.nextNode
                    ? this.interpolateTroubleshootingNode(answer.nextNode, error)
                    : undefined,
            })),
        };
    }
    getDefaultTemplate() {
        return {
            beginnerMessage: 'An error occurred while processing your request. Please try again or contact support if the issue persists.',
            intermediateMessage: 'A technical issue has been encountered. Check your configuration and try again.',
            advancedMessage: 'System error detected. Review logs and system status for more information.',
            developerMessage: 'Error in component {{component}}: {{errorMessage}}. Check logs for detailed stack trace.',
            resolutionSteps: [],
            quickActions: [],
            preventionTips: [],
            troubleshootingTree: {
                id: 'root',
                question: 'What were you trying to do when this error occurred?',
                answers: [],
            },
            diagnosticQuestions: [],
        };
    }
}
/**
 * Singleton error explanation service
 */
export const errorExplanationService = new ErrorExplanationService();
/**
 * Convenience function for generating explanations
 */
export const explainError = (error, userSkillLevel, format, userContext) => errorExplanationService.generateExplanation(error, userSkillLevel, format, userContext);
