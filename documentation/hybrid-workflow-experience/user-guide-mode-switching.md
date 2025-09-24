# User Guide - Hybrid Visual/Conversational Workflow Mode Switching

## Welcome to Hybrid Workflows

Transform how you interact with your workflows by seamlessly switching between visual editing and conversational interfaces. The hybrid workflow experience gives you the power of Sim's visual workflow editor combined with the intuitive nature of conversational AI.

## Table of Contents

- [Getting Started](#getting-started)
- [Understanding the Three Modes](#understanding-the-three-modes)
- [Switching Between Modes](#switching-between-modes)
- [Visual Mode Features](#visual-mode-features)
- [Conversational Mode Features](#conversational-mode-features)
- [Hybrid Mode Features](#hybrid-mode-features)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

---

## Getting Started

### Prerequisites

Before using hybrid workflows, ensure you have:
- An active Sim workspace with workflow creation permissions
- At least one existing workflow or permission to create new workflows
- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Enabling Hybrid Mode

1. **Open any workflow** in your Sim workspace
2. **Look for the mode selector** in the top toolbar (three connected icons)
3. **Click "Enable Hybrid Mode"** if prompted
4. **Grant permissions** for enhanced features when requested

### Quick Start (60 seconds)

1. **Open a workflow** → Click any workflow card in your workspace
2. **Enable chat mode** → Click the "Chat with Workflow" button
3. **Start conversation** → Type "Hello, explain this workflow"
4. **Try switching** → Use the mode toggle to switch between visual and chat
5. **Execute workflow** → Say "Start this workflow" in chat mode

---

## Understanding the Three Modes

### 📊 Visual Mode (Traditional)
- **What it is**: The familiar ReactFlow visual editor
- **Best for**: Creating workflows, detailed editing, understanding complex logic
- **Key features**: Drag-and-drop editing, visual connections, property panels

### 💬 Conversational Mode (New)
- **What it is**: Natural language interaction with your workflow
- **Best for**: Running workflows, quick status checks, guided execution
- **Key features**: Chat interface, natural language commands, step-by-step guidance

### 🔄 Hybrid Mode (Recommended)
- **What it is**: Both interfaces working together in real-time
- **Best for**: Learning, debugging, collaborative work, comprehensive workflow management
- **Key features**: Synchronized views, mode switching, real-time updates

---

## Switching Between Modes

### Mode Selection Interface

The mode selector is located in the workflow toolbar and shows three options:

```
[ 👁️ Visual ] [ 💬 Chat ] [ 🔄 Hybrid ]
```

### Switch Methods

#### Method 1: Toolbar Toggle
1. Click the desired mode icon in the toolbar
2. Wait for the interface transition (1-2 seconds)
3. The selected mode becomes active immediately

#### Method 2: Keyboard Shortcuts
- **Alt + V**: Switch to Visual mode
- **Alt + C**: Switch to Conversational mode
- **Alt + H**: Switch to Hybrid mode
- **Tab**: Quick toggle between current mode and Hybrid

#### Method 3: Voice Commands (Hybrid/Chat mode)
- *"Switch to visual mode"*
- *"Show me the chat interface"*
- *"Enable hybrid view"*

#### Method 4: Context Menu
- Right-click in empty space → "Switch Mode" → Select desired mode

### Transition Behavior

When switching modes, the system:
- **Preserves all state**: Current execution progress, input values, selections
- **Synchronizes views**: Updates both interfaces to match current workflow state
- **Maintains session**: Conversations and visual edits remain available
- **Shows transition feedback**: Brief loading indicator during switch

---

## Visual Mode Features

### Core Visual Editing

#### Node Management
- **Add Nodes**: Drag from the toolbox or right-click → "Add Node"
- **Delete Nodes**: Select node(s) → Delete key or right-click → "Delete"
- **Copy/Paste**: Ctrl+C, Ctrl+V for node duplication
- **Multi-select**: Ctrl+click or drag selection box

#### Connection Editing
- **Create Connections**: Drag from output handle to input handle
- **Delete Connections**: Click connection → Delete key
- **Reroute Connections**: Drag connection endpoints
- **Conditional Connections**: Set conditions on connection properties

#### Layout and Organization
- **Auto-layout**: Right-click → "Auto Arrange" for automatic organization
- **Grid Snap**: Enable grid snapping for precise alignment
- **Zoom Control**: Mouse wheel or toolbar controls (+/-)
- **Pan Navigation**: Click and drag empty space or use minimap

### Advanced Visual Features

#### Container Nodes
- **Loop Containers**: For iterating over data sets
- **Parallel Containers**: For concurrent execution paths
- **Conditional Containers**: For branching logic

#### Real-time Collaboration
- **Multi-user Editing**: See other users' cursors and changes
- **Conflict Resolution**: Automatic merging of simultaneous edits
- **Version History**: Access previous versions via toolbar

---

## Conversational Mode Features

### Natural Language Commands

#### Workflow Control
```
Start Commands:
• "Start the workflow"
• "Begin execution"
• "Run this process"
• "Let's get started"

Pause/Resume Commands:
• "Pause execution"
• "Stop for now"
• "Continue the workflow"
• "Resume processing"

Stop Commands:
• "Cancel the workflow"
• "Abort execution"
• "Stop everything"
```

#### Information Requests
```
Status Inquiries:
• "What's happening right now?"
• "Show me the current status"
• "How much progress have we made?"
• "Are there any errors?"

Step Details:
• "Explain the current step"
• "What does this node do?"
• "Show me the next steps"
• "What are the requirements?"

General Help:
• "Help me with this workflow"
• "What can I do here?"
• "Show me available commands"
```

#### Data and Configuration
```
Input Management:
• "Change the input data"
• "Set customer email to john@example.com"
• "Update the timeout to 5 minutes"
• "Clear all input values"

Configuration:
• "Make this workflow more verbose"
• "Ask me before each step"
• "Run autonomously"
• "Switch to technical explanations"
```

### Conversation Styles

Choose how the AI assistant communicates:

#### Professional Style
```
Assistant: The workflow execution has been initiated successfully.
Currently processing step 2 of 8: "Data Validation".
Estimated completion time: 12 minutes.

Your Options:
• Monitor progress
• Modify execution parameters
• Pause execution
```

#### Friendly Style
```
Assistant: Great! We're up and running! 🚀

I'm working on step 2 right now - just double-checking all
the data looks good. Should be done in about 12 minutes.

Want to grab a coffee while I handle this, or would you
like to watch the progress?
```

#### Technical Style
```
Assistant: Execution Status: RUNNING
Current Node: data-validation-node-001
Progress: 2/8 steps (25% complete)
Runtime: 00:03:45
Memory Usage: 45MB
Next: customer-email-validation-node-002

Actions: [pause] [skip] [debug] [monitor]
```

### Execution Modes

#### Step-by-Step Mode (Default)
- AI asks permission before executing each step
- Perfect for learning or critical workflows
- Maximum control and oversight

```
Assistant: Ready to execute step 3: "Send Welcome Email"
This will send an email to john@example.com using template #5.
Should I proceed? (yes/no/skip/modify)

You: yes
```

#### Autonomous Mode
- AI executes the workflow automatically
- Only pauses for errors or required inputs
- Fastest execution for routine processes

```
Assistant: Running your workflow autonomously now...

✅ Step 1: Data validation complete (2.3s)
✅ Step 2: Database lookup complete (1.8s)
⏳ Step 3: Sending welcome email...
✅ Step 3: Welcome email sent successfully (0.9s)
⏳ Step 4: Creating user account...
```

#### Guided Mode (Hybrid)
- AI executes simple steps automatically
- Asks for guidance on complex or critical steps
- Best balance of speed and control

```
Assistant: I'll handle the data validation automatically, but
I'll check with you before sending any emails.

✅ Steps 1-2: Completed automatically
⏸️ Step 3: Ready to send email - your approval needed
```

---

## Hybrid Mode Features

### Synchronized Dual Interface

#### Real-time Synchronization
- **Visual updates** reflect immediately in chat conversation
- **Chat actions** update the visual workflow instantly
- **Execution progress** shows in both interfaces simultaneously
- **State changes** maintain consistency across views

#### Interactive Elements

##### Chat-Triggered Visual Highlights
When you ask about workflow elements, the visual editor highlights relevant nodes:
```
You: "What does the email step do?"
→ Email node highlights in visual editor
→ Chat provides detailed explanation
```

##### Visual-Triggered Chat Context
When you select nodes in the visual editor:
```
You: *clicks email node*
→ Chat assistant: "I see you're looking at the email step.
   Would you like me to explain its configuration?"
```

### Best of Both Worlds

#### Use Cases for Hybrid Mode

**Learning and Training**
- New users can see visual structure while getting chat explanations
- Complex workflows become easier to understand
- Step-by-step guidance with visual confirmation

**Debugging and Troubleshooting**
- Chat can identify issues while you inspect visually
- Error locations highlighted in both interfaces
- Interactive problem-solving with visual feedback

**Collaborative Work**
- Team members can follow along in their preferred interface
- Share screen with both views for comprehensive demonstrations
- Mixed-skill teams (visual vs. conversational preferences)

**Complex Workflow Management**
- Monitor execution progress visually while controlling via chat
- Quick adjustments in visual editor with chat-based execution
- Comprehensive overview with focused interaction

---

## Best Practices

### When to Use Each Mode

#### Choose Visual Mode When:
- ✅ Creating new workflows from scratch
- ✅ Making complex structural changes
- ✅ Understanding workflow architecture
- ✅ Debugging connection issues
- ✅ Teaching others about workflow design
- ✅ Working with large, complex workflows (50+ nodes)

#### Choose Conversational Mode When:
- ✅ Running routine workflows
- ✅ Checking workflow status quickly
- ✅ Executing workflows you understand well
- ✅ Working on mobile or small screens
- ✅ Multitasking while workflows run
- ✅ Learning workflow functionality (not structure)

#### Choose Hybrid Mode When:
- ✅ Learning new workflows
- ✅ Training team members
- ✅ Debugging execution issues
- ✅ Demonstrating workflows to stakeholders
- ✅ Working collaboratively
- ✅ Developing and testing simultaneously

### Optimization Tips

#### Performance Optimization
- **Large workflows** (100+ nodes): Start in visual mode, switch to chat for execution
- **Slow connections**: Use conversational mode for lighter resource usage
- **Multiple tabs**: Hybrid mode may impact performance with many open tabs

#### User Experience Tips
- **Start with Hybrid**: Learn the system with both interfaces visible
- **Keyboard shortcuts**: Memorize Alt+V/C/H for quick switching
- **Voice commands**: Use voice in conversational mode for hands-free operation
- **Save preferences**: System remembers your last used mode per workflow

---

## Troubleshooting

### Common Issues and Solutions

#### Mode Switching Problems

**Issue**: "Mode switch button is grayed out"
**Solution**:
1. Ensure workflow is not currently executing
2. Check browser permissions for enhanced features
3. Refresh page if issue persists
4. Contact support if problem continues

**Issue**: "Chat mode shows 'Agent unavailable'"
**Solution**:
1. Check internet connection
2. Verify workspace permissions include AI features
3. Wait 30 seconds and try again (server may be restarting)
4. Switch to visual mode as fallback

**Issue**: "Visual and chat views show different states"
**Solution**:
1. Try switching modes to trigger sync
2. Refresh the page
3. Check for error messages in browser console
4. Report synchronization bugs to support

#### Performance Issues

**Issue**: "Hybrid mode is slow/laggy"
**Solution**:
1. Close other browser tabs
2. Switch to single mode temporarily
3. Check CPU usage (hybrid mode uses more resources)
4. Consider upgrading browser or hardware

**Issue**: "Chat responses are delayed"
**Solution**:
1. Check network connection speed
2. Reduce conversation verbosity level
3. Clear browser cache
4. Try switching to technical communication style (faster processing)

#### Feature Limitations

**Issue**: "Some commands don't work in chat mode"
**Solution**:
- Complex structural edits require visual mode
- Use "switch to visual mode" for advanced editing
- Check command syntax in help documentation
- Some premium features require upgrade

### Error Messages

#### Understanding Common Error Messages

```
"Workflow mapping failed"
→ The workflow contains elements not compatible with chat mode
→ Solution: Use visual mode or simplify workflow structure

"Session expired"
→ Chat session timed out due to inactivity
→ Solution: Refresh page and restart chat session

"Permission denied"
→ Your account lacks required permissions for hybrid features
→ Solution: Contact workspace administrator

"Sync conflict detected"
→ Changes made simultaneously in both modes conflict
→ Solution: Refresh page, changes will be merged automatically
```

### Getting Help

#### Built-in Help
- **Chat command**: Type "help" in conversational mode
- **Keyboard shortcut**: F1 for contextual help
- **Tooltips**: Hover over interface elements for explanations

#### Support Channels
- **In-app support**: Click "?" icon for live chat support
- **Documentation**: Access via Help menu
- **Video tutorials**: Available in user dashboard
- **Community forum**: Share experiences and get peer help

---

## Advanced Features

### Customization Options

#### Interface Preferences
```javascript
// Access via Settings > Hybrid Workflows
{
  defaultMode: 'hybrid',
  quickSwitchKeyboard: true,
  syncHighlighting: true,
  conversationStyle: 'friendly',
  visualTheme: 'light',
  chatTheme: 'dark'
}
```

#### Conversation Customization
- **Personality profiles**: Choose from helpful, professional, or casual
- **Verbosity levels**: Control how detailed chat responses are
- **Technical depth**: Adjust explanations for your expertise level
- **Notification preferences**: Configure when to receive updates

#### Visual Customization
- **Layout preferences**: Auto-arrange settings
- **Color themes**: Match your workflow style
- **Node display**: Control information density
- **Animation settings**: Reduce motion for accessibility

### Integration Features

#### External Tool Integration
- **Slack notifications**: Get workflow updates in Slack
- **Email reports**: Automated execution summaries
- **API webhooks**: Send workflow events to external systems
- **Calendar integration**: Schedule workflow executions

#### Advanced Automation
- **Conditional mode switching**: Auto-switch based on workflow type
- **Smart notifications**: AI determines when to notify you
- **Batch operations**: Process multiple workflows conversationally
- **Template generation**: Create workflow templates via conversation

### Power User Features

#### Keyboard Shortcuts
```
Mode Switching:
Alt + V       → Visual mode
Alt + C       → Conversational mode
Alt + H       → Hybrid mode
Tab           → Quick toggle

Visual Mode:
Ctrl + A      → Select all nodes
Ctrl + D      → Duplicate selection
Ctrl + G      → Group nodes
Ctrl + U      → Ungroup nodes
Space         → Pan mode toggle

Chat Mode:
Ctrl + Enter  → Send message
↑/↓ arrows    → Navigate chat history
Ctrl + K      → Clear conversation
Ctrl + /      → Show commands
```

#### Advanced Commands
```
Batch Operations:
• "Run workflows 1, 3, and 5 in sequence"
• "Pause all running workflows"
• "Show me status of all workflows"

Conditional Logic:
• "If step 3 fails, skip to step 6"
• "Only proceed if customer_type equals premium"
• "Set timeout based on workflow complexity"

Debugging:
• "Show me execution logs for step 2"
• "What was the last error message?"
• "Compare this run with the previous execution"

Analytics:
• "How long did each step take?"
• "Show me performance metrics"
• "Which workflows run most frequently?"
```

#### API Integration
```javascript
// Access hybrid workflow API for custom integrations
const hybridAPI = new HybridWorkflowAPI(apiKey);

// Switch modes programmatically
await hybridAPI.switchMode('workflow-123', 'conversational');

// Send chat commands programmatically
const result = await hybridAPI.processCommand('workflow-123', 'start execution');

// Subscribe to workflow events
hybridAPI.onStateChange('workflow-123', (state) => {
  console.log('Workflow state updated:', state);
});
```

---

## Quick Reference

### Essential Commands
| Command | Visual Mode | Chat Mode | Hybrid Mode |
|---------|-------------|-----------|-------------|
| **Start workflow** | Click play button | "Start workflow" | Both options work |
| **Pause execution** | Click pause button | "Pause" | Both options work |
| **View status** | Check progress bar | "Show status" | Both show status |
| **Edit workflow** | Direct editing | "Switch to visual mode" | Use visual side |
| **Get help** | ? menu | "help" | Both available |

### Mode Switching Quick Guide
1. **Toolbar**: Click mode icons in top toolbar
2. **Keyboard**: Alt + V/C/H for Visual/Chat/Hybrid
3. **Voice**: "Switch to [mode] mode" in chat
4. **Context menu**: Right-click → Switch Mode

### Best Practices Summary
- **Start with Hybrid** for learning
- **Use Visual** for complex editing
- **Use Chat** for execution and monitoring
- **Save time** with keyboard shortcuts
- **Customize** interface for your workflow

---

*This user guide is part of the comprehensive Sim Hybrid Workflow documentation. For technical details, see the API Documentation. For deployment guidance, see the Administrative Guide.*