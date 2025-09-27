/**
 * Mode Switching System Types
 *
 * Defines the type system for seamless switching between visual and chat modes
 * in the workflow builder application.
 */

// Core mode types
export type ViewMode = "visual" | "chat" | "hybrid";

// Mode configuration and settings
export interface ModeConfig {
  mode: ViewMode;
  hybridLayout?: HybridLayout;
  transitionDuration?: number;
  preserveState?: boolean;
}

// Hybrid mode layout configurations
export interface HybridLayout {
  type:
    | "split-horizontal"
    | "split-vertical"
    | "sidebar-left"
    | "sidebar-right";
  ratio: number; // Split ratio (0.1 to 0.9)
  collapsible: boolean;
  minSize: number; // Minimum size in pixels
}

// Context preservation data structure
export interface ModeContext {
  // Visual editor context
  visualContext?: {
    viewport: { x: number; y: number; zoom: number };
    selectedNodes: string[];
    selectedEdges: string[];
    cameraPosition: { x: number; y: number };
    sidebarState: "open" | "closed";
    activePanel?: string;
  };

  // Chat interface context
  chatContext?: {
    activeConversation?: string;
    agentId?: string;
    scrollPosition: number;
    messageHistory: any[];
    inputValue: string;
    isTyping: boolean;
  };

  // Workflow execution state
  executionContext?: {
    isRunning: boolean;
    activeBlocks: string[];
    pendingBlocks: string[];
    debugMode: boolean;
    breakpoints: string[];
  };

  // General UI state
  uiContext?: {
    theme: "light" | "dark";
    sidebarExpanded: boolean;
    notifications: any[];
    modalsOpen: string[];
  };
}

// Mode transition event types
export interface ModeTransitionEvent {
  fromMode: ViewMode;
  toMode: ViewMode;
  timestamp: number;
  preserveContext: boolean;
  trigger: "user" | "system" | "keyboard";
}

// Mode switching preferences and settings
export interface ModePreferences {
  defaultMode: ViewMode;
  enableAnimations: boolean;
  transitionSpeed: "slow" | "normal" | "fast";
  keyboardShortcuts: {
    toggleVisual: string;
    toggleChat: string;
    toggleHybrid: string;
  };
  hybridDefaults: HybridLayout;
  autoSave: boolean;
  contextPreservation: {
    visual: boolean;
    chat: boolean;
    execution: boolean;
  };
}

// Mode switching API interface
export interface ModeManager {
  // Core mode operations
  switchMode: (mode: ViewMode, config?: Partial<ModeConfig>) => Promise<void>;
  getCurrentMode: () => ViewMode;
  getContext: () => ModeContext;

  // Context management
  preserveContext: (context: Partial<ModeContext>) => void;
  restoreContext: (mode: ViewMode) => ModeContext | null;
  clearContext: (mode?: ViewMode) => void;

  // Event handling
  onModeChange: (callback: (event: ModeTransitionEvent) => void) => () => void;

  // Preferences
  updatePreferences: (prefs: Partial<ModePreferences>) => void;
  getPreferences: () => ModePreferences;
}

// Hook return type for React integration
export interface UseModeSwitch {
  // Current state
  mode: ViewMode;
  isTransitioning: boolean;
  context: ModeContext;

  // Actions
  switchToVisual: () => void;
  switchToChat: () => void;
  switchToHybrid: (layout?: HybridLayout) => void;

  // Utilities
  canSwitchMode: (targetMode: ViewMode) => boolean;
  getTransitionDuration: () => number;
}

// Validation and constraints
export interface ModeConstraints {
  requiresAgent: ViewMode[]; // Modes that require an active agent
  requiresWorkflow: ViewMode[]; // Modes that require an active workflow
  mutuallyExclusive: [ViewMode, ViewMode][]; // Mode combinations not allowed
}

// Default configurations
export const DEFAULT_MODE_PREFERENCES: ModePreferences = {
  defaultMode: "visual",
  enableAnimations: true,
  transitionSpeed: "normal",
  keyboardShortcuts: {
    toggleVisual: "v",
    toggleChat: "c",
    toggleHybrid: "h",
  },
  hybridDefaults: {
    type: "split-horizontal",
    ratio: 0.5,
    collapsible: true,
    minSize: 300,
  },
  autoSave: true,
  contextPreservation: {
    visual: true,
    chat: true,
    execution: true,
  },
};

export const DEFAULT_HYBRID_LAYOUTS: Record<string, HybridLayout> = {
  "split-horizontal": {
    type: "split-horizontal",
    ratio: 0.5,
    collapsible: true,
    minSize: 300,
  },
  "split-vertical": {
    type: "split-vertical",
    ratio: 0.6,
    collapsible: true,
    minSize: 400,
  },
  "sidebar-left": {
    type: "sidebar-left",
    ratio: 0.3,
    collapsible: true,
    minSize: 250,
  },
  "sidebar-right": {
    type: "sidebar-right",
    ratio: 0.3,
    collapsible: true,
    minSize: 250,
  },
};

// Animation configurations
export const TRANSITION_DURATIONS = {
  slow: 800,
  normal: 400,
  fast: 200,
} as const;

export const ANIMATION_EASING = {
  ease: "ease-in-out",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
} as const;
