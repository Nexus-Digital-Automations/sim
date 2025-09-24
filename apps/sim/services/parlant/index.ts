/**
 * Sim-Parlant Integration Bridge
 * ============================
 *
 * Main exports for the Sim-Parlant integration layer providing:
 * - Agent lifecycle management APIs
 * - HTTP client for Parlant server communication
 * - Error handling and validation middleware
 * - Authentication and authorization integration
 *
 * This service layer bridges Sim's existing patterns with Parlant's
 * AI agent functionality while maintaining workspace isolation and
 * proper access controls.
 */

export { ParlantClient } from './client'
export { ParlantService } from './service'
export {
  createAgent,
  getAgent,
  updateAgent,
  deleteAgent,
  listAgents
} from './agents'
export {
  createSession,
  getSession,
  listSessions,
  sendMessage,
  getEvents
} from './sessions'
export { ParlantApiError, ParlantConnectionError } from './errors'
export type {
  Agent,
  AgentCreateRequest,
  AgentUpdateRequest,
  Session,
  SessionCreateRequest,
  Event,
  EventCreateRequest,
  ParlantClientConfig,
  ParlantHealthStatus
} from './types'