"use client";

import React from "react";
import { ReactFlowProvider } from "reactflow";
import { DotPattern } from "./dot-pattern";
import { LandingFlow } from "./landing-flow";
import type {
  LandingBlockNode,
  LandingCanvasProps,
  LandingEdgeData,
  LandingGroupData,
  LandingViewportApi,
} from "./types";
import { CARD_HEIGHT, CARD_WIDTH } from "./types";

// Re-export types and constants for backward compatibility
export type {
  LandingBlockNode,
  LandingEdgeData,
  LandingGroupData,
  LandingViewportApi,
  LandingCanvasProps,
};
export { CARD_WIDTH, CARD_HEIGHT };

/**
 * Main landing canvas component that provides the container and background
 * for the React Flow visualization
 * @param props - Component properties including nodes, edges, and viewport control
 * @returns A canvas component with dot pattern background and React Flow content
 */
export function LandingCanvas({
  nodes,
  edges,
  groupBox,
  worldWidth,
  viewportApiRef,
}: LandingCanvasProps) {
  const flowWrapRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <div className="relative mx-auto flex h-[612px] w-full max-w-[1285px] border-none bg-background/80">
      <DotPattern className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-20" />

      {/* Use template button overlay */}
      {/* <button
        type='button'
        aria-label='Use template'
        className='absolute top-[24px] left-[50px] z-20 inline-flex items-center justify-center rounded-[10px] border border-[#343434] bg-gradient-to-b from-[#060606] to-[#323232] px-3 py-1.5 text-sm text-white shadow-[inset_0_1.25px_2.5px_0_#9B77FF] transition-all duration-200'
        onClick={() => {
          // Template usage logic will be implemented here
        }}
      >
        Use template
      </button> */}

      <div ref={flowWrapRef} className="relative z-10 h-full w-full">
        <ReactFlowProvider>
          <LandingFlow
            nodes={nodes}
            edges={edges}
            groupBox={groupBox}
            worldWidth={worldWidth}
            wrapperRef={flowWrapRef}
            viewportApiRef={viewportApiRef}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
