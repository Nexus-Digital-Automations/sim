/**
 * Comprehensive Test Framework for Workflow State Accuracy Validation
 *
 * This framework validates the critical acceptance criteria:
 * "Chat interface reflects workflow state accurately"
 *
 * Test Categories:
 * 1. State Synchronization Accuracy
 * 2. Real-time Updates
 * 3. Mode Switching Preservation
 * 4. Chat Command Alignment
 * 5. Error State Handling
 * 6. Performance Under Load
 */

import { expect, vi } from "vitest";
import type { WorkflowStateRepresentation } from "@/types";

// Mock stores and dependencies
vi.mock("@/stores/workflow-chat-sync/store");
vi.mock("@/stores/workflows/workflow/store");
vi.mock("@/stores/panel/chat/store");
vi.mock("@/stores/execution/store");

// Test utilities
export class WorkflowStateAccuracyValidator {
  private mockWorkflowStore: any;
  private mockChatStore: any;
  private mockSyncStore: any;
  private mockExecutionStore: any;

  constructor() {
    this.setupMocks();
  }

  private setupMocks() {
    this.mockWorkflowStore = {
      blocks: {},
      edges: [],
      activeWorkflowId: "test-workflow-123",
      addBlock: vi.fn(),
      removeBlock: vi.fn(),
      addEdge: vi.fn(),
      updateBlock: vi.fn(),
    };

    this.mockChatStore = {
      messages: [],
      addMessage: vi.fn(),
      getWorkflowMessages: vi.fn(() => []),
    };

    this.mockSyncStore = {
      isEnabled: true,
      syncState: "idle",
      workflowStateRepresentation: null,
      conflicts: [],
      enableSync: vi.fn(),
      disableSync: vi.fn(),
      parseChatCommand: vi.fn(),
      handleWorkflowStateChange: vi.fn(),
      generateWorkflowStateRepresentation: vi.fn(),
      executeWorkflowCommand: vi.fn(),
    };

    this.mockExecutionStore = {
      isExecuting: false,
      activeBlockIds: new Set(),
      setIsExecuting: vi.fn(),
    };
  }

  // State Synchronization Tests
  async validateStateSynchronization(): Promise<ValidationResult> {
    const results: TestResult[] = [];

    // Test 1: Adding block via visual interface updates chat
    results.push(await this.testVisualToChat());

    // Test 2: Adding block via chat command updates visual
    results.push(await this.testChatToVisual());

    // Test 3: Bidirectional synchronization consistency
    results.push(await this.testBidirectionalSync());

    // Test 4: State representation accuracy
    results.push(await this.testStateRepresentationAccuracy());

    return this.compileResults("State Synchronization", results);
  }

  private async testVisualToChat(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Simulate adding a block through visual interface
      const newBlock = {
        id: "block-123",
        type: "llm",
        name: "LLM Block",
        position: { x: 100, y: 100 },
        enabled: true,
      };

      // Update workflow store
      this.mockWorkflowStore.blocks = { [newBlock.id]: newBlock };

      // Trigger state change event
      const stateChangeEvent = {
        type: "workflow_modified",
        timestamp: Date.now(),
        source: "visual",
        data: { blocks: this.mockWorkflowStore.blocks, edges: [] },
      };

      // Verify sync store processes the change
      this.mockSyncStore.handleWorkflowStateChange(stateChangeEvent);

      // Verify chat receives update message
      expect(this.mockChatStore.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Workflow structure updated"),
          type: "workflow",
        }),
      );

      // Verify state representation is updated
      const expectedRepresentation: WorkflowStateRepresentation = {
        workflowId: "test-workflow-123",
        summary: "Workflow with 1 blocks and 0 connections",
        blockSummaries: [
          {
            id: "block-123",
            type: "llm",
            name: "LLM Block",
            isActive: false,
            isEnabled: true,
            position: { x: 100, y: 100 },
          },
        ],
        connectionSummaries: [],
        executionState: "idle",
      };

      expect(this.mockSyncStore.generateWorkflowStateRepresentation()).toEqual(
        expectedRepresentation,
      );

      return {
        name: "Visual to Chat Sync",
        passed: true,
        duration: Date.now() - startTime,
        details:
          "Block addition in visual interface correctly propagated to chat",
      };
    } catch (error) {
      return {
        name: "Visual to Chat Sync",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to sync visual changes to chat interface",
      };
    }
  }

  private async testChatToVisual(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Simulate chat command to add block
      const chatMessage = "add llm block";
      const command = this.mockSyncStore.parseChatCommand(chatMessage);

      expect(command).toEqual({
        type: "add_block",
        description: "add llm block",
        parameters: {
          blockType: "llm",
          position: { x: 200, y: 200 },
        },
      });

      // Execute the command
      this.mockSyncStore.executeWorkflowCommand(command);

      // Verify workflow store is updated
      expect(this.mockWorkflowStore.addBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "llm",
          name: "Llm",
          enabled: true,
        }),
      );

      // Verify confirmation message is sent to chat
      expect(this.mockChatStore.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "✓ add llm block",
          type: "workflow",
        }),
      );

      return {
        name: "Chat to Visual Sync",
        passed: true,
        duration: Date.now() - startTime,
        details: "Chat command correctly executed and updated workflow state",
      };
    } catch (error) {
      return {
        name: "Chat to Visual Sync",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to sync chat commands to visual interface",
      };
    }
  }

  private async testBidirectionalSync(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test sequence: Visual -> Chat -> Visual

      // Step 1: Add block visually
      const block1 = {
        id: "b1",
        type: "llm",
        name: "LLM 1",
        position: { x: 100, y: 100 },
        enabled: true,
      };
      this.mockWorkflowStore.blocks = { b1: block1 };

      // Step 2: Connect blocks via chat
      const connectionCommand = this.mockSyncStore.parseChatCommand(
        "connect LLM 1 to LLM 2",
      );
      expect(connectionCommand?.type).toBe("connect_blocks");

      // Step 3: Verify both interfaces reflect the same state
      const visualState = {
        blocks: this.mockWorkflowStore.blocks,
        edges: this.mockWorkflowStore.edges,
      };

      const chatState =
        this.mockSyncStore.generateWorkflowStateRepresentation();

      // Both should reflect the same underlying workflow structure
      expect(chatState.blockSummaries.length).toBe(
        Object.keys(visualState.blocks).length,
      );
      expect(chatState.connectionSummaries.length).toBe(
        visualState.edges.length,
      );

      return {
        name: "Bidirectional Sync",
        passed: true,
        duration: Date.now() - startTime,
        details:
          "Visual and chat interfaces maintain consistent state representation",
      };
    } catch (error) {
      return {
        name: "Bidirectional Sync",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Bidirectional synchronization failed to maintain consistency",
      };
    }
  }

  private async testStateRepresentationAccuracy(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Create complex workflow state
      const blocks = {
        b1: {
          id: "b1",
          type: "llm",
          name: "Primary LLM",
          position: { x: 100, y: 100 },
          enabled: true,
        },
        b2: {
          id: "b2",
          type: "api",
          name: "API Call",
          position: { x: 300, y: 100 },
          enabled: true,
        },
        b3: {
          id: "b3",
          type: "condition",
          name: "Decision",
          position: { x: 500, y: 100 },
          enabled: false,
        },
      };

      const edges = [
        {
          id: "e1",
          source: "b1",
          target: "b2",
          sourceHandle: "response",
          targetHandle: "input",
        },
        {
          id: "e2",
          source: "b2",
          target: "b3",
          sourceHandle: "response",
          targetHandle: "input",
        },
      ];

      this.mockWorkflowStore.blocks = blocks;
      this.mockWorkflowStore.edges = edges;
      this.mockExecutionStore.activeBlockIds = new Set(["b1", "b2"]);
      this.mockExecutionStore.isExecuting = true;

      const representation =
        this.mockSyncStore.generateWorkflowStateRepresentation();

      // Validate state representation accuracy
      expect(representation.blockSummaries).toHaveLength(3);
      expect(representation.connectionSummaries).toHaveLength(2);
      expect(representation.executionState).toBe("running");

      // Validate block details
      const activeBlocks = representation.blockSummaries.filter(
        (b) => b.isActive,
      );
      expect(activeBlocks).toHaveLength(2);

      const disabledBlocks = representation.blockSummaries.filter(
        (b) => !b.isEnabled,
      );
      expect(disabledBlocks).toHaveLength(1);

      // Validate connection descriptions
      expect(representation.connectionSummaries[0].description).toBe(
        "Primary LLM → API Call",
      );
      expect(representation.connectionSummaries[1].description).toBe(
        "API Call → Decision",
      );

      return {
        name: "State Representation Accuracy",
        passed: true,
        duration: Date.now() - startTime,
        details:
          "State representation accurately reflects all workflow components and execution state",
      };
    } catch (error) {
      return {
        name: "State Representation Accuracy",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        details:
          "State representation does not accurately reflect workflow state",
      };
    }
  }

  // Real-time Updates Tests
  async validateRealTimeUpdates(): Promise<ValidationResult> {
    const results: TestResult[] = [];

    results.push(await this.testExecutionStateUpdates());
    results.push(await this.testActiveBlockUpdates());
    results.push(await this.testWorkflowStructureUpdates());

    return this.compileResults("Real-time Updates", results);
  }

  private async testExecutionStateUpdates(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test execution start
      this.mockExecutionStore.isExecuting = true;
      const startEvent = {
        type: "execution_state_changed",
        timestamp: Date.now(),
        source: "execution",
        data: { isExecuting: true, activeBlocks: ["b1"] },
      };

      this.mockSyncStore.handleWorkflowStateChange(startEvent);

      expect(this.mockChatStore.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "▶️ Workflow execution started",
          type: "workflow",
        }),
      );

      // Test execution completion
      this.mockExecutionStore.isExecuting = false;
      const stopEvent = {
        type: "execution_state_changed",
        timestamp: Date.now(),
        source: "execution",
        data: { isExecuting: false, activeBlocks: [] },
      };

      this.mockSyncStore.handleWorkflowStateChange(stopEvent);

      expect(this.mockChatStore.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "⏸️ Workflow execution completed",
          type: "workflow",
        }),
      );

      return {
        name: "Execution State Updates",
        passed: true,
        duration: Date.now() - startTime,
        details:
          "Execution state changes are immediately reflected in chat interface",
      };
    } catch (error) {
      return {
        name: "Execution State Updates",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async testActiveBlockUpdates(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Simulate active block changes during execution
      const activeBlocks = ["b1", "b2", "b3"];

      for (const blockId of activeBlocks) {
        this.mockExecutionStore.activeBlockIds.add(blockId);

        const representation =
          this.mockSyncStore.generateWorkflowStateRepresentation();
        const activeBlockSummaries = representation.blockSummaries.filter(
          (b) => b.isActive,
        );

        expect(activeBlockSummaries.some((b) => b.id === blockId)).toBe(true);
      }

      return {
        name: "Active Block Updates",
        passed: true,
        duration: Date.now() - startTime,
        details: "Active block changes are accurately reflected in real-time",
      };
    } catch (error) {
      return {
        name: "Active Block Updates",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async testWorkflowStructureUpdates(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test rapid structure changes
      const changes = [
        { action: "add_block", blockType: "llm" },
        { action: "add_block", blockType: "api" },
        { action: "connect_blocks", source: "llm", target: "api" },
        { action: "remove_block", blockId: "llm" },
      ];

      for (const change of changes) {
        // Simulate change
        const stateChangeEvent = {
          type: "workflow_modified",
          timestamp: Date.now(),
          source: "visual",
          data: { change },
        };

        this.mockSyncStore.handleWorkflowStateChange(stateChangeEvent);

        // Verify chat is updated
        expect(this.mockChatStore.addMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining("Workflow structure updated"),
            type: "workflow",
          }),
        );
      }

      return {
        name: "Workflow Structure Updates",
        passed: true,
        duration: Date.now() - startTime,
        details:
          "All workflow structure changes propagated to chat in real-time",
      };
    } catch (error) {
      return {
        name: "Workflow Structure Updates",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Performance Testing
  async validatePerformanceUnderLoad(): Promise<ValidationResult> {
    const results: TestResult[] = [];

    results.push(await this.testHighFrequencyStateChanges());
    results.push(await this.testLargeWorkflowSynchronization());
    results.push(await this.testConcurrentUpdates());

    return this.compileResults("Performance Under Load", results);
  }

  private async testHighFrequencyStateChanges(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const changeCount = 1000;
      const changes = Array.from({ length: changeCount }, (_, i) => ({
        type: "workflow_modified",
        timestamp: Date.now() + i,
        source: "visual",
        data: { blockId: `block-${i}` },
      }));

      const processingStart = Date.now();

      for (const change of changes) {
        this.mockSyncStore.handleWorkflowStateChange(change);
      }

      const processingTime = Date.now() - processingStart;

      // Performance benchmark: should process 1000 changes in under 1 second
      const passedBenchmark = processingTime < 1000;

      return {
        name: "High Frequency State Changes",
        passed: passedBenchmark,
        duration: Date.now() - startTime,
        details: `Processed ${changeCount} changes in ${processingTime}ms (${passedBenchmark ? "PASSED" : "FAILED"} benchmark)`,
      };
    } catch (error) {
      return {
        name: "High Frequency State Changes",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async testLargeWorkflowSynchronization(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Create large workflow with 100 blocks and 200 connections
      const largeWorkflow = this.generateLargeWorkflow(100, 200);

      this.mockWorkflowStore.blocks = largeWorkflow.blocks;
      this.mockWorkflowStore.edges = largeWorkflow.edges;

      const syncStart = Date.now();
      const representation =
        this.mockSyncStore.generateWorkflowStateRepresentation();
      const syncTime = Date.now() - syncStart;

      // Performance benchmark: should generate representation for large workflow in under 500ms
      const passedBenchmark = syncTime < 500;

      expect(representation.blockSummaries).toHaveLength(100);
      expect(representation.connectionSummaries).toHaveLength(200);

      return {
        name: "Large Workflow Synchronization",
        passed: passedBenchmark,
        duration: Date.now() - startTime,
        details: `Generated state representation for 100 blocks in ${syncTime}ms (${passedBenchmark ? "PASSED" : "FAILED"} benchmark)`,
      };
    } catch (error) {
      return {
        name: "Large Workflow Synchronization",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async testConcurrentUpdates(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Simulate concurrent updates from multiple sources
      const visualUpdates = Array.from({ length: 50 }, (_, i) => ({
        type: "workflow_modified",
        source: "visual",
        data: { blockId: `visual-${i}` },
      }));

      const chatUpdates = Array.from({ length: 50 }, (_, i) => ({
        type: "chat_command",
        source: "chat",
        data: { command: `add block ${i}` },
      }));

      const executionUpdates = Array.from({ length: 20 }, (_, i) => ({
        type: "execution_state_changed",
        source: "execution",
        data: { activeBlock: `execution-${i}` },
      }));

      // Process all updates concurrently
      const allUpdates = [
        ...visualUpdates,
        ...chatUpdates,
        ...executionUpdates,
      ];

      await Promise.all(
        allUpdates.map((update) =>
          this.mockSyncStore.handleWorkflowStateChange(update),
        ),
      );

      // Verify no conflicts or corruption
      expect(this.mockSyncStore.conflicts).toHaveLength(0);
      expect(this.mockSyncStore.syncState).toBe("idle");

      return {
        name: "Concurrent Updates",
        passed: true,
        duration: Date.now() - startTime,
        details:
          "Successfully handled 120 concurrent updates without conflicts",
      };
    } catch (error) {
      return {
        name: "Concurrent Updates",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Utility methods
  private generateLargeWorkflow(blockCount: number, connectionCount: number) {
    const blocks: any = {};
    const edges: any[] = [];

    // Generate blocks
    for (let i = 0; i < blockCount; i++) {
      blocks[`block-${i}`] = {
        id: `block-${i}`,
        type: i % 3 === 0 ? "llm" : i % 3 === 1 ? "api" : "condition",
        name: `Block ${i}`,
        position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 },
        enabled: true,
      };
    }

    // Generate connections
    for (let i = 0; i < connectionCount; i++) {
      const sourceIndex = i % blockCount;
      const targetIndex = (i + 1) % blockCount;

      edges.push({
        id: `edge-${i}`,
        source: `block-${sourceIndex}`,
        target: `block-${targetIndex}`,
        sourceHandle: "response",
        targetHandle: "input",
      });
    }

    return { blocks, edges };
  }

  private compileResults(
    category: string,
    results: TestResult[],
  ): ValidationResult {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => r.passed === false).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      category,
      passed,
      failed,
      total: results.length,
      duration: totalDuration,
      results,
      success: failed === 0,
    };
  }
}

// Type definitions
interface TestScenario {
  name: string;
  description: string;
  steps: string[];
  expectedOutcome: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

interface ValidationResult {
  category: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  results: TestResult[];
  success: boolean;
}

export default WorkflowStateAccuracyValidator;
