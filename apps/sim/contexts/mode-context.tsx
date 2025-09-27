"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { createLogger } from "@/lib/logs/console/logger";
import type {
  HybridLayout,
  ModeConfig,
  ModeContext as ModeContextType,
  ModePreferences,
  ModeTransitionEvent,
  UseModeSwitch,
  ViewMode,
} from "@/types/mode-switching";
import {
  DEFAULT_MODE_PREFERENCES,
  TRANSITION_DURATIONS,
} from "@/types/mode-switching";

const logger = createLogger("ModeContext");

// Context state interface
interface ModeState {
  currentMode: ViewMode;
  isTransitioning: boolean;
  transitionProgress: number;
  context: ModeContext;
  preferences: ModePreferences;
  history: ModeTransitionEvent[];
}

// Action types for reducer
type ModeAction =
  | {
      type: "START_TRANSITION";
      payload: { fromMode: ViewMode; toMode: ViewMode };
    }
  | { type: "COMPLETE_TRANSITION"; payload: { mode: ViewMode } }
  | { type: "UPDATE_PROGRESS"; payload: { progress: number } }
  | { type: "PRESERVE_CONTEXT"; payload: { context: Partial<ModeContext> } }
  | {
      type: "RESTORE_CONTEXT";
      payload: { mode: ViewMode; context: ModeContext };
    }
  | {
      type: "UPDATE_PREFERENCES";
      payload: { preferences: Partial<ModePreferences> };
    }
  | { type: "ADD_HISTORY"; payload: { event: ModeTransitionEvent } };

// Initial state
const initialState: ModeState = {
  currentMode: "visual",
  isTransitioning: false,
  transitionProgress: 0,
  context: {
    visualContext: {
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodes: [],
      selectedEdges: [],
      cameraPosition: { x: 0, y: 0 },
      sidebarState: "open",
    },
    chatContext: {
      scrollPosition: 0,
      messageHistory: [],
      inputValue: "",
      isTyping: false,
    },
    executionContext: {
      isRunning: false,
      activeBlocks: [],
      pendingBlocks: [],
      debugMode: false,
      breakpoints: [],
    },
    uiContext: {
      theme: "light",
      sidebarExpanded: true,
      notifications: [],
      modalsOpen: [],
    },
  },
  preferences: DEFAULT_MODE_PREFERENCES,
  history: [],
};

// Reducer function
function modeReducer(state: ModeState, action: ModeAction): ModeState {
  switch (action.type) {
    case "START_TRANSITION":
      return {
        ...state,
        isTransitioning: true,
        transitionProgress: 0,
      };

    case "COMPLETE_TRANSITION":
      return {
        ...state,
        currentMode: action.payload.mode,
        isTransitioning: false,
        transitionProgress: 100,
      };

    case "UPDATE_PROGRESS":
      return {
        ...state,
        transitionProgress: Math.min(100, Math.max(0, action.payload.progress)),
      };

    case "PRESERVE_CONTEXT":
      return {
        ...state,
        context: {
          ...state.context,
          ...action.payload.context,
        },
      };

    case "RESTORE_CONTEXT":
      return {
        ...state,
        context: action.payload.context,
      };

    case "UPDATE_PREFERENCES": {
      const updatedPreferences = {
        ...state.preferences,
        ...action.payload.preferences,
      };
      // Persist to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "mode-preferences",
            JSON.stringify(updatedPreferences),
          );
        } catch (error) {
          logger.error("Failed to save preferences to localStorage", { error });
        }
      }
      return {
        ...state,
        preferences: updatedPreferences,
      };
    }

    case "ADD_HISTORY":
      return {
        ...state,
        history: [...state.history.slice(-99), action.payload.event], // Keep last 100 events
      };

    default:
      return state;
  }
}

// Context interfaces
interface ModeContextValue {
  state: ModeState;
  dispatch: React.Dispatch<ModeAction>;

  // Core mode operations
  switchMode: (mode: ViewMode, config?: Partial<ModeConfig>) => Promise<void>;
  getCurrentMode: () => ViewMode;
  getContext: () => ModeContext;

  // Context management
  preserveContext: (context: Partial<ModeContext>) => void;
  restoreContext: (mode: ViewMode) => ModeContext | null;

  // Event handling
  onModeChange: (callback: (event: ModeTransitionEvent) => void) => () => void;

  // Utilities
  canSwitchMode: (targetMode: ViewMode) => boolean;
  getTransitionDuration: () => number;
}

const ModeContext = createContext<ModeContextValue | null>(null);

// Context storage for different modes
const modeContextStorage = new Map<ViewMode, ModeContextType>();

// Mode switching provider
export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(modeReducer, initialState);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef<((event: ModeTransitionEvent) => void)[]>([]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedPreferences = localStorage.getItem("mode-preferences");
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        dispatch({
          type: "UPDATE_PREFERENCES",
          payload: { preferences },
        });
      }

      // Load saved mode context
      const savedContext = localStorage.getItem("mode-context");
      if (savedContext) {
        const context = JSON.parse(savedContext);
        dispatch({
          type: "PRESERVE_CONTEXT",
          payload: { context },
        });
      }

      // Set initial mode from preferences or URL params
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get("mode") as ViewMode;
      if (urlMode && ["visual", "chat", "hybrid"].includes(urlMode)) {
        dispatch({
          type: "COMPLETE_TRANSITION",
          payload: { mode: urlMode },
        });
      } else if (preferences.defaultMode !== state.currentMode) {
        dispatch({
          type: "COMPLETE_TRANSITION",
          payload: { mode: preferences.defaultMode },
        });
      }
    } catch (error) {
      logger.error("Failed to load saved preferences or context", { error });
    }
  }, []);

  // Persist context changes to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const debounceTimer = setTimeout(() => {
      try {
        localStorage.setItem("mode-context", JSON.stringify(state.context));
      } catch (error) {
        logger.error("Failed to save context to localStorage", { error });
      }
    }, 1000); // Debounce saves

    return () => clearTimeout(debounceTimer);
  }, [state.context]);

  // Core mode switching function
  const switchMode = useCallback(
    async (mode: ViewMode, config: Partial<ModeConfig> = {}) => {
      if (state.isTransitioning) {
        logger.warn("Mode switch already in progress, ignoring request", {
          mode,
        });
        return;
      }

      const fromMode = state.currentMode;
      if (fromMode === mode) {
        logger.debug("Already in target mode, ignoring switch", { mode });
        return;
      }

      logger.info("Starting mode transition", {
        fromMode,
        toMode: mode,
        config,
      });

      // Create transition event
      const transitionEvent: ModeTransitionEvent = {
        fromMode,
        toMode: mode,
        timestamp: Date.now(),
        preserveContext:
          config.preserveState ?? state.preferences.contextPreservation.visual,
        trigger: "user",
      };

      // Start transition
      dispatch({
        type: "START_TRANSITION",
        payload: { fromMode, toMode: mode },
      });
      dispatch({ type: "ADD_HISTORY", payload: { event: transitionEvent } });

      // Preserve current mode context if enabled
      if (transitionEvent.preserveContext) {
        modeContextStorage.set(fromMode, state.context);
      }

      // Notify callbacks
      callbacksRef.current.forEach((callback) => {
        try {
          callback(transitionEvent);
        } catch (error) {
          logger.error("Error in mode change callback", { error });
        }
      });

      // Simulate transition duration
      const duration =
        config.transitionDuration ??
        TRANSITION_DURATIONS[state.preferences.transitionSpeed];

      if (state.preferences.enableAnimations && duration > 0) {
        // Animate progress
        const startTime = Date.now();
        const animateProgress = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / duration) * 100);

          dispatch({ type: "UPDATE_PROGRESS", payload: { progress } });

          if (progress < 100) {
            requestAnimationFrame(animateProgress);
          } else {
            // Complete transition
            completeTransition(mode);
          }
        };
        requestAnimationFrame(animateProgress);
      } else {
        // Immediate transition
        completeTransition(mode);
      }

      function completeTransition(targetMode: ViewMode) {
        // Restore context for target mode if available
        const savedContext = modeContextStorage.get(targetMode);
        if (savedContext) {
          dispatch({
            type: "RESTORE_CONTEXT",
            payload: { mode: targetMode, context: savedContext },
          });
        }

        dispatch({
          type: "COMPLETE_TRANSITION",
          payload: { mode: targetMode },
        });
        logger.info("Mode transition completed", { mode: targetMode });
      }
    },
    [
      state.currentMode,
      state.isTransitioning,
      state.preferences,
      state.context,
    ],
  );

  // Get current mode
  const getCurrentMode = useCallback(
    () => state.currentMode,
    [state.currentMode],
  );

  // Get current context
  const getContext = useCallback(() => state.context, [state.context]);

  // Preserve context
  const preserveContext = useCallback((context: Partial<ModeContext>) => {
    dispatch({ type: "PRESERVE_CONTEXT", payload: { context } });
  }, []);

  // Restore context for a specific mode
  const restoreContext = useCallback((mode: ViewMode) => {
    return modeContextStorage.get(mode) ?? null;
  }, []);

  // Event handling
  const onModeChange = useCallback(
    (callback: (event: ModeTransitionEvent) => void) => {
      callbacksRef.current.push(callback);

      // Return unsubscribe function
      return () => {
        const index = callbacksRef.current.indexOf(callback);
        if (index > -1) {
          callbacksRef.current.splice(index, 1);
        }
      };
    },
    [],
  );

  // Check if mode switch is allowed
  const canSwitchMode = useCallback(
    (targetMode: ViewMode) => {
      if (state.isTransitioning) return false;
      if (state.currentMode === targetMode) return false;

      // Add any business logic constraints here
      // For example, require agent for chat mode
      if (targetMode === "chat" && !state.context.chatContext?.agentId) {
        return false;
      }

      return true;
    },
    [state.isTransitioning, state.currentMode, state.context],
  );

  // Get transition duration
  const getTransitionDuration = useCallback(() => {
    return TRANSITION_DURATIONS[state.preferences.transitionSpeed];
  }, [state.preferences.transitionSpeed]);

  // Context value
  const contextValue = useMemo<ModeContextValue>(
    () => ({
      state,
      dispatch,
      switchMode,
      getCurrentMode,
      getContext,
      preserveContext,
      restoreContext,
      onModeChange,
      canSwitchMode,
      getTransitionDuration,
    }),
    [
      state,
      switchMode,
      getCurrentMode,
      getContext,
      preserveContext,
      restoreContext,
      onModeChange,
      canSwitchMode,
      getTransitionDuration,
    ],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ModeContext.Provider value={contextValue}>{children}</ModeContext.Provider>
  );
}

// Hook for using mode context
export function useModeContext(): ModeContextValue {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useModeContext must be used within a ModeProvider");
  }
  return context;
}

// Convenient hook for mode switching
export function useModeSwitch(): UseModeSwitch {
  const {
    state,
    switchMode,
    getCurrentMode,
    getContext,
    canSwitchMode,
    getTransitionDuration,
  } = useModeContext();

  const switchToVisual = useCallback(() => {
    switchMode("visual");
  }, [switchMode]);

  const switchToChat = useCallback(() => {
    switchMode("chat");
  }, [switchMode]);

  const switchToHybrid = useCallback(
    (layout?: HybridLayout) => {
      switchMode("hybrid", {
        hybridLayout: layout ?? state.preferences.hybridDefaults,
      });
    },
    [switchMode, state.preferences.hybridDefaults],
  );

  return {
    mode: state.currentMode,
    isTransitioning: state.isTransitioning,
    context: state.context,
    switchToVisual,
    switchToChat,
    switchToHybrid,
    canSwitchMode,
    getTransitionDuration,
  };
}
