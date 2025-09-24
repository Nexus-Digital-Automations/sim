# Workflow to Journey Examples

This directory contains comprehensive examples demonstrating how different types of workflows can be converted to conversational experiences using the Workflow to Journey Mapping System.

## Available Examples

### 1. [Simple Linear Workflow](./simple-linear-workflow.md)
**Type**: Linear Process
**Use Case**: Customer Feedback Processing
**Complexity**: Beginner
**Features Demonstrated**:
- Basic workflow conversion
- Step-by-step execution
- Natural language commands
- Progress tracking
- Error handling

A straightforward 4-step process that shows the fundamental concepts of conversational workflows.

### 2. [Conditional Workflow](./conditional-workflow.md)
**Type**: Decision-based Process
**Use Case**: Lead Qualification System
**Complexity**: Intermediate
**Features Demonstrated**:
- Conditional logic in conversations
- Dynamic path selection
- User-driven decision making
- Context-aware responses
- Multi-outcome scenarios

Shows how branching workflows translate to conversational decision trees.

### 3. [Loop Workflow](./loop-workflow.md)
**Type**: Iterative Process
**Use Case**: Batch Data Processing
**Complexity**: Intermediate
**Features Demonstrated**:
- Loop control through conversation
- Progress tracking in iterations
- Early termination conditions
- Error handling in loops
- Bulk operation management

Demonstrates how repetitive processes work in conversational mode.

### 4. [Complex Integration Workflow](./complex-integration-workflow.md)
**Type**: Multi-system Integration
**Use Case**: E-commerce Order Processing
**Complexity**: Advanced
**Features Demonstrated**:
- Multiple external system integrations
- Parallel step execution
- Advanced error recovery
- Multi-agent coordination
- Real-time status updates

A comprehensive example showing enterprise-level workflow capabilities.

### 5. [Parallel Execution Workflow](./parallel-execution-workflow.md)
**Type**: Concurrent Process
**Use Case**: Marketing Campaign Launch
**Complexity**: Advanced
**Features Demonstrated**:
- Parallel task execution
- Synchronization points
- Dependency management
- Resource coordination
- Progress aggregation

Shows how concurrent workflows are managed conversationally.

## Example Categories

### By Complexity Level

#### 🟢 **Beginner Examples**
- [Simple Linear Workflow](./simple-linear-workflow.md)
- [Basic Form Processing](./basic-form-processing.md)
- [Email Notification Workflow](./email-notification-workflow.md)

#### 🟡 **Intermediate Examples**
- [Conditional Workflow](./conditional-workflow.md)
- [Loop Workflow](./loop-workflow.md)
- [Data Validation Pipeline](./data-validation-pipeline.md)
- [Approval Workflow](./approval-workflow.md)

#### 🔴 **Advanced Examples**
- [Complex Integration Workflow](./complex-integration-workflow.md)
- [Parallel Execution Workflow](./parallel-execution-workflow.md)
- [Multi-agent Orchestration](./multi-agent-orchestration.md)
- [Enterprise Compliance Workflow](./enterprise-compliance-workflow.md)

### By Industry/Use Case

#### **Customer Service**
- Customer Feedback Processing
- Support Ticket Routing
- Escalation Management

#### **Sales & Marketing**
- Lead Qualification
- Campaign Management
- Customer Onboarding

#### **Operations**
- Data Processing
- System Monitoring
- Backup & Recovery

#### **HR & Finance**
- Employee Onboarding
- Expense Approval
- Performance Reviews

#### **Development & IT**
- CI/CD Pipelines
- Deployment Automation
- Incident Response

## How to Use These Examples

### 1. **Choose Your Starting Point**
- **New to conversational workflows?** Start with [Simple Linear Workflow](./simple-linear-workflow.md)
- **Want to see specific patterns?** Jump to relevant use case examples
- **Building something similar?** Find the closest matching workflow type

### 2. **Follow the Structure**
Each example includes:
- **Overview**: What the workflow does and why it matters
- **Visual Workflow**: Traditional ReactFlow representation
- **Conversational Experience**: How it works in chat mode
- **Workflow-to-Journey Mapping**: Technical conversion details
- **Implementation Notes**: Code examples and configurations
- **Testing Scenarios**: How to validate the implementation

### 3. **Adapt to Your Needs**
- Copy and modify the provided configurations
- Use the conversation patterns as templates
- Adapt the NLP mappings for your domain
- Customize the user experience elements

## Quick Reference

### Common Conversation Patterns

```javascript
// Starting a workflow
user: "start the process"
user: "begin customer onboarding"
user: "run the data validation"

// Checking status
user: "what's the progress?"
user: "show me the current status"
user: "how are we doing?"

// Navigation
user: "skip this step"
user: "go back to the previous step"
user: "jump to step 3"

// Modification
user: "change the priority to high"
user: "update the email address"
user: "use different data"

// Control
user: "pause the workflow"
user: "cancel this process"
user: "retry the failed step"
```

### Journey State Types

| State Type | Purpose | Example |
|------------|---------|---------|
| `input` | Collect user input | "Please provide customer email" |
| `processing` | Execute workflow step | "Validating customer data..." |
| `confirmation` | Get user approval | "Send welcome email?" |
| `output` | Show results | "Customer account created successfully" |
| `decision` | Branch based on conditions | "Route to appropriate team based on issue type" |

### Common Tool Integrations

- **OpenAI**: AI-powered categorization and analysis
- **SendGrid**: Email notifications and confirmations
- **Slack**: Team notifications and updates
- **PostgreSQL**: Data storage and retrieval
- **Google Sheets**: Reporting and data export
- **Jira**: Ticket creation and tracking

## Testing Your Implementation

### Manual Testing Checklist

- [ ] **Happy Path**: Complete workflow execution works end-to-end
- [ ] **Error Handling**: Failed steps are handled gracefully
- [ ] **User Control**: Pause, resume, cancel functions work
- [ ] **Navigation**: Skip, retry, go back commands work
- [ ] **Status Reporting**: Progress updates are accurate
- [ ] **Input Validation**: Invalid inputs are caught and explained
- [ ] **Real-time Updates**: Visual and chat modes stay synchronized

### Automated Testing

```javascript
// Example test structure
describe('Customer Feedback Workflow', () => {
  test('complete happy path execution', async () => {
    const session = await createConversationalSession(workflowId)

    await sendCommand(session, 'start the workflow')
    expect(await getStatus(session)).toBe('running')

    await sendCommand(session, 'continue')
    expect(await getProgress(session)).toBeGreaterThan(0)

    // ... additional test steps
  })

  test('handle categorization failure', async () => {
    const session = await createConversationalSession(workflowId)

    // Simulate AI categorization failure
    mockAIService.mockFailure()

    await sendCommand(session, 'start the workflow')
    expect(await getLastMessage(session)).toContain('categorization failed')

    await sendCommand(session, 'retry with manual category: bug report')
    expect(await getStatus(session)).toBe('running')
  })
})
```

## Contributing Examples

We welcome contributions of new examples! When adding examples:

### Requirements
- **Clear use case**: Real-world business scenario
- **Complete implementation**: Working code and configurations
- **Comprehensive documentation**: Follow the existing template
- **Testing coverage**: Include test scenarios
- **Screenshots/videos**: Visual demonstrations when helpful

### Submission Process
1. Create example following the template structure
2. Test thoroughly in development environment
3. Add to the examples index (this README)
4. Submit pull request with detailed description

### Example Template Structure

```markdown
# Example: [Workflow Name]

## Overview
[Brief description and business value]

## Visual Workflow
[Mermaid diagram of ReactFlow workflow]

## Conversational Experience
[Example conversation transcript]

## Workflow-to-Journey Mapping
[Technical mapping details]

## Implementation Notes
[Code examples and configuration]

## Testing Scenarios
[Test cases and validation steps]
```

## Getting Help

If you have questions about these examples:

- **Documentation**: Check the main [User Guide](../user-guide.md)
- **API Reference**: See the [API Documentation](../api-reference.md)
- **Community**: Join our discussion forums
- **Support**: Contact technical support for implementation help

## Example Requests

Missing an example for your use case? Request new examples:

- **Industry-specific workflows**: Healthcare, finance, manufacturing
- **Integration patterns**: Specific tool combinations
- **Advanced features**: Multi-agent orchestration, complex error handling
- **Deployment scenarios**: Kubernetes, serverless, edge computing

Submit requests through our GitHub issues or community forum.

---

*These examples are actively maintained and updated. Check back regularly for new additions and improvements.*