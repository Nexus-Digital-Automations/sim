/**
 * Shared types and constants for landing canvas components
 *
 * This file contains shared interfaces and constants to avoid circular dependencies
 * between landing-canvas.tsx and landing-flow.tsx
 */

import type { Edge, Node } from 'reactflow'

/**
 * Visual constants for landing node dimensions
 */
export const CARD_WIDTH = 256
export const CARD_HEIGHT = 92

/**
 * Data structure for landing block data
 */
export interface LandingCardData {
  /** Display title */
  title: string
  /** Description text */
  description: string
  /** Icon name or component */
  icon: string
  /** Theme color */
  color: string
  /** Whether this is a loop node */
  isLoop?: boolean
}

/**
 * Landing block node with positioning information
 */
export interface LandingBlockNode extends LandingCardData {
  /** Unique identifier for the node */
  id: string
  /** X coordinate position */
  x: number
  /** Y coordinate position */
  y: number
}

/**
 * Data structure for edges connecting nodes
 */
export interface LandingEdgeData {
  /** Unique identifier for the edge */
  id: string
  /** Source node ID */
  from: string
  /** Target node ID */
  to: string
}

/**
 * Data structure for grouping visual elements
 */
export interface LandingGroupData {
  /** X coordinate of the group */
  x: number
  /** Y coordinate of the group */
  y: number
  /** Width of the group */
  w: number
  /** Height of the group */
  h: number
  /** Optional label for the group */
  label?: string
}

/**
 * Viewport API for controlling canvas view
 */
export interface LandingViewportApi {
  /** Reset viewport to default position */
  resetViewport: () => void
  /** Center viewport on specific coordinates */
  centerOn: (x: number, y: number) => void
  /** Fit viewport to show all content */
  fitView: () => void
}

/**
 * Props for landing canvas components
 */
export interface LandingCanvasProps {
  /** Array of nodes to display */
  nodes: Node[]
  /** Array of edges connecting nodes */
  edges: Edge[]
  /** Optional grouping box */
  groupBox?: LandingGroupData
  /** Total width of the world/canvas */
  worldWidth: number
  /** Reference to viewport API */
  viewportApiRef?: React.MutableRefObject<LandingViewportApi | null>
}
