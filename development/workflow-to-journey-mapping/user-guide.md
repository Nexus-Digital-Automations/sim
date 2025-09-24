# User Guide - Conversational Workflows

## Welcome to Conversational Workflows

Transform your visual workflows into natural conversations! The Conversational Workflows feature allows you to interact with your Sim workflows using natural language, making complex processes more accessible and intuitive.

## 🎯 What You Can Do

### **Talk to Your Workflows**
Instead of clicking through nodes and forms, simply tell your workflow what you want:
- *"Start processing the customer data from last week"*
- *"Pause the current task and show me the progress"*
- *"Skip the email notification step and continue"*

### **Get Real-time Updates**
Stay informed as your workflow progresses:
- Receive notifications when steps complete
- Get explanations of what's happening at each stage
- See progress updates in plain English

### **Switch Between Modes**
Choose the interface that works best for you:
- **Visual Mode**: Traditional ReactFlow editor
- **Chat Mode**: Conversational interface
- **Hybrid Mode**: Both simultaneously

## 🚀 Getting Started

### Step 1: Enable Conversational Mode

1. Open any existing workflow in Sim
2. Click the **"Chat with Workflow"** button in the top toolbar
3. The conversational interface will appear alongside your visual workflow

![Conversational Mode Toggle](./images/enable-conversational-mode.png)

### Step 2: Start Your First Conversation

The AI assistant will greet you with information about your workflow:

```
👋 Hello! I'm here to help you with your "Customer Onboarding Process" workflow.

This workflow has 8 steps and typically takes about 15 minutes to complete.
I can help you:

• Start the workflow execution
• Monitor progress and provide updates
• Handle any errors or issues
• Explain what each step does
• Modify inputs as needed

How would you like to proceed?
```

### Step 3: Give Your First Command

Try some of these natural language commands:

**Start execution:**
- *"Let's begin"*
- *"Start the workflow"*
- *"Run this process"*

**Check status:**
- *"What's the current status?"*
- *"Show me the progress"*
- *"How are we doing?"*

**Get help:**
- *"What can I do here?"*
- *"Explain the current step"*
- *"Show me my options"*

## 💬 Natural Language Commands

### Execution Control

| What You Want | Say This | What Happens |
|---------------|----------|--------------|
| Start workflow | *"Start"*, *"Begin"*, *"Run this"* | Initiates workflow execution |
| Pause execution | *"Pause"*, *"Stop for now"*, *"Hold on"* | Pauses at current step |
| Resume execution | *"Continue"*, *"Resume"*, *"Keep going"* | Resumes from pause |
| Cancel workflow | *"Cancel"*, *"Stop this"*, *"Abort"* | Terminates execution |

### Information and Status

| What You Want | Say This | What You Get |
|---------------|----------|--------------|
| Current status | *"Status"*, *"Progress"*, *"How's it going?"* | Progress summary and current step |
| Explain current step | *"What's happening?"*, *"Explain this step"* | Detailed explanation of current operation |
| Show workflow overview | *"Show me the process"*, *"What are all the steps?"* | Complete workflow breakdown |
| Get help | *"Help"*, *"What can I do?"*, *"Options"* | Available commands and actions |

### Step Management

| What You Want | Say This | What Happens |
|---------------|----------|--------------|
| Skip current step | *"Skip this"*, *"Move to next step"* | Bypasses current step |
| Retry failed step | *"Try again"*, *"Retry this step"* | Re-executes current step |
| Go back | *"Go back"*, *"Previous step"* | Returns to previous step |
| Jump to specific step | *"Go to step 3"*, *"Jump to email sending"* | Navigates to specified step |

### Input and Modification

| What You Want | Say This | What Happens |
|---------------|----------|--------------|
| Change input value | *"Set customer email to john@example.com"* | Updates specified input |
| Review current inputs | *"Show me the inputs"*, *"What data are we using?"* | Displays current input values |
| Clear and restart | *"Start over"*, *"Reset inputs"* | Clears data and restarts |

## 🔧 Workflow Configuration

### Conversation Style

Choose how the AI assistant communicates with you:

**Formal Style:**
```
Assistant: The workflow execution has been initiated successfully.
The system is currently processing step 1 of 8: "Data Validation".
Estimated completion time: 12 minutes.
```

**Casual Style:**
```
Assistant: Alright, we're up and running! 🚀
Working on step 1 - just checking all the data looks good.
Should be done in about 12 minutes.
```

**Technical Style:**
```
Assistant: Execution started. Status: RUNNING
Current node: data-validation (node_001)
Progress: 1/8 steps (12.5%)
Estimated runtime: 720 seconds
```

### Execution Modes

**Step-by-Step Mode** (Default)
- Assistant asks for confirmation before each step
- Perfect for learning or critical processes
- Maximum control and visibility

```
Assistant: Ready to start step 2: "Send Welcome Email".
This will send an email to john@example.com.
Should I proceed?

You: Yes, go ahead
```

**Autonomous Mode**
- Assistant runs the entire workflow automatically
- Only stops for errors or required inputs
- Faster for routine processes

```
Assistant: Running the workflow autonomously. I'll update you as we progress...

✅ Step 1: Data validation complete
✅ Step 2: Welcome email sent
⏳ Step 3: Creating user account...
```

**Hybrid Mode**
- Autonomous for simple steps, asks for complex ones
- Best balance of speed and control

### Notification Preferences

Control how and when you receive updates:

**Progress Updates:**
- *"Notify me every step"* - Get updates after each step
- *"Only notify on completion"* - Just the final result
- *"Tell me about errors only"* - Only when something goes wrong

**Update Detail Level:**
- *"Keep it brief"* - Minimal information
- *"Give me details"* - Comprehensive updates
- *"Include data"* - Show actual values and results

## 🎛️ Advanced Features

### Conditional Logic in Conversation

The assistant understands your workflow's conditional logic:

```
You: What happens if the email is invalid?