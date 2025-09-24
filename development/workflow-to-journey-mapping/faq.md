# Frequently Asked Questions (FAQ)

## General Questions

### What is the Workflow to Journey Mapping System?

The Workflow to Journey Mapping System transforms your existing visual ReactFlow workflows into conversational experiences. Instead of clicking through nodes and forms, you can interact with your workflows using natural language commands like "start the process," "show me the progress," or "skip this step."

### How does it work with existing workflows?

The system creates a parallel conversational interface alongside your existing visual workflow editor. Your original workflows remain unchanged and fully functional. The system automatically converts workflow steps into conversational states, enabling natural language interaction while preserving all the original functionality.

### Do I need to rebuild my workflows?

No! The system works with your existing ReactFlow workflows without requiring any changes. The conversion from visual workflows to conversational journeys is automatic.

## Getting Started

### How do I enable conversational workflows?

1. Open any existing workflow in your Sim workspace
2. Click the **"💬 Chat"** button in the toolbar
3. The conversational interface will initialize automatically
4. Start typing commands like "begin the workflow" or "what does this do?"

### What if the Chat button doesn't appear?

The chat button requires:
- At least one executable step in your workflow
- Conversational workflows enabled for your workspace
- A supported workflow type (most workflow types are supported)

If you don't see the button, try refreshing the page or contact your workspace administrator.

### Can I use both visual and chat modes simultaneously?

Yes! The **"Both"** mode shows your visual workflow editor and chat interface side-by-side. Changes in one interface are reflected in real-time in the other.

## Using Conversational Workflows

### What commands can I use?

The system understands natural language, so you can speak naturally. Common commands include:

**Execution Control:**
- "Start the workflow" / "Begin" / "Run this"
- "Pause" / "Stop for now" / "Hold on"
- "Continue" / "Resume" / "Keep going"
- "Cancel" / "Stop this" / "Abort"

**Information:**
- "What's the status?" / "Show progress" / "How's it going?"
- "Explain this step" / "What's happening?"
- "Show me the steps" / "What does this workflow do?"

**Navigation:**
- "Skip this step" / "Move to next"
- "Go back" / "Previous step"
- "Jump to step 3" / "Go to the email step"

### How accurate is the natural language understanding?

The system uses advanced NLP processing with high accuracy for common workflow commands. It understands:
- Intent recognition (what you want to do)
- Entity extraction (specific parameters)
- Context awareness (current workflow state)
- Synonyms and variations in phrasing

If a command isn't understood, the system will ask for clarification or suggest alternatives.

### Can I modify workflow inputs through conversation?

Yes! You can update parameters naturally:
- "Set the customer email to john@example.com"
- "Change the priority to high"
- "Use the data from last week instead"

The system will validate inputs and confirm changes before applying them.

### What happens if something goes wrong?

The system includes comprehensive error handling:
- **Automatic Recovery**: Retries failed steps automatically
- **Graceful Degradation**: Falls back to visual mode if needed
- **Clear Error Messages**: Explains what went wrong and suggests fixes
- **User Control**: You can retry, skip, or modify steps as needed

## Technical Questions

### How does the conversion process work?

The system analyzes your ReactFlow workflow and creates a corresponding Parlant journey:

1. **Node Analysis**: Each workflow node becomes a journey state
2. **Edge Mapping**: Connections become state transitions
3. **Tool Integration**: Existing tool configurations are preserved
4. **Context Mapping**: Variables and data flow are maintained

The conversion is automatic and maintains full fidelity with your original workflow.

### Is my data secure?

Yes, the system maintains the same security standards as your existing Sim workflows:
- **Workspace Isolation**: Conversations are isolated within your workspace
- **Permission Inheritance**: Respects existing user permissions
- **Encryption**: All communications are encrypted
- **Audit Logging**: Full audit trails for compliance

### What about performance?

The conversational interface is designed for high performance:
- **Lazy Loading**: Components load only when needed
- **Caching**: Frequent operations are cached
- **Real-time Updates**: WebSocket connections for instant feedback
- **Scalability**: Supports hundreds of concurrent conversations

### Which browsers are supported?

The conversational interface works in all modern browsers:
- Chrome 90+
- Firefox 85+
- Safari 14+
- Edge 90+

WebSocket support is required for real-time features.

## Workflow Types and Limitations

### Which types of workflows are supported?

Most workflow types work with conversational interfaces:

**✅ Fully Supported:**
- Linear workflows (step-by-step processes)
- Conditional workflows (if/then logic)
- Loop workflows (repeat until conditions met)
- Data processing workflows
- Integration workflows (API calls, databases)
- Notification workflows (emails, messages)

**⚠️ Partially Supported:**
- Complex parallel workflows (some steps may run in sequence)
- Workflows with custom UI components (fallback to visual mode)

**❌ Not Supported:**
- Workflows requiring real-time user interaction (forms, drawing)
- Workflows with complex visual outputs (charts, graphs)

### Can I customize the conversation style?

Yes! You can adjust several aspects:

**Communication Style:**
- **Formal**: Professional, structured responses
- **Casual**: Friendly, conversational tone
- **Technical**: Detailed, technical information
- **Minimal**: Brief, concise updates

**Detail Level:**
- **Verbose**: Detailed explanations of each step
- **Normal**: Balanced information level
- **Minimal**: Essential information only

**Execution Mode:**
- **Step-by-step**: Asks for confirmation at each step
- **Autonomous**: Runs automatically with periodic updates
- **Hybrid**: Automatic for simple steps, asks for complex ones

### How do I handle complex workflows?

For complex workflows with many steps or parallel execution:

1. **Use Progress Tracking**: "Show me the progress" gives overall status
2. **Focus on Critical Steps**: Set pause points for important decisions
3. **Break into Phases**: Use step groups for better organization
4. **Monitor in Visual Mode**: Use hybrid mode to see the full picture

## Troubleshooting

### The chat interface isn't loading

**Quick fixes:**
1. Refresh the browser page
2. Check that you have an active internet connection
3. Ensure JavaScript is enabled
4. Try a different browser

**If still not working:**
- Check with your workspace administrator about feature availability
- Look for error messages in browser console (F12 → Console)

### Commands aren't being recognized

**Try these approaches:**
1. **Use simpler language**: "Start" instead of "Commence execution"
2. **Be more specific**: "Skip step 2" instead of "Skip this"
3. **Check spelling**: The system is forgiving but very unusual spellings might not work
4. **Ask for help**: Type "help" to see available commands

### Workflow execution is stuck

**Immediate actions:**
1. Type "status" to check current state
2. Type "cancel" to stop execution
3. Refresh the page and try again
4. Switch to visual mode to see detailed status

**If problem persists:**
- Check the workflow configuration in visual mode
- Look for error messages in the conversation
- Contact support with specific error details

### Real-time updates aren't working

**Check these items:**
- Browser supports WebSockets (most modern browsers do)
- Not behind a restrictive firewall or proxy
- Internet connection is stable
- Try refreshing the page

## Advanced Features

### Can I integrate with external systems?

Yes! The conversational interface works with all existing Sim integrations:
- **APIs**: REST and GraphQL endpoints
- **Databases**: PostgreSQL, MySQL, MongoDB
- **Cloud Services**: AWS, Google Cloud, Azure
- **Communication**: Slack, Email, SMS
- **File Systems**: Local and cloud storage

All existing tool configurations are preserved in conversational mode.

### How do I handle sensitive data?

The system provides several approaches for sensitive data:

1. **Masked Display**: Sensitive values shown as "***" in conversation
2. **Secure Input**: Use visual mode for sensitive form inputs
3. **Audit Trails**: Full logging of who accessed what data
4. **Role-Based Access**: Respect existing permission systems

### Can multiple people work on the same workflow?

Yes! Multiple team members can:
- **Collaborate in real-time**: See each other's actions
- **Hand off execution**: Transfer control between team members
- **Comment and discuss**: Add notes and discussions
- **Review and approve**: Set approval points for critical steps

### How do I create workflow templates?

You can create reusable conversational workflow patterns:

1. **Template Creation**: Save successful workflow configurations
2. **Parameter Templates**: Define common input patterns
3. **Response Templates**: Standardize communication styles
4. **Sharing**: Share templates across your organization

## Integration and Development

### Can I extend the conversational interface?

The system provides several extension points:

**Custom Commands**: Add domain-specific commands
**Tool Integration**: Connect new tools and services
**Response Templates**: Customize agent responses
**Workflow Patterns**: Create new journey templates

See the [Extension Guide](./extension-guide.md) for technical details.

### How do I backup conversational data?

Conversational workflow data is included in your regular Sim backups:
- **Session Data**: Conversation history and state
- **Configuration**: Custom templates and settings
- **Audit Logs**: Full activity trails

### Can I export conversation transcripts?

Yes! You can export:
- **Individual Conversations**: Single workflow execution transcripts
- **Bulk Export**: All conversations for a time period
- **Analytics Data**: Conversation patterns and performance metrics

## Billing and Pricing

### Does this cost extra?

Conversational workflows are included with your Sim subscription at no additional cost. However:
- **External NLP Services**: If using premium AI services (OpenAI, etc.)
- **Increased Usage**: More API calls may affect usage-based billing
- **Enterprise Features**: Some advanced features require enterprise plans

### How does it affect my usage limits?

Conversational workflows use the same underlying infrastructure as visual workflows:
- **Execution Limits**: Same limits as visual workflow execution
- **Storage**: Conversation history counts toward data storage
- **API Calls**: Tool executions count the same as visual mode

## Support and Community

### Where can I get help?

**Documentation:**
- [User Guide](./user-guide.md) - Complete user manual
- [Quick Start](./quick-start.md) - 5-minute getting started guide
- [Examples](./examples/) - Real-world workflow examples

**Support Channels:**
- **In-app Help**: Click the help icon in any conversation
- **Community Forum**: Connect with other users
- **Email Support**: For technical issues
- **Live Chat**: For urgent problems (enterprise customers)

### How do I report bugs or request features?

**Bug Reports:**
1. Include specific error messages
2. Provide steps to reproduce
3. Note browser and system information
4. Include conversation transcript if relevant

**Feature Requests:**
1. Describe the use case clearly
2. Explain the business value
3. Suggest implementation approaches
4. Vote on existing requests

### Can I contribute to the project?

We welcome contributions! You can:
- **Report Issues**: Help us identify and fix problems
- **Suggest Improvements**: Share ideas for new features
- **Write Documentation**: Help improve guides and examples
- **Test Beta Features**: Try new features before release

See our [Contributing Guide](./contributing.md) for details.

## Future Roadmap

### What features are coming next?

**Short Term (Next 3 months):**
- Multi-language support (Spanish, French, German)
- Voice input/output capabilities
- Advanced workflow templates
- Improved mobile experience

**Medium Term (3-6 months):**
- AI-powered workflow optimization suggestions
- Integration with external chat platforms (Slack, Teams)
- Advanced analytics and reporting
- Custom workflow building through conversation

**Long Term (6+ months):**
- Multi-agent workflow orchestration
- Advanced AI reasoning capabilities
- Cross-platform workflow portability
- Enterprise governance features

### How can I influence the roadmap?

Your feedback shapes our development priorities:
- **Feature Votes**: Vote on proposed features
- **Usage Analytics**: How you use the system informs improvements
- **Direct Feedback**: Share suggestions with the product team
- **Beta Testing**: Try experimental features early

---

*Didn't find your question? Check our [User Guide](./user-guide.md) or [contact support](mailto:support@sim.dev).*

*FAQ last updated: $(date)*