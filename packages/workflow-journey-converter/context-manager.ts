/**
 * Context and State Management Preservation System
 *
 * This module provides comprehensive context mapping and state preservation
 * functionality for converting ReactFlow workflows to Parlant journeys.
 * It ensures that all workflow variables, session state, execution context,
 * and dynamic data are properly preserved and transformed during conversion.
 *
 * Key Responsibilities:
 * - Variable mapping and type preservation
 * - Session state transformation and continuity
 * - Execution context transfer
 * - Dynamic variable resolution
 * - State validation and consistency checks
 * - Context inheritance and scoping
 *
 * @example
 * ```typescript
 * const contextManager = new ContextManager();
 * const journeyContext = await contextManager.preserveContext(
 *   workflowContext,
 *   analysisResult
 * );
 * ```
 */

import type {
  ContextInheritance,
  ContextMapping,
  ContextValidation,
  ConversionOptions,
  DynamicVariableResolution,
  ExecutionContextMapping,
  JourneyDefinition,
  SessionStateMapping,
  SimWorkflowDefinition,
  ValidationResult,
  VariableDefinition,
  VariableMapping,
  WorkflowAnalysisResult,
} from "./types";

/**
 * Context Manager for preserving workflow context during journey conversion
 */
export class ContextManager {
  private readonly logger: ContextLogger;
  private readonly variableMapper: VariableMapper;
  private readonly sessionStateManager: SessionStateManager;
  private readonly executionContextManager: ExecutionContextManager;
  private readonly dynamicVariableResolver: DynamicVariableResolver;
  private readonly contextValidator: ContextValidator;
  private readonly contextInheritanceManager: ContextInheritanceManager;

  constructor() {
    this.logger = new ContextLogger("ContextManager");
    this.variableMapper = new VariableMapper();
    this.sessionStateManager = new SessionStateManager();
    this.executionContextManager = new ExecutionContextManager();
    this.dynamicVariableResolver = new DynamicVariableResolver();
    this.contextValidator = new ContextValidator();
    this.contextInheritanceManager = new ContextInheritanceManager();
  }

  /**
   * Preserve complete workflow context during journey conversion
   */
  async preserveContext(
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    options: ConversionOptions = {},
  ): Promise<ContextMapping> {
    this.logger.info("Starting context preservation", {
      workflowId: workflow.id,
      variableCount: workflow.variables?.length || 0,
      nodeCount: workflow.nodes.length,
    });

    try {
      // Step 1: Map workflow variables to journey variables
      const variableMapping = await this.variableMapper.mapVariables(
        workflow.variables || [],
        analysis.variables,
        options,
      );

      // Step 2: Transform session state requirements
      const sessionStateMapping =
        await this.sessionStateManager.mapSessionState(
          workflow,
          analysis,
          variableMapping,
        );

      // Step 3: Map execution context and control flow
      const executionContextMapping =
        await this.executionContextManager.mapExecutionContext(
          workflow,
          analysis,
          options,
        );

      // Step 4: Resolve dynamic variable dependencies
      const dynamicResolution =
        await this.dynamicVariableResolver.resolveDynamicVariables(
          workflow,
          analysis,
          variableMapping,
        );

      // Step 5: Establish context inheritance hierarchy
      const contextInheritance =
        await this.contextInheritanceManager.establishInheritance(
          workflow,
          analysis,
          variableMapping,
        );

      // Step 6: Validate context consistency
      const validation = await this.contextValidator.validateContext({
        variableMapping,
        sessionStateMapping,
        executionContextMapping,
        dynamicResolution,
        contextInheritance,
      });

      if (!validation.isValid) {
        throw new ConversionError(
          "Context validation failed",
          "CONTEXT_VALIDATION_ERROR",
          {
            errors: validation.errors,
          },
        );
      }

      const contextMapping: ContextMapping = {
        workflowId: workflow.id,
        journeyId: analysis.journeyId || `journey_${workflow.id}`,
        variableMapping,
        sessionStateMapping,
        executionContextMapping,
        dynamicResolution,
        contextInheritance,
        validation,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      };

      this.logger.info("Context preservation completed successfully", {
        workflowId: workflow.id,
        mappedVariables: variableMapping.mappings.length,
        sessionStates: sessionStateMapping.states.length,
        executionContexts: executionContextMapping.contexts.length,
        dynamicVariables: dynamicResolution.resolutions.length,
      });

      return contextMapping;
    } catch (error) {
      this.logger.error("Context preservation failed", {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Apply preserved context to journey definition
   */
  async applyContextToJourney(
    journey: JourneyDefinition,
    contextMapping: ContextMapping,
  ): Promise<JourneyDefinition> {
    this.logger.info("Applying context to journey", {
      journeyId: journey.id,
      contextId: contextMapping.workflowId,
    });

    try {
      // Apply variable mappings to journey states
      const updatedJourney = await this.applyVariableMappings(
        journey,
        contextMapping.variableMapping,
      );

      // Apply session state requirements
      const withSessionState = await this.applySessionStateMappings(
        updatedJourney,
        contextMapping.sessionStateMapping,
      );

      // Apply execution context
      const withExecutionContext = await this.applyExecutionContextMappings(
        withSessionState,
        contextMapping.executionContextMapping,
      );

      // Apply dynamic variable resolutions
      const withDynamicVariables = await this.applyDynamicVariableResolutions(
        withExecutionContext,
        contextMapping.dynamicResolution,
      );

      // Apply context inheritance
      const finalJourney = await this.applyContextInheritance(
        withDynamicVariables,
        contextMapping.contextInheritance,
      );

      this.logger.info("Context application completed", {
        journeyId: finalJourney.id,
        appliedMappings: contextMapping.variableMapping.mappings.length,
      });

      return finalJourney;
    } catch (error) {
      this.logger.error("Context application failed", {
        journeyId: journey.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Apply variable mappings to journey states
   */
  private async applyVariableMappings(
    journey: JourneyDefinition,
    variableMapping: VariableMapping,
  ): Promise<JourneyDefinition> {
    const updatedStates = journey.states.map((state) => {
      // Update state configuration with mapped variables
      const updatedConfiguration = this.updateStateConfigurationWithVariables(
        state.configuration,
        variableMapping,
      );

      return {
        ...state,
        configuration: updatedConfiguration,
      };
    });

    const updatedTransitions = journey.transitions.map((transition) => {
      // Update transition conditions with mapped variables
      const updatedConditions = transition.conditions?.map((condition) => ({
        ...condition,
        variables: this.mapConditionVariables(
          condition.variables || [],
          variableMapping,
        ),
      }));

      return {
        ...transition,
        conditions: updatedConditions,
      };
    });

    return {
      ...journey,
      states: updatedStates,
      transitions: updatedTransitions,
      variables: variableMapping.journeyVariables,
    };
  }

  /**
   * Apply session state mappings to journey
   */
  private async applySessionStateMappings(
    journey: JourneyDefinition,
    sessionStateMapping: SessionStateMapping,
  ): Promise<JourneyDefinition> {
    const updatedStates = journey.states.map((state) => {
      const sessionState = sessionStateMapping.states.find(
        (s) => s.stateId === state.id,
      );
      if (sessionState) {
        return {
          ...state,
          sessionRequirements: sessionState.requirements,
          sessionContext: sessionState.context,
        };
      }
      return state;
    });

    return {
      ...journey,
      states: updatedStates,
      sessionConfiguration: sessionStateMapping.configuration,
    };
  }

  /**
   * Apply execution context mappings to journey
   */
  private async applyExecutionContextMappings(
    journey: JourneyDefinition,
    executionContextMapping: ExecutionContextMapping,
  ): Promise<JourneyDefinition> {
    const updatedStates = journey.states.map((state) => {
      const executionContext = executionContextMapping.contexts.find(
        (c) => c.stateId === state.id,
      );
      if (executionContext) {
        return {
          ...state,
          executionContext: executionContext.context,
          executionOptions: executionContext.options,
        };
      }
      return state;
    });

    return {
      ...journey,
      states: updatedStates,
      executionConfiguration: executionContextMapping.configuration,
    };
  }

  /**
   * Apply dynamic variable resolutions to journey
   */
  private async applyDynamicVariableResolutions(
    journey: JourneyDefinition,
    dynamicResolution: DynamicVariableResolution,
  ): Promise<JourneyDefinition> {
    const updatedStates = journey.states.map((state) => {
      const resolutions = dynamicResolution.resolutions.filter(
        (r) => r.stateId === state.id,
      );
      if (resolutions.length > 0) {
        return {
          ...state,
          dynamicVariables: resolutions.map((r) => r.resolution),
          variableResolutionRules: resolutions.map((r) => r.rules),
        };
      }
      return state;
    });

    return {
      ...journey,
      states: updatedStates,
      dynamicVariableConfiguration: dynamicResolution.configuration,
    };
  }

  /**
   * Apply context inheritance to journey
   */
  private async applyContextInheritance(
    journey: JourneyDefinition,
    contextInheritance: ContextInheritance,
  ): Promise<JourneyDefinition> {
    const updatedStates = journey.states.map((state) => {
      const inheritance = contextInheritance.hierarchy.find(
        (h) => h.stateId === state.id,
      );
      if (inheritance) {
        return {
          ...state,
          parentContext: inheritance.parentContext,
          childContexts: inheritance.childContexts,
          inheritanceRules: inheritance.rules,
        };
      }
      return state;
    });

    return {
      ...journey,
      states: updatedStates,
      contextInheritanceConfiguration: contextInheritance.configuration,
    };
  }

  /**
   * Update state configuration with mapped variables
   */
  private updateStateConfigurationWithVariables(
    configuration: any,
    variableMapping: VariableMapping,
  ): any {
    // Deep clone configuration to avoid mutation
    const updatedConfig = JSON.parse(JSON.stringify(configuration));

    // Replace variable references in configuration
    for (const mapping of variableMapping.mappings) {
      this.replaceVariableReferences(
        updatedConfig,
        mapping.workflowVariable.name,
        mapping.journeyVariable.name,
      );
    }

    return updatedConfig;
  }

  /**
   * Map condition variables using variable mapping
   */
  private mapConditionVariables(
    variables: string[],
    variableMapping: VariableMapping,
  ): string[] {
    return variables.map((variable) => {
      const mapping = variableMapping.mappings.find(
        (m) => m.workflowVariable.name === variable,
      );
      return mapping ? mapping.journeyVariable.name : variable;
    });
  }

  /**
   * Replace variable references in object recursively
   */
  private replaceVariableReferences(
    obj: any,
    oldName: string,
    newName: string,
  ): any {
    if (typeof obj === "string") {
      // Replace variable reference patterns like ${variable} or {{variable}}
      return obj.replace(
        new RegExp(`\\$\\{${oldName}\\}|\\{\\{${oldName}\\}\\}`, "g"),
        `{{${newName}}}`,
      );
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        obj[index] = this.replaceVariableReferences(item, oldName, newName);
      });
      return obj;
    }

    if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        obj[key] = this.replaceVariableReferences(obj[key], oldName, newName);
      });
      return obj;
    }

    // For primitive types other than string, return as-is
    return obj;
  }
}

/**
 * Variable Mapper for converting workflow variables to journey variables
 */
export class VariableMapper {
  private readonly logger: ContextLogger;

  constructor() {
    this.logger = new ContextLogger("VariableMapper");
  }

  /**
   * Map workflow variables to journey variables with type preservation
   */
  async mapVariables(
    workflowVariables: VariableDefinition[],
    analysisVariables: any[],
    options: ConversionOptions,
  ): Promise<VariableMapping> {
    this.logger.info("Starting variable mapping", {
      workflowVariableCount: workflowVariables.length,
      analysisVariableCount: analysisVariables.length,
    });

    const mappings: VariableMapping["mappings"] = [];
    const journeyVariables: VariableDefinition[] = [];

    for (const workflowVar of workflowVariables) {
      try {
        // Convert workflow variable to journey variable format
        const journeyVar = await this.convertVariableDefinition(
          workflowVar,
          options,
        );

        // Create mapping between workflow and journey variables
        const mapping = {
          workflowVariable: workflowVar,
          journeyVariable: journeyVar,
          conversionType: this.determineConversionType(workflowVar, journeyVar),
          transformationRules: this.generateTransformationRules(
            workflowVar,
            journeyVar,
          ),
          validation: await this.validateVariableMapping(
            workflowVar,
            journeyVar,
          ),
        };

        mappings.push(mapping);
        journeyVariables.push(journeyVar);

        this.logger.debug("Variable mapped successfully", {
          workflowVar: workflowVar.name,
          journeyVar: journeyVar.name,
          type: mapping.conversionType,
        });
      } catch (error) {
        this.logger.error("Variable mapping failed", {
          variable: workflowVar.name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    const variableMapping: VariableMapping = {
      mappings,
      journeyVariables,
      statistics: {
        totalMappings: mappings.length,
        typePreservations: mappings.filter((m) => m.conversionType === "direct")
          .length,
        typeConversions: mappings.filter(
          (m) => m.conversionType === "converted",
        ).length,
        complexMappings: mappings.filter((m) => m.conversionType === "complex")
          .length,
      },
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    };

    this.logger.info("Variable mapping completed", {
      totalMappings: variableMapping.mappings.length,
      typePreservations: variableMapping.statistics.typePreservations,
      typeConversions: variableMapping.statistics.typeConversions,
    });

    return variableMapping;
  }

  /**
   * Convert workflow variable definition to journey variable format
   */
  private async convertVariableDefinition(
    workflowVar: VariableDefinition,
    options: ConversionOptions,
  ): Promise<VariableDefinition> {
    // Map variable types from workflow to journey format
    const journeyType = this.mapVariableType(
      workflowVar.type,
      workflowVar.value,
    );

    return {
      id: `journey_var_${workflowVar.id}`,
      name: this.generateJourneyVariableName(workflowVar.name),
      type: journeyType,
      value: await this.convertVariableValue(
        workflowVar.value,
        workflowVar.type,
        journeyType,
      ),
      description: workflowVar.description,
      scope: this.mapVariableScope(workflowVar.scope),
      required: workflowVar.required,
      validation: this.convertValidationRules(workflowVar.validation),
      metadata: {
        ...workflowVar.metadata,
        originalWorkflowVariable: workflowVar.id,
        conversionTimestamp: new Date().toISOString(),
        conversionOptions: options,
      },
    };
  }

  /**
   * Map variable type from workflow to journey format
   */
  private mapVariableType(workflowType: string, value: any): string {
    const typeMapping: Record<string, string> = {
      string: "text",
      number: "number",
      boolean: "boolean",
      object: "json",
      array: "list",
      date: "timestamp",
      file: "attachment",
      url: "url",
      email: "email",
      phone: "phone",
    };

    // Try direct mapping first
    if (typeMapping[workflowType]) {
      return typeMapping[workflowType];
    }

    // Infer type from value if direct mapping not available
    if (value !== undefined && value !== null) {
      const inferredType = typeof value;
      return typeMapping[inferredType] || "text";
    }

    // Default fallback
    return "text";
  }

  /**
   * Generate journey variable name with proper naming conventions
   */
  private generateJourneyVariableName(workflowName: string): string {
    // Convert to camelCase if not already
    const camelCase = workflowName.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );

    // Ensure valid JavaScript identifier
    const validName = camelCase.replace(/[^a-zA-Z0-9_$]/g, "_");

    // Ensure doesn't start with number
    return /^[0-9]/.test(validName) ? `var_${validName}` : validName;
  }

  /**
   * Convert variable value between formats
   */
  private async convertVariableValue(
    value: any,
    fromType: string,
    toType: string,
  ): Promise<any> {
    // If types are compatible, return as-is
    if (this.areTypesCompatible(fromType, toType)) {
      return value;
    }

    // Perform type conversion
    try {
      switch (toType) {
        case "text":
          return String(value);
        case "number":
          return Number(value);
        case "boolean":
          return Boolean(value);
        case "json":
          return typeof value === "string" ? JSON.parse(value) : value;
        case "list":
          return Array.isArray(value) ? value : [value];
        case "timestamp":
          return value instanceof Date
            ? value.toISOString()
            : new Date(value).toISOString();
        default:
          return value;
      }
    } catch (error) {
      this.logger.warn(
        "Variable value conversion failed, using original value",
        {
          value,
          fromType,
          toType,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return value;
    }
  }

  /**
   * Check if variable types are compatible
   */
  private areTypesCompatible(fromType: string, toType: string): boolean {
    const compatibilityMap: Record<string, string[]> = {
      string: ["text", "url", "email", "phone"],
      number: ["number"],
      boolean: ["boolean"],
      object: ["json"],
      array: ["list"],
      date: ["timestamp"],
    };

    const compatibleTypes = compatibilityMap[fromType] || [];
    return compatibleTypes.includes(toType) || fromType === toType;
  }

  /**
   * Map variable scope from workflow to journey
   */
  private mapVariableScope(workflowScope?: string): string {
    const scopeMapping: Record<string, string> = {
      global: "journey",
      workflow: "journey",
      local: "state",
      session: "session",
      user: "customer",
    };

    return scopeMapping[workflowScope || "local"] || "state";
  }

  /**
   * Convert validation rules from workflow to journey format
   */
  private convertValidationRules(workflowValidation?: any): any {
    if (!workflowValidation) {
      return undefined;
    }

    // Convert validation rules to journey format
    const journeyValidation: any = {};

    if (workflowValidation.required !== undefined) {
      journeyValidation.required = workflowValidation.required;
    }

    if (workflowValidation.minLength !== undefined) {
      journeyValidation.minLength = workflowValidation.minLength;
    }

    if (workflowValidation.maxLength !== undefined) {
      journeyValidation.maxLength = workflowValidation.maxLength;
    }

    if (workflowValidation.pattern) {
      journeyValidation.regex = workflowValidation.pattern;
    }

    if (workflowValidation.min !== undefined) {
      journeyValidation.minimum = workflowValidation.min;
    }

    if (workflowValidation.max !== undefined) {
      journeyValidation.maximum = workflowValidation.max;
    }

    return Object.keys(journeyValidation).length > 0
      ? journeyValidation
      : undefined;
  }

  /**
   * Determine conversion type for variable mapping
   */
  private determineConversionType(
    workflowVar: VariableDefinition,
    journeyVar: VariableDefinition,
  ): "direct" | "converted" | "complex" {
    if (
      workflowVar.type === journeyVar.type &&
      workflowVar.value === journeyVar.value
    ) {
      return "direct";
    }

    if (this.areTypesCompatible(workflowVar.type, journeyVar.type)) {
      return "converted";
    }

    return "complex";
  }

  /**
   * Generate transformation rules for variable mapping
   */
  private generateTransformationRules(
    workflowVar: VariableDefinition,
    journeyVar: VariableDefinition,
  ): any {
    return {
      typeConversion: {
        from: workflowVar.type,
        to: journeyVar.type,
        method: this.determineConversionMethod(
          workflowVar.type,
          journeyVar.type,
        ),
      },
      valueTransformation: {
        preserveOriginal: workflowVar.value === journeyVar.value,
        transformationFunction:
          workflowVar.value !== journeyVar.value
            ? `convert_${workflowVar.type}_to_${journeyVar.type}`
            : null,
      },
      scopeMapping: {
        from: workflowVar.scope,
        to: journeyVar.scope,
      },
    };
  }

  /**
   * Determine conversion method for type transformation
   */
  private determineConversionMethod(fromType: string, toType: string): string {
    if (fromType === toType) {
      return "none";
    }

    const conversionMethods: Record<string, Record<string, string>> = {
      string: {
        number: "parseNumber",
        boolean: "parseBoolean",
        json: "parseJSON",
        list: "splitString",
      },
      number: {
        text: "toString",
        boolean: "numberToBoolean",
      },
      boolean: {
        text: "toString",
        number: "booleanToNumber",
      },
      object: {
        text: "stringify",
        list: "objectToArray",
      },
    };

    return conversionMethods[fromType]?.[toType] || "customConversion";
  }

  /**
   * Validate variable mapping for consistency
   */
  private async validateVariableMapping(
    workflowVar: VariableDefinition,
    journeyVar: VariableDefinition,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!journeyVar.name) {
      errors.push("Journey variable name is required");
    }

    if (!journeyVar.type) {
      errors.push("Journey variable type is required");
    }

    // Validate type compatibility
    if (!this.areTypesCompatible(workflowVar.type, journeyVar.type)) {
      warnings.push(
        `Type conversion from ${workflowVar.type} to ${journeyVar.type} may lose data`,
      );
    }

    // Validate name format
    if (
      journeyVar.name &&
      !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(journeyVar.name)
    ) {
      errors.push(
        "Journey variable name must be a valid JavaScript identifier",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Session State Manager for preserving session context
 */
export class SessionStateManager {
  private readonly logger: ContextLogger;

  constructor() {
    this.logger = new ContextLogger("SessionStateManager");
  }

  /**
   * Map workflow session state to journey session requirements
   */
  async mapSessionState(
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    variableMapping: VariableMapping,
  ): Promise<SessionStateMapping> {
    this.logger.info("Starting session state mapping", {
      workflowId: workflow.id,
      nodeCount: workflow.nodes.length,
    });

    const states: SessionStateMapping["states"] = [];
    const configuration: SessionStateMapping["configuration"] = {
      sessionPersistence: true,
      stateSync: true,
      contextPreservation: true,
      variableSync: true,
    };

    // Map session requirements for each workflow node
    for (const node of workflow.nodes) {
      const sessionState = await this.createSessionStateForNode(
        node,
        workflow,
        analysis,
        variableMapping,
      );

      if (sessionState) {
        states.push(sessionState);
      }
    }

    const sessionStateMapping: SessionStateMapping = {
      states,
      configuration,
      statistics: {
        totalStates: states.length,
        persistentStates: states.filter((s) => s.requirements.persistent)
          .length,
        sharedStates: states.filter((s) => s.requirements.shared).length,
      },
    };

    this.logger.info("Session state mapping completed", {
      totalStates: sessionStateMapping.states.length,
      persistentStates: sessionStateMapping.statistics.persistentStates,
    });

    return sessionStateMapping;
  }

  /**
   * Create session state requirements for a workflow node
   */
  private async createSessionStateForNode(
    node: any,
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    variableMapping: VariableMapping,
  ): Promise<SessionStateMapping["states"][0] | null> {
    // Determine if node requires session state
    if (!this.nodeRequiresSessionState(node)) {
      return null;
    }

    const requirements = {
      persistent: this.nodeRequiresPersistentState(node),
      shared: this.nodeRequiresSharedState(node),
      encrypted: this.nodeRequiresEncryptedState(node),
      ttl: this.getSessionStateTTL(node),
    };

    const context = await this.generateSessionContext(node, variableMapping);

    return {
      stateId: node.id,
      nodeName: node.data?.name || node.type,
      requirements,
      context,
    };
  }

  /**
   * Check if node requires session state
   */
  private nodeRequiresSessionState(node: any): boolean {
    const sessionRequiredTypes = [
      "user-input",
      "form",
      "authentication",
      "data-storage",
      "api-call",
      "database-query",
      "file-upload",
      "payment",
    ];

    return (
      sessionRequiredTypes.includes(node.type) ||
      node.data?.requiresSession ||
      node.data?.storeData
    );
  }

  /**
   * Check if node requires persistent state
   */
  private nodeRequiresPersistentState(node: any): boolean {
    const persistentTypes = [
      "data-storage",
      "database-query",
      "file-upload",
      "payment",
      "user-profile",
    ];

    return persistentTypes.includes(node.type) || node.data?.persistent;
  }

  /**
   * Check if node requires shared state
   */
  private nodeRequiresSharedState(node: any): boolean {
    return node.data?.shared || node.data?.crossSession;
  }

  /**
   * Check if node requires encrypted state
   */
  private nodeRequiresEncryptedState(node: any): boolean {
    const encryptedTypes = [
      "authentication",
      "payment",
      "personal-data",
      "sensitive-data",
    ];

    return (
      encryptedTypes.includes(node.type) ||
      node.data?.sensitive ||
      node.data?.encrypted
    );
  }

  /**
   * Get session state TTL for node
   */
  private getSessionStateTTL(node: any): number | undefined {
    if (node.data?.ttl) {
      return node.data.ttl;
    }

    // Default TTLs based on node type
    const defaultTTLs: Record<string, number> = {
      authentication: 3600, // 1 hour
      "user-input": 1800, // 30 minutes
      form: 1800, // 30 minutes
      payment: 900, // 15 minutes
      temporary: 300, // 5 minutes
    };

    return defaultTTLs[node.type];
  }

  /**
   * Generate session context for node
   */
  private async generateSessionContext(
    node: any,
    variableMapping: VariableMapping,
  ): Promise<any> {
    const context: any = {
      nodeId: node.id,
      nodeType: node.type,
      variables: [],
      metadata: {},
    };

    // Map node-specific variables to session context
    const nodeVariables = this.extractNodeVariables(node);
    for (const nodeVar of nodeVariables) {
      const mapping = variableMapping.mappings.find(
        (m) => m.workflowVariable.name === nodeVar,
      );

      if (mapping) {
        context.variables.push({
          name: mapping.journeyVariable.name,
          type: mapping.journeyVariable.type,
          scope: "session",
        });
      }
    }

    // Add node-specific metadata
    if (node.data) {
      context.metadata = {
        originalNodeData: node.data,
        conversionTimestamp: new Date().toISOString(),
      };
    }

    return context;
  }

  /**
   * Extract variables used by a node
   */
  private extractNodeVariables(node: any): string[] {
    const variables: string[] = [];

    // Extract from node configuration
    if (node.data?.variables) {
      variables.push(...node.data.variables);
    }

    // Extract from node inputs/outputs
    if (node.data?.inputs) {
      for (const input of node.data.inputs) {
        if (input.variable) {
          variables.push(input.variable);
        }
      }
    }

    if (node.data?.outputs) {
      for (const output of node.data.outputs) {
        if (output.variable) {
          variables.push(output.variable);
        }
      }
    }

    return [...new Set(variables)]; // Remove duplicates
  }
}

/**
 * Execution Context Manager for preserving execution flow context
 */
export class ExecutionContextManager {
  private readonly logger: ContextLogger;

  constructor() {
    this.logger = new ContextLogger("ExecutionContextManager");
  }

  /**
   * Map workflow execution context to journey execution requirements
   */
  async mapExecutionContext(
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    options: ConversionOptions,
  ): Promise<ExecutionContextMapping> {
    this.logger.info("Starting execution context mapping", {
      workflowId: workflow.id,
      nodeCount: workflow.nodes.length,
    });

    const contexts: ExecutionContextMapping["contexts"] = [];
    const configuration: ExecutionContextMapping["configuration"] = {
      preserveExecutionOrder: true,
      maintainState: true,
      errorHandling: true,
      parallelExecution: analysis.structure?.hasParallelExecution || false,
    };

    // Map execution context for each workflow node
    for (const node of workflow.nodes) {
      const executionContext = await this.createExecutionContextForNode(
        node,
        workflow,
        analysis,
        options,
      );

      contexts.push(executionContext);
    }

    const executionContextMapping: ExecutionContextMapping = {
      contexts,
      configuration,
      statistics: {
        totalContexts: contexts.length,
        asyncContexts: contexts.filter((c) => c.options.async).length,
        errorHandledContexts: contexts.filter((c) => c.options.errorHandling)
          .length,
      },
    };

    this.logger.info("Execution context mapping completed", {
      totalContexts: executionContextMapping.contexts.length,
      asyncContexts: executionContextMapping.statistics.asyncContexts,
    });

    return executionContextMapping;
  }

  /**
   * Create execution context for a workflow node
   */
  private async createExecutionContextForNode(
    node: any,
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    options: ConversionOptions,
  ): Promise<ExecutionContextMapping["contexts"][0]> {
    const context = {
      nodeId: node.id,
      nodeType: node.type,
      executionOrder: this.determineExecutionOrder(node, workflow),
      dependencies: this.findNodeDependencies(node, workflow),
      conditions: this.extractExecutionConditions(node),
      timeout: this.determineExecutionTimeout(node),
      retryPolicy: this.createRetryPolicy(node),
      errorHandling: this.createErrorHandling(node),
    };

    const executionOptions = {
      async: this.isAsyncExecution(node),
      parallel: this.canExecuteInParallel(node, analysis),
      cached: this.shouldCacheResults(node),
      errorHandling: this.shouldHandleErrors(node),
      monitoring: this.shouldMonitorExecution(node),
    };

    return {
      stateId: node.id,
      context,
      options: executionOptions,
    };
  }

  /**
   * Determine execution order for node
   */
  private determineExecutionOrder(
    node: any,
    workflow: SimWorkflowDefinition,
  ): number {
    // Use topological sort to determine execution order
    const nodeIds = workflow.nodes.map((n) => n.id);
    const edges = workflow.edges || [];

    // Simple implementation - can be enhanced with proper topological sort
    const incomingEdges = edges.filter((edge) => edge.target === node.id);

    if (incomingEdges.length === 0) {
      return 0; // Start node
    }

    // Find maximum order of predecessor nodes + 1
    let maxOrder = 0;
    for (const edge of incomingEdges) {
      const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
      if (sourceNode?.data?.executionOrder !== undefined) {
        maxOrder = Math.max(maxOrder, sourceNode.data.executionOrder);
      }
    }

    return maxOrder + 1;
  }

  /**
   * Find node dependencies
   */
  private findNodeDependencies(
    node: any,
    workflow: SimWorkflowDefinition,
  ): string[] {
    const edges = workflow.edges || [];
    return edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.source);
  }

  /**
   * Extract execution conditions from node
   */
  private extractExecutionConditions(node: any): any[] {
    const conditions: any[] = [];

    if (node.data?.conditions) {
      conditions.push(...node.data.conditions);
    }

    if (node.data?.triggers) {
      conditions.push(
        ...node.data.triggers.map((trigger: any) => ({
          type: "trigger",
          condition: trigger,
        })),
      );
    }

    return conditions;
  }

  /**
   * Determine execution timeout for node
   */
  private determineExecutionTimeout(node: any): number {
    if (node.data?.timeout) {
      return node.data.timeout;
    }

    // Default timeouts based on node type
    const defaultTimeouts: Record<string, number> = {
      "api-call": 30000, // 30 seconds
      "database-query": 15000, // 15 seconds
      "file-upload": 60000, // 1 minute
      "user-input": 300000, // 5 minutes
      tool: 45000, // 45 seconds
      condition: 5000, // 5 seconds
    };

    return defaultTimeouts[node.type] || 30000; // Default 30 seconds
  }

  /**
   * Create retry policy for node
   */
  private createRetryPolicy(node: any): any {
    if (node.data?.retryPolicy) {
      return node.data.retryPolicy;
    }

    // Default retry policies based on node type
    const defaultRetryPolicies: Record<string, any> = {
      "api-call": {
        maxRetries: 3,
        backoffStrategy: "exponential",
        initialDelay: 1000,
        maxDelay: 10000,
      },
      "database-query": {
        maxRetries: 2,
        backoffStrategy: "linear",
        initialDelay: 500,
        maxDelay: 5000,
      },
      tool: {
        maxRetries: 1,
        backoffStrategy: "fixed",
        initialDelay: 2000,
        maxDelay: 2000,
      },
    };

    return (
      defaultRetryPolicies[node.type] || {
        maxRetries: 1,
        backoffStrategy: "fixed",
        initialDelay: 1000,
        maxDelay: 1000,
      }
    );
  }

  /**
   * Create error handling strategy for node
   */
  private createErrorHandling(node: any): any {
    return {
      strategy: node.data?.errorHandling?.strategy || "continue",
      fallback: node.data?.errorHandling?.fallback,
      notification: node.data?.errorHandling?.notify || false,
      recovery: node.data?.errorHandling?.recovery,
    };
  }

  /**
   * Check if node should execute asynchronously
   */
  private isAsyncExecution(node: any): boolean {
    const asyncTypes = [
      "api-call",
      "database-query",
      "file-upload",
      "email-send",
      "webhook",
    ];

    return asyncTypes.includes(node.type) || node.data?.async === true;
  }

  /**
   * Check if node can execute in parallel
   */
  private canExecuteInParallel(
    node: any,
    analysis: WorkflowAnalysisResult,
  ): boolean {
    if (!analysis.structure?.hasParallelExecution) {
      return false;
    }

    return node.data?.parallel === true || node.data?.canParallelize === true;
  }

  /**
   * Check if node results should be cached
   */
  private shouldCacheResults(node: any): boolean {
    const cacheableTypes = [
      "api-call",
      "database-query",
      "calculation",
      "data-transform",
    ];

    return cacheableTypes.includes(node.type) || node.data?.cacheable === true;
  }

  /**
   * Check if node should handle errors
   */
  private shouldHandleErrors(node: any): boolean {
    // Most nodes should handle errors by default
    return node.data?.errorHandling !== false;
  }

  /**
   * Check if node execution should be monitored
   */
  private shouldMonitorExecution(node: any): boolean {
    const monitoredTypes = [
      "api-call",
      "database-query",
      "file-upload",
      "payment",
      "authentication",
    ];

    return monitoredTypes.includes(node.type) || node.data?.monitor === true;
  }
}

/**
 * Dynamic Variable Resolver for handling runtime variable resolution
 */
export class DynamicVariableResolver {
  private readonly logger: ContextLogger;

  constructor() {
    this.logger = new ContextLogger("DynamicVariableResolver");
  }

  /**
   * Resolve dynamic variable dependencies and relationships
   */
  async resolveDynamicVariables(
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    variableMapping: VariableMapping,
  ): Promise<DynamicVariableResolution> {
    this.logger.info("Starting dynamic variable resolution", {
      workflowId: workflow.id,
      variableMappings: variableMapping.mappings.length,
    });

    const resolutions: DynamicVariableResolution["resolutions"] = [];
    const configuration: DynamicVariableResolution["configuration"] = {
      enableDynamicResolution: true,
      lazyEvaluation: true,
      cacheResolutions: true,
      errorRecovery: true,
    };

    // Analyze each node for dynamic variable requirements
    for (const node of workflow.nodes) {
      const resolution = await this.createDynamicResolutionForNode(
        node,
        workflow,
        analysis,
        variableMapping,
      );

      if (resolution) {
        resolutions.push(resolution);
      }
    }

    const dynamicVariableResolution: DynamicVariableResolution = {
      resolutions,
      configuration,
      statistics: {
        totalResolutions: resolutions.length,
        dynamicVariables: resolutions.reduce(
          (sum, r) => sum + r.resolution.variables.length,
          0,
        ),
        complexResolutions: resolutions.filter(
          (r) => r.resolution.complexity === "complex",
        ).length,
      },
    };

    this.logger.info("Dynamic variable resolution completed", {
      totalResolutions: dynamicVariableResolution.resolutions.length,
      dynamicVariables: dynamicVariableResolution.statistics.dynamicVariables,
    });

    return dynamicVariableResolution;
  }

  /**
   * Create dynamic variable resolution for a node
   */
  private async createDynamicResolutionForNode(
    node: any,
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    variableMapping: VariableMapping,
  ): Promise<DynamicVariableResolution["resolutions"][0] | null> {
    const dynamicVariables = this.extractDynamicVariables(node);

    if (dynamicVariables.length === 0) {
      return null;
    }

    const resolution = {
      variables: dynamicVariables.map((variable) => ({
        name: variable.name,
        type: variable.type,
        source: variable.source,
        dependencies: variable.dependencies,
        resolutionStrategy: this.determineResolutionStrategy(variable),
        caching: this.shouldCacheVariable(variable),
      })),
      complexity: this.determineResolutionComplexity(dynamicVariables),
      timing: this.determineResolutionTiming(node, dynamicVariables),
    };

    const rules = this.generateResolutionRules(
      node,
      dynamicVariables,
      variableMapping,
    );

    return {
      stateId: node.id,
      resolution,
      rules,
    };
  }

  /**
   * Extract dynamic variables from node
   */
  private extractDynamicVariables(node: any): any[] {
    const dynamicVariables: any[] = [];

    // Check for runtime-resolved variables in node configuration
    if (node.data?.dynamicVariables) {
      dynamicVariables.push(...node.data.dynamicVariables);
    }

    // Check for calculated/computed variables
    if (node.data?.calculations) {
      for (const calc of node.data.calculations) {
        dynamicVariables.push({
          name: calc.outputVariable,
          type: "calculated",
          source: "computation",
          dependencies: calc.inputVariables || [],
          formula: calc.formula,
        });
      }
    }

    // Check for user-input variables that are resolved at runtime
    if (node.type === "user-input" && node.data?.inputVariable) {
      dynamicVariables.push({
        name: node.data.inputVariable,
        type: "user-input",
        source: "user",
        dependencies: [],
      });
    }

    // Check for API response variables
    if (node.type === "api-call" && node.data?.responseMapping) {
      for (const mapping of node.data.responseMapping) {
        dynamicVariables.push({
          name: mapping.variable,
          type: "api-response",
          source: "api",
          dependencies: [],
          path: mapping.responsePath,
        });
      }
    }

    return dynamicVariables;
  }

  /**
   * Determine resolution strategy for dynamic variable
   */
  private determineResolutionStrategy(variable: any): string {
    const strategies: Record<string, string> = {
      calculated: "compute",
      "user-input": "prompt",
      "api-response": "extract",
      database: "query",
      session: "retrieve",
      context: "resolve",
    };

    return strategies[variable.type] || "default";
  }

  /**
   * Check if variable should be cached
   */
  private shouldCacheVariable(variable: any): boolean {
    const cacheableTypes = [
      "calculated",
      "api-response",
      "database",
      "external",
    ];

    return (
      cacheableTypes.includes(variable.type) || variable.expensive === true
    );
  }

  /**
   * Determine resolution complexity
   */
  private determineResolutionComplexity(
    variables: any[],
  ): "simple" | "moderate" | "complex" {
    if (
      variables.length <= 2 &&
      variables.every((v) => v.dependencies.length === 0)
    ) {
      return "simple";
    }

    if (
      variables.length <= 5 &&
      variables.some((v) => v.dependencies.length > 0)
    ) {
      return "moderate";
    }

    return "complex";
  }

  /**
   * Determine resolution timing
   */
  private determineResolutionTiming(
    node: any,
    variables: any[],
  ): "immediate" | "lazy" | "on-demand" {
    if (node.type === "start" || node.data?.preload) {
      return "immediate";
    }

    if (variables.some((v) => v.type === "user-input")) {
      return "on-demand";
    }

    return "lazy";
  }

  /**
   * Generate resolution rules for variables
   */
  private generateResolutionRules(
    node: any,
    variables: any[],
    variableMapping: VariableMapping,
  ): any {
    return {
      dependencies: this.analyzeDependencies(variables, variableMapping),
      precedence: this.determinePrecedence(variables),
      errorHandling: this.createErrorHandlingRules(variables),
      validation: this.createValidationRules(variables),
      caching: this.createCachingRules(variables),
    };
  }

  /**
   * Analyze variable dependencies
   */
  private analyzeDependencies(
    variables: any[],
    variableMapping: VariableMapping,
  ): any {
    const dependencyGraph: Record<string, string[]> = {};

    for (const variable of variables) {
      dependencyGraph[variable.name] = variable.dependencies || [];
    }

    return {
      graph: dependencyGraph,
      order: this.calculateResolutionOrder(dependencyGraph),
      circular: this.detectCircularDependencies(dependencyGraph),
    };
  }

  /**
   * Calculate resolution order based on dependencies
   */
  private calculateResolutionOrder(
    dependencyGraph: Record<string, string[]>,
  ): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (node: string) => {
      if (visiting.has(node)) {
        throw new Error(`Circular dependency detected involving ${node}`);
      }

      if (visited.has(node)) {
        return;
      }

      visiting.add(node);

      for (const dependency of dependencyGraph[node] || []) {
        visit(dependency);
      }

      visiting.delete(node);
      visited.add(node);
      order.push(node);
    };

    for (const node of Object.keys(dependencyGraph)) {
      visit(node);
    }

    return order;
  }

  /**
   * Detect circular dependencies in variable graph
   */
  private detectCircularDependencies(
    dependencyGraph: Record<string, string[]>,
  ): boolean {
    try {
      this.calculateResolutionOrder(dependencyGraph);
      return false;
    } catch (error) {
      return true;
    }
  }

  /**
   * Determine precedence for variables
   */
  private determinePrecedence(variables: any[]): any[] {
    return variables
      .map((variable) => ({
        name: variable.name,
        priority: this.calculateVariablePriority(variable),
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate priority for variable resolution
   */
  private calculateVariablePriority(variable: any): number {
    const basePriority: Record<string, number> = {
      session: 100,
      context: 90,
      "user-input": 80,
      calculated: 70,
      "api-response": 60,
      database: 50,
    };

    let priority = basePriority[variable.type] || 40;

    // Increase priority for variables with dependencies
    if (variable.dependencies?.length > 0) {
      priority += 10;
    }

    // Increase priority for critical variables
    if (variable.critical) {
      priority += 20;
    }

    return priority;
  }

  /**
   * Create error handling rules for variables
   */
  private createErrorHandlingRules(variables: any[]): any {
    return {
      strategy: "graceful-degradation",
      fallbacks: variables.reduce((fallbacks: any, variable) => {
        if (variable.fallbackValue !== undefined) {
          fallbacks[variable.name] = variable.fallbackValue;
        }
        return fallbacks;
      }, {}),
      retries:
        variables.filter(
          (v) => v.type === "api-response" || v.type === "database",
        ).length > 0,
      notifications: variables.some((v) => v.critical),
    };
  }

  /**
   * Create validation rules for variables
   */
  private createValidationRules(variables: any[]): any {
    return variables.reduce((rules: any, variable) => {
      if (variable.validation) {
        rules[variable.name] = variable.validation;
      }
      return rules;
    }, {});
  }

  /**
   * Create caching rules for variables
   */
  private createCachingRules(variables: any[]): any {
    return {
      enabled: variables.some((v) => this.shouldCacheVariable(v)),
      ttl: variables.reduce((ttls: any, variable) => {
        if (this.shouldCacheVariable(variable)) {
          ttls[variable.name] = variable.cacheTTL || 300; // Default 5 minutes
        }
        return ttls;
      }, {}),
      invalidation: variables.reduce((rules: any, variable) => {
        if (variable.cacheInvalidation) {
          rules[variable.name] = variable.cacheInvalidation;
        }
        return rules;
      }, {}),
    };
  }
}

/**
 * Context Validator for ensuring context mapping consistency
 */
export class ContextValidator {
  private readonly logger: ContextLogger;

  constructor() {
    this.logger = new ContextLogger("ContextValidator");
  }

  /**
   * Validate complete context mapping for consistency and correctness
   */
  async validateContext(
    contextMapping: Omit<ContextMapping, "validation">,
  ): Promise<ContextValidation> {
    this.logger.info("Starting context validation", {
      workflowId: contextMapping.workflowId,
      journeyId: contextMapping.journeyId,
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate variable mappings
      const variableValidation = await this.validateVariableMappings(
        contextMapping.variableMapping,
      );
      errors.push(...variableValidation.errors);
      warnings.push(...variableValidation.warnings);

      // Validate session state mappings
      const sessionValidation = await this.validateSessionStateMappings(
        contextMapping.sessionStateMapping,
      );
      errors.push(...sessionValidation.errors);
      warnings.push(...sessionValidation.warnings);

      // Validate execution context mappings
      const executionValidation = await this.validateExecutionContextMappings(
        contextMapping.executionContextMapping,
      );
      errors.push(...executionValidation.errors);
      warnings.push(...executionValidation.warnings);

      // Validate dynamic variable resolutions
      const dynamicValidation = await this.validateDynamicVariableResolutions(
        contextMapping.dynamicResolution,
      );
      errors.push(...dynamicValidation.errors);
      warnings.push(...dynamicValidation.warnings);

      // Validate context inheritance
      const inheritanceValidation = await this.validateContextInheritance(
        contextMapping.contextInheritance,
      );
      errors.push(...inheritanceValidation.errors);
      warnings.push(...inheritanceValidation.warnings);

      // Cross-validate relationships between different mappings
      const crossValidation =
        await this.validateCrossMappingConsistency(contextMapping);
      errors.push(...crossValidation.errors);
      warnings.push(...crossValidation.warnings);

      const validation: ContextValidation = {
        isValid: errors.length === 0,
        errors,
        warnings,
        details: {
          variableMapping: variableValidation,
          sessionStateMapping: sessionValidation,
          executionContextMapping: executionValidation,
          dynamicResolution: dynamicValidation,
          contextInheritance: inheritanceValidation,
          crossValidation,
        },
      };

      this.logger.info("Context validation completed", {
        isValid: validation.isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
      });

      return validation;
    } catch (error) {
      this.logger.error("Context validation failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        isValid: false,
        errors: [
          `Context validation failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
        warnings,
      };
    }
  }

  /**
   * Validate variable mappings
   */
  private async validateVariableMappings(
    variableMapping: VariableMapping,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate variable names
    const journeyVariableNames = variableMapping.journeyVariables.map(
      (v) => v.name,
    );
    const duplicates = journeyVariableNames.filter(
      (name, index) => journeyVariableNames.indexOf(name) !== index,
    );

    if (duplicates.length > 0) {
      errors.push(`Duplicate journey variable names: ${duplicates.join(", ")}`);
    }

    // Validate each mapping
    for (const mapping of variableMapping.mappings) {
      if (!mapping.workflowVariable.name || !mapping.journeyVariable.name) {
        errors.push("Variable mapping missing required names");
      }

      if (mapping.conversionType === "complex" && !mapping.validation.isValid) {
        warnings.push(
          `Complex variable conversion may fail: ${mapping.workflowVariable.name}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate session state mappings
   */
  private async validateSessionStateMappings(
    sessionStateMapping: SessionStateMapping,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate state IDs
    const stateIds = sessionStateMapping.states.map((s) => s.stateId);
    const duplicates = stateIds.filter(
      (id, index) => stateIds.indexOf(id) !== index,
    );

    if (duplicates.length > 0) {
      errors.push(`Duplicate session state IDs: ${duplicates.join(", ")}`);
    }

    // Validate session requirements
    for (const state of sessionStateMapping.states) {
      if (state.requirements.persistent && !state.requirements.ttl) {
        warnings.push(
          `Persistent state ${state.stateId} should have TTL configured`,
        );
      }

      if (
        state.requirements.encrypted &&
        !state.context.variables?.some((v) => v.type === "sensitive")
      ) {
        warnings.push(
          `Encrypted state ${state.stateId} has no sensitive variables`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate execution context mappings
   */
  private async validateExecutionContextMappings(
    executionContextMapping: ExecutionContextMapping,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate state IDs
    const stateIds = executionContextMapping.contexts.map((c) => c.stateId);
    const duplicates = stateIds.filter(
      (id, index) => stateIds.indexOf(id) !== index,
    );

    if (duplicates.length > 0) {
      errors.push(
        `Duplicate execution context state IDs: ${duplicates.join(", ")}`,
      );
    }

    // Validate execution dependencies
    for (const context of executionContextMapping.contexts) {
      if (context.context.dependencies) {
        for (const dependency of context.context.dependencies) {
          const dependencyExists = executionContextMapping.contexts.some(
            (c) => c.stateId === dependency,
          );
          if (!dependencyExists) {
            errors.push(
              `Missing dependency ${dependency} for state ${context.stateId}`,
            );
          }
        }
      }

      // Validate timeout values
      if (context.context.timeout && context.context.timeout < 1000) {
        warnings.push(
          `Very short timeout (${context.context.timeout}ms) for state ${context.stateId}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate dynamic variable resolutions
   */
  private async validateDynamicVariableResolutions(
    dynamicResolution: DynamicVariableResolution,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    for (const resolution of dynamicResolution.resolutions) {
      if (resolution.rules.dependencies?.circular) {
        errors.push(
          `Circular dependency detected in state ${resolution.stateId}`,
        );
      }
    }

    // Validate resolution strategies
    for (const resolution of dynamicResolution.resolutions) {
      for (const variable of resolution.resolution.variables) {
        if (!variable.resolutionStrategy) {
          warnings.push(
            `No resolution strategy for variable ${variable.name} in state ${resolution.stateId}`,
          );
        }

        if (variable.dependencies?.length > 5) {
          warnings.push(
            `Variable ${variable.name} has many dependencies (${variable.dependencies.length})`,
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate context inheritance
   */
  private async validateContextInheritance(
    contextInheritance: ContextInheritance,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for inheritance cycles
    const hierarchyMap = new Map<string, string[]>();
    for (const hierarchy of contextInheritance.hierarchy) {
      hierarchyMap.set(hierarchy.stateId, hierarchy.childContexts || []);
    }

    // Simple cycle detection
    for (const [stateId, children] of hierarchyMap) {
      if (
        this.hasInheritanceCycle(stateId, children, hierarchyMap, new Set())
      ) {
        errors.push(`Inheritance cycle detected involving state ${stateId}`);
      }
    }

    // Validate inheritance rules
    for (const hierarchy of contextInheritance.hierarchy) {
      if (hierarchy.rules && !this.validateInheritanceRules(hierarchy.rules)) {
        warnings.push(
          `Invalid inheritance rules for state ${hierarchy.stateId}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for inheritance cycles
   */
  private hasInheritanceCycle(
    stateId: string,
    children: string[],
    hierarchyMap: Map<string, string[]>,
    visited: Set<string>,
  ): boolean {
    if (visited.has(stateId)) {
      return true;
    }

    visited.add(stateId);

    for (const child of children) {
      const childChildren = hierarchyMap.get(child) || [];
      if (
        this.hasInheritanceCycle(
          child,
          childChildren,
          hierarchyMap,
          new Set(visited),
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate inheritance rules
   */
  private validateInheritanceRules(rules: any): boolean {
    // Add inheritance rule validation logic
    return true; // Placeholder
  }

  /**
   * Validate cross-mapping consistency
   */
  private async validateCrossMappingConsistency(
    contextMapping: Omit<ContextMapping, "validation">,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check consistency between variable mapping and session state mapping
    const variableNames = new Set(
      contextMapping.variableMapping.journeyVariables.map((v) => v.name),
    );

    for (const sessionState of contextMapping.sessionStateMapping.states) {
      if (sessionState.context.variables) {
        for (const variable of sessionState.context.variables) {
          if (!variableNames.has(variable.name)) {
            warnings.push(
              `Session state ${sessionState.stateId} references unmapped variable ${variable.name}`,
            );
          }
        }
      }
    }

    // Check consistency between execution context and dynamic resolution
    const executionStateIds = new Set(
      contextMapping.executionContextMapping.contexts.map((c) => c.stateId),
    );

    for (const resolution of contextMapping.dynamicResolution.resolutions) {
      if (!executionStateIds.has(resolution.stateId)) {
        warnings.push(
          `Dynamic resolution for unmapped state ${resolution.stateId}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Context Inheritance Manager for handling context hierarchies
 */
export class ContextInheritanceManager {
  private readonly logger: ContextLogger;

  constructor() {
    this.logger = new ContextLogger("ContextInheritanceManager");
  }

  /**
   * Establish context inheritance hierarchy for journey states
   */
  async establishInheritance(
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    variableMapping: VariableMapping,
  ): Promise<ContextInheritance> {
    this.logger.info("Establishing context inheritance", {
      workflowId: workflow.id,
      nodeCount: workflow.nodes.length,
    });

    const hierarchy: ContextInheritance["hierarchy"] = [];
    const configuration: ContextInheritance["configuration"] = {
      enableInheritance: true,
      inheritanceDepth: 5,
      overrideAllowed: true,
      cascadeUpdates: true,
    };

    // Build inheritance hierarchy based on workflow structure
    for (const node of workflow.nodes) {
      const inheritanceNode = await this.createInheritanceNode(
        node,
        workflow,
        analysis,
        variableMapping,
      );

      if (inheritanceNode) {
        hierarchy.push(inheritanceNode);
      }
    }

    const contextInheritance: ContextInheritance = {
      hierarchy,
      configuration,
      statistics: {
        totalNodes: hierarchy.length,
        inheritanceDepth: this.calculateMaxInheritanceDepth(hierarchy),
        isolatedNodes: hierarchy.filter(
          (h) =>
            !h.parentContext &&
            (!h.childContexts || h.childContexts.length === 0),
        ).length,
      },
    };

    this.logger.info("Context inheritance established", {
      totalNodes: contextInheritance.statistics.totalNodes,
      maxDepth: contextInheritance.statistics.inheritanceDepth,
      isolatedNodes: contextInheritance.statistics.isolatedNodes,
    });

    return contextInheritance;
  }

  /**
   * Create inheritance node for a workflow node
   */
  private async createInheritanceNode(
    node: any,
    workflow: SimWorkflowDefinition,
    analysis: WorkflowAnalysisResult,
    variableMapping: VariableMapping,
  ): Promise<ContextInheritance["hierarchy"][0] | null> {
    const parentContext = this.findParentContext(node, workflow);
    const childContexts = this.findChildContexts(node, workflow);
    const rules = this.generateInheritanceRules(
      node,
      parentContext,
      childContexts,
    );

    return {
      stateId: node.id,
      parentContext,
      childContexts,
      rules,
    };
  }

  /**
   * Find parent context for a node
   */
  private findParentContext(
    node: any,
    workflow: SimWorkflowDefinition,
  ): string | undefined {
    const edges = workflow.edges || [];
    const incomingEdges = edges.filter((edge) => edge.target === node.id);

    if (incomingEdges.length === 0) {
      return undefined; // Root node
    }

    // For simplicity, use the first parent. In complex scenarios,
    // might need more sophisticated logic
    return incomingEdges[0].source;
  }

  /**
   * Find child contexts for a node
   */
  private findChildContexts(
    node: any,
    workflow: SimWorkflowDefinition,
  ): string[] {
    const edges = workflow.edges || [];
    return edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => edge.target);
  }

  /**
   * Generate inheritance rules for a node
   */
  private generateInheritanceRules(
    node: any,
    parentContext: string | undefined,
    childContexts: string[],
  ): any {
    return {
      inheritFromParent: !!parentContext,
      propagateToChildren: childContexts.length > 0,
      overridePolicy: node.data?.contextOverride || "merge",
      scopeRules: {
        variables: node.data?.inheritVariables !== false,
        sessionState: node.data?.inheritSession !== false,
        executionContext: node.data?.inheritExecution !== false,
      },
      isolationRules: {
        isolateErrors: node.data?.isolateErrors === true,
        isolateState: node.data?.isolateState === true,
        isolateVariables: node.data?.isolateVariables === true,
      },
    };
  }

  /**
   * Calculate maximum inheritance depth
   */
  private calculateMaxInheritanceDepth(
    hierarchy: ContextInheritance["hierarchy"],
  ): number {
    const visited = new Set<string>();
    let maxDepth = 0;

    const calculateDepth = (stateId: string, currentDepth: number): number => {
      if (visited.has(stateId)) {
        return currentDepth;
      }

      visited.add(stateId);

      const node = hierarchy.find((h) => h.stateId === stateId);
      if (!node || !node.childContexts) {
        return currentDepth;
      }

      let deepest = currentDepth;
      for (const childId of node.childContexts) {
        deepest = Math.max(deepest, calculateDepth(childId, currentDepth + 1));
      }

      return deepest;
    };

    // Find root nodes and calculate depth from each
    for (const node of hierarchy) {
      if (!node.parentContext) {
        maxDepth = Math.max(maxDepth, calculateDepth(node.stateId, 1));
      }
    }

    return maxDepth;
  }
}

/**
 * Context Logger utility for context management operations
 */
class ContextLogger {
  constructor(private context: string) {}

  info(message: string, data?: any): void {
    console.log(`[${this.context}] ${message}`, data || "");
  }

  debug(message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.debug(`[${this.context}] ${message}`, data || "");
    }
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.context}] ${message}`, data || "");
  }

  error(message: string, data?: any): void {
    console.error(`[${this.context}] ${message}`, data || "");
  }
}
