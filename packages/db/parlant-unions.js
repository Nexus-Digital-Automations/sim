// =============================================================================
// Type Guard Functions
// =============================================================================
/**
 * Event content type guards
 */
export function isCustomerMessageContent(content) {
    return content.type === 'customer_message';
}
export function isAgentMessageContent(content) {
    return content.type === 'agent_message';
}
export function isToolCallContent(content) {
    return content.type === 'tool_call';
}
export function isToolResultContent(content) {
    return content.type === 'tool_result';
}
export function isJourneyTransitionContent(content) {
    return content.type === 'journey_transition';
}
/**
 * Journey state configuration type guards
 */
export function isChatStateConfig(config) {
    return config.stateType === 'chat';
}
export function isToolStateConfig(config) {
    return config.stateType === 'tool';
}
export function isDecisionStateConfig(config) {
    return config.stateType === 'decision';
}
export function isFinalStateConfig(config) {
    return config.stateType === 'final';
}
/**
 * Tool integration type guards
 */
export function isCustomToolIntegration(config) {
    return config.integrationType === 'custom_tool';
}
export function isWorkflowBlockIntegration(config) {
    return config.integrationType === 'workflow_block';
}
export function isMcpServerIntegration(config) {
    return config.integrationType === 'mcp_server';
}
/**
 * Session context type guards
 */
export function isAnonymousSession(context) {
    return context.userType === 'anonymous';
}
export function isAuthenticatedSession(context) {
    return context.userType === 'authenticated';
}
export function isCustomerSession(context) {
    return context.userType === 'customer';
}
