# Quick Start Guide

Get up and running with Sim in just 5 minutes! This guide will walk you through creating your first automation workflow.

## Before You Begin

Make sure you have:
- A Sim account (sign up at app.sim.ai if you haven't already)
- Basic understanding of what you want to automate

## Step 1: Create a New Workflow

1. **Navigate to your workspace** by clicking on your workspace name in the top navigation
2. **Click "New Workflow"** button in the top-right corner
3. **Choose "Start from Scratch"** or select a template that matches your use case
4. **Name your workflow** something descriptive like "My First Automation"

## Step 2: Add a Trigger Block

Every workflow needs a trigger to start the automation:

1. **Find the Starter block** in the block library on the left
2. **Drag it onto the canvas** - this will be your workflow's entry point
3. **Click on the block** to configure it
4. **Set the trigger type** (Manual, Schedule, or Webhook)

**💡 Tip**: Start with "Manual" trigger for testing - you can change it later!

## Step 3: Add Processing Blocks

Now let's add blocks to do something useful:

1. **Browse the block library** to find blocks that match your needs
2. **Popular first blocks include**:
   - **HTTP Request**: Fetch data from an API
   - **Google Sheets**: Read from or write to spreadsheets  
   - **Email**: Send notifications
   - **Condition**: Add logic to your workflow

3. **Drag your chosen block** onto the canvas
4. **Connect the blocks** by dragging from the Starter block's output (small circle) to your new block's input

## Step 4: Configure Your Blocks

Each block needs configuration to work properly:

1. **Click on each block** to open its configuration panel
2. **Fill in required fields** (marked with red asterisks *)
3. **Use variables** from previous blocks by typing `{{` to see available options
4. **Test individual blocks** using the "Test" button when available

### Example Configuration

If you're using an HTTP Request block:
```
URL: https://api.example.com/data
Method: GET
Headers: {
  "Authorization": "Bearer YOUR_TOKEN"
}
```

## Step 5: Test Your Workflow

Before going live, always test your workflow:

1. **Click the "Run" button** in the top control bar
2. **Watch the execution** - successful blocks turn green, failed blocks turn red
3. **Check the console** at the bottom for detailed output and any errors
4. **Debug if needed** by clicking on individual blocks to see their data

## Step 6: Save and Deploy

Once your workflow is working correctly:

1. **Save your workflow** (Ctrl/Cmd + S)
2. **Add a description** so you remember what it does
3. **Deploy if needed** - switch your trigger from Manual to Schedule or Webhook
4. **Monitor executions** in the workflow history

## Common First Workflows

Here are some popular starter workflows to inspire you:

### 1. Daily Weather Report
- **Starter block** (Daily schedule)
- **HTTP Request** (Weather API)
- **Email block** (Send weather to yourself)

### 2. Social Media Monitor  
- **Starter block** (Hourly schedule)
- **Twitter API** (Search for mentions)
- **Slack** (Post notifications to team channel)

### 3. Data Backup
- **Starter block** (Weekly schedule)  
- **Google Sheets** (Read data)
- **Database** (Store backup copy)

## Troubleshooting Tips

**Workflow not running?**
- Check that all required fields are filled
- Ensure blocks are connected properly
- Verify your trigger is set correctly

**Getting errors?**
- Look at the console output for specific error messages
- Check API credentials and permissions
- Test each block individually to isolate issues

**Need variables from previous blocks?**
- Type `{{` in any field to see available variables
- Use dot notation for nested data: `{{block1.data.name}}`

## What's Next?

Congratulations! You've created your first Sim workflow. Here's what to explore next:

- **[Workflow Basics](../workflow-basics/creating-workflows)**: Learn workflow design principles
- **[Block Library](../blocks/overview)**: Discover all available blocks
- **[Integration Guide](../integrations/overview)**: Connect your favorite services
- **[Best Practices](../best-practices/design-patterns)**: Build better workflows

## Get Help

- **Interactive Tours**: Click the help icon (?) for guided tutorials
- **Community**: Join our Discord server for tips and support  
- **Documentation**: Browse the full help center for detailed guides
- **Support**: Contact us anytime for personalized help

Happy automating! 🚀