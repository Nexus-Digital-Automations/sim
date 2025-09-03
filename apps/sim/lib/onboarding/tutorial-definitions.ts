/**
 * Tutorial Definitions - Comprehensive tutorial content for Sim workflow automation
 * 
 * This file contains all tutorial definitions including:
 * - First workflow creation tutorial
 * - Advanced workflow patterns
 * - Block-specific tutorials
 * - Integration tutorials
 * - Debugging and optimization tutorials
 * 
 * @created 2025-09-03
 * @author Claude Development System
 */

import type { Tutorial, TutorialStep } from './tutorial-system'

/**
 * Welcome and First Workflow Tutorial
 * 
 * Guides new users through creating their first automation workflow
 * with comprehensive accessibility support and step-by-step validation.
 */
export const FIRST_WORKFLOW_TUTORIAL: Tutorial = {
  id: 'first-workflow',
  title: 'Create Your First Workflow',
  description: 'Learn to build a simple automation workflow step by step. Perfect for beginners to understand the core concepts of workflow automation.',
  category: 'basic',
  estimatedDuration: 15,
  prerequisites: [],
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Sim',
      description: 'Introduction to workflow automation concepts',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Welcome to Sim Workflow Automation!</h3>
          <p>You're about to learn how to create powerful automation workflows without writing code. This tutorial will guide you through:</p>
          <ul>
            <li>Understanding workflow concepts</li>
            <li>Adding your first automation blocks</li>
            <li>Connecting blocks to create logic flows</li>
            <li>Testing and running your workflow</li>
          </ul>
          <p>Let's start by understanding the workspace layout.</p>
        </div>
      `,
      action: 'highlight',
      position: 'center',
      hints: [
        'This is your workflow canvas where you\'ll build automations',
        'Use the panel on the right for tools and configuration',
        'The control bar at the top manages workflow execution'
      ],
      accessibilityInstructions: 'The workflow canvas is the main area where you build automations. Use tab navigation to explore interface elements.',
      screenReaderText: 'Welcome to Sim. This tutorial will teach you to create automation workflows step by step.'
    },
    {
      id: 'understand-interface',
      title: 'Explore the Interface',
      description: 'Learn about the key interface components',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Understanding the Sim Interface</h3>
          <p>The Sim interface has three main areas:</p>
          <ol>
            <li><strong>Workflow Canvas (center)</strong>: Where you build your automation by adding and connecting blocks</li>
            <li><strong>Control Bar (top)</strong>: Contains execution controls, settings, and workflow management tools</li>
            <li><strong>Side Panel (right)</strong>: Houses the Copilot AI assistant, console output, and configuration tools</li>
          </ol>
          <p>Let's open the side panel to see the block library and tools available.</p>
        </div>
      `,
      action: 'click',
      validation: () => {
        const panel = document.querySelector('[data-testid="panel"]') as HTMLElement
        return panel && !panel.classList.contains('translate-x-full')
      },
      hints: [
        'Look for a panel or drawer button on the right side of the screen',
        'The panel should slide open to reveal tools and options',
        'If the panel is already open, this step will complete automatically'
      ],
      keyboardShortcuts: ['Ctrl+Shift+P', 'Alt+P'],
      accessibilityInstructions: 'Use Tab to navigate to the panel toggle button, then press Enter or Space to open it.',
      screenReaderText: 'Open the side panel to access workflow tools and the block library.'
    },
    {
      id: 'add-starter-block',
      title: 'Add a Starter Block',
      description: 'Every workflow needs a trigger to begin execution',
      target: '.block-library',
      content: `
        <div>
          <h3>Start with a Starter Block</h3>
          <p>Every workflow needs a starting point - this is called a "Starter" block. It's like pressing the "go" button for your automation.</p>
          <p>In the block library, find and drag a <strong>Starter</strong> block onto the canvas, or click the Starter block button in the toolbar.</p>
          <div class="tutorial-tip">
            <strong>💡 Tip:</strong> You can also use the toolbar at the top to quickly add common blocks like Starter.
          </div>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const starterBlocks = document.querySelectorAll('[data-block-type="starter"]')
        return starterBlocks.length > 0
      },
      hints: [
        'Look for a block labeled "Starter" or "Trigger" in the block library',
        'Drag the Starter block from the library onto the canvas',
        'Alternatively, click the "Add Block" button and select Starter',
        'The Starter block is usually the first block in automation workflows'
      ],
      accessibilityInstructions: 'Navigate to the block library, find the Starter block, and press Enter to add it to the workflow.',
      screenReaderText: 'Add a Starter block to begin your workflow. This block will trigger the automation to run.'
    },
    {
      id: 'add-action-block',
      title: 'Add an Action Block',
      description: 'Add a block that performs an action',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Add Your First Action</h3>
          <p>Now let's add a block that does something useful. We'll add a <strong>Response</strong> block that can display a message or return data.</p>
          <p>Find the Response block in the library and drag it onto the canvas next to your Starter block.</p>
          <div class="tutorial-tip">
            <strong>💡 Tip:</strong> Response blocks are great for testing workflows - they show you what data is flowing through your automation.
          </div>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const responseBlocks = document.querySelectorAll('[data-block-type="response"]')
        return responseBlocks.length > 0
      },
      hints: [
        'Look for the "Response" block in the block library',
        'Drag it onto the canvas near your Starter block',
        'Response blocks are commonly used to display results or send data',
        'You can search for "response" in the block library to find it quickly'
      ],
      accessibilityInstructions: 'Navigate to the block library, find the Response block, and add it to your workflow.',
      screenReaderText: 'Add a Response block to your workflow. This will perform an action when the workflow runs.'
    },
    {
      id: 'connect-blocks',
      title: 'Connect Your Blocks',
      description: 'Create a flow between blocks to define execution order',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Connect the Blocks</h3>
          <p>Now we need to connect the Starter block to the Response block so they work together in sequence.</p>
          <p>Look for a small circle or connector on the right side of the Starter block. Drag from this connector to the Response block to create a connection.</p>
          <div class="tutorial-tip">
            <strong>💡 Tip:</strong> Connections show the flow of your automation - data and control flow from left to right through connected blocks.
          </div>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const edges = document.querySelectorAll('.react-flow__edge')
        return edges.length > 0
      },
      hints: [
        'Look for small circles or handles on the edges of blocks - these are connection points',
        'Drag from the output connector (usually on the right) of the Starter block',
        'Drop the connection on the input connector (usually on the left) of the Response block',
        'You should see a line or arrow connecting the two blocks when successful'
      ],
      accessibilityInstructions: 'Use keyboard navigation to select the Starter block, press C to start connecting, then navigate to the Response block and press Enter to complete the connection.',
      screenReaderText: 'Connect the Starter block to the Response block to create a workflow sequence.'
    },
    {
      id: 'configure-response',
      title: 'Configure the Response Block',
      description: 'Set up what the Response block should do',
      target: '[data-block-type="response"]',
      content: `
        <div>
          <h3>Configure Your Response</h3>
          <p>Let's set up what message the Response block should display when your workflow runs.</p>
          <p>Click on the Response block to open its configuration panel, then:</p>
          <ol>
            <li>Find the "Response" or "Message" field</li>
            <li>Enter a message like "Hello! My first workflow is working!"</li>
            <li>Save the configuration</li>
          </ol>
        </div>
      `,
      action: 'click',
      validation: () => {
        // Check if response block has been configured
        const responseInputs = document.querySelectorAll('input[value*="Hello"], textarea[value*="Hello"]')
        return responseInputs.length > 0 || 
               document.querySelector('.subblock-editor') !== null
      },
      hints: [
        'Click directly on the Response block to select and configure it',
        'Look for an input field where you can type your message',
        'Try entering a simple message like "Hello World!" or "Test successful!"',
        'Make sure to save or confirm your changes'
      ],
      accessibilityInstructions: 'Navigate to the Response block, press Enter to open configuration, then use Tab to find the message field and enter your text.',
      screenReaderText: 'Configure the Response block by adding a message that will be displayed when the workflow runs.'
    },
    {
      id: 'run-workflow',
      title: 'Run Your First Workflow',
      description: 'Execute the workflow to see it in action',
      target: '.control-bar',
      content: `
        <div>
          <h3>Run Your Workflow</h3>
          <p>Time to see your automation in action! Look for the <strong>Run</strong> or <strong>Play</strong> button in the control bar at the top.</p>
          <p>Click the Run button to execute your workflow. You should see:</p>
          <ul>
            <li>The blocks highlight as they execute</li>
            <li>Your message appears in the console or results panel</li>
            <li>A success indicator when complete</li>
          </ul>
          <div class="tutorial-tip">
            <strong>🎉 Congratulations!</strong> You're about to run your first automation workflow!
          </div>
        </div>
      `,
      action: 'click',
      validation: () => {
        // Check for execution indicators
        const executionButton = document.querySelector('[data-testid="run-button"]')
        const activeBlocks = document.querySelectorAll('.block-active, .block-executing')
        return activeBlocks.length > 0 || 
               document.querySelector('.execution-results') !== null
      },
      hints: [
        'Look for a green "Play" or "Run" button in the top control bar',
        'The button might have a triangle (▶) icon',
        'After clicking, watch the blocks light up as they execute',
        'Check the console panel on the right for output results'
      ],
      keyboardShortcuts: ['Ctrl+Enter', 'F5'],
      accessibilityInstructions: 'Navigate to the control bar and find the Run button. Press Enter or Space to execute your workflow.',
      screenReaderText: 'Run your workflow to see the automation in action. Look for the Play or Run button in the control bar.'
    },
    {
      id: 'view-results',
      title: 'View Your Results',
      description: 'See the output of your workflow execution',
      target: '.console-panel, .execution-results',
      content: `
        <div>
          <h3>Check Your Results</h3>
          <p>Great! Your workflow should have executed. Let's check the results:</p>
          <ol>
            <li>Look at the <strong>Console</strong> tab in the right panel</li>
            <li>You should see your message displayed</li>
            <li>Check for any success or completion indicators</li>
          </ol>
          <p>If you see your message, congratulations! You've successfully created and run your first automation workflow.</p>
          <div class="tutorial-success">
            <strong>🎉 Success!</strong> You've mastered the basics of workflow automation!
          </div>
        </div>
      `,
      action: 'highlight',
      validation: () => true, // Always passes as this is a review step
      hints: [
        'Open the Console tab in the right panel to see execution logs',
        'Look for your custom message in the output',
        'Green indicators usually mean successful execution',
        'Red indicators show errors that need attention'
      ],
      accessibilityInstructions: 'Navigate to the Console panel to review your workflow execution results.',
      screenReaderText: 'Review your workflow results in the Console panel. You should see your custom message indicating successful execution.'
    },
    {
      id: 'next-steps',
      title: 'What\'s Next?',
      description: 'Learn about more advanced workflow features',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Congratulations! 🎉</h3>
          <p>You've successfully created and run your first workflow! Here's what you accomplished:</p>
          <ul>
            <li>✅ Added a Starter block to trigger your workflow</li>
            <li>✅ Added a Response block to perform an action</li>
            <li>✅ Connected blocks to create a logical flow</li>
            <li>✅ Configured block settings</li>
            <li>✅ Executed your workflow successfully</li>
          </ul>
          
          <h4>Ready for More?</h4>
          <p>Now that you understand the basics, you can explore:</p>
          <ul>
            <li><strong>More Block Types:</strong> Try API calls, data processing, and integrations</li>
            <li><strong>Conditional Logic:</strong> Add IF/THEN logic to your workflows</li>
            <li><strong>Loops & Iterations:</strong> Process multiple items automatically</li>
            <li><strong>External Integrations:</strong> Connect to databases, APIs, and services</li>
          </ul>
          
          <div class="tutorial-completion">
            <p><strong>Tutorial Complete!</strong> You're now ready to build more complex automations.</p>
          </div>
        </div>
      `,
      action: 'highlight',
      optional: true,
      hints: [
        'Save this workflow as a template for future reference',
        'Explore the block library to see all available automation blocks',
        'Try the guided workflow wizards for common automation patterns',
        'Use the AI Copilot for assistance with more complex workflows'
      ],
      accessibilityInstructions: 'Tutorial completed successfully. Explore additional tutorials and advanced features when ready.',
      screenReaderText: 'Congratulations! You have completed your first workflow tutorial and learned the fundamental concepts of automation.'
    }
  ],
  completionRewards: {
    badges: ['first-workflow', 'automation-basics'],
    unlockFeatures: ['intermediate-tutorials', 'workflow-templates'],
    nextRecommendations: ['conditional-workflow', 'api-integration-basics', 'data-processing-intro']
  },
  metadata: {
    version: '1.0.0',
    created: new Date('2025-09-03'),
    updated: new Date('2025-09-03'),
    author: 'Claude Development System',
    difficulty: 1,
    popularity: 95,
    completionRate: 87
  }
}

/**
 * Conditional Logic Tutorial
 * 
 * Teaches users how to add decision-making to their workflows
 * using condition blocks and branching logic.
 */
export const CONDITIONAL_WORKFLOW_TUTORIAL: Tutorial = {
  id: 'conditional-workflow',
  title: 'Add Logic and Conditions',
  description: 'Learn to create smart workflows that make decisions based on data using conditional logic and branching.',
  category: 'intermediate',
  estimatedDuration: 20,
  prerequisites: ['first-workflow'],
  steps: [
    {
      id: 'intro-conditions',
      title: 'Introduction to Conditional Logic',
      description: 'Understanding IF/THEN logic in workflows',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Making Smart Decisions in Workflows</h3>
          <p>Conditional logic lets your workflows make decisions based on data, just like in real life:</p>
          <ul>
            <li><strong>IF</strong> the temperature is below 32°F, <strong>THEN</strong> send a freeze warning</li>
            <li><strong>IF</strong> an email contains "urgent", <strong>THEN</strong> forward to manager</li>
            <li><strong>IF</strong> inventory is low, <strong>THEN</strong> reorder supplies</li>
          </ul>
          <p>Let's build a workflow that checks data and takes different actions based on what it finds.</p>
        </div>
      `,
      action: 'highlight',
      position: 'center',
      hints: [
        'Conditional logic makes workflows intelligent and responsive',
        'Use IF/THEN patterns to automate decision-making',
        'Conditions can check numbers, text, dates, and more'
      ],
      accessibilityInstructions: 'Learn about conditional logic concepts that make workflows intelligent.',
      screenReaderText: 'Introduction to conditional logic in workflows. Learn to make intelligent automation decisions.'
    },
    {
      id: 'add-data-source',
      title: 'Add a Data Source',
      description: 'Create data that we can evaluate with conditions',
      target: '.block-library',
      content: `
        <div>
          <h3>Start with Data</h3>
          <p>To make decisions, we need data to evaluate. Let's start by adding a <strong>Starter</strong> block and a simple data source.</p>
          <p>We'll create a workflow that checks the current time and takes different actions based on whether it's morning or evening.</p>
          <p>First, add a Starter block, then add a <strong>JavaScript</strong> block to generate some sample data.</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const starterBlocks = document.querySelectorAll('[data-block-type="starter"]')
        const jsBlocks = document.querySelectorAll('[data-block-type="javascript"]')
        return starterBlocks.length > 0 && jsBlocks.length > 0
      },
      hints: [
        'Add a Starter block first to trigger the workflow',
        'Then find and add a JavaScript block for generating data',
        'JavaScript blocks let you create and manipulate data',
        'You can also use other data sources like API calls or databases'
      ],
      accessibilityInstructions: 'Add a Starter block and JavaScript block to create a data source for conditional logic.',
      screenReaderText: 'Add blocks to create sample data that we can evaluate with conditional logic.'
    },
    {
      id: 'configure-data',
      title: 'Configure Your Data Source',
      description: 'Set up the JavaScript block to provide sample data',
      target: '[data-block-type="javascript"]',
      content: `
        <div>
          <h3>Create Sample Data</h3>
          <p>Click on the JavaScript block to configure it. Add this simple code to create data we can test:</p>
          <pre><code>// Get current hour (0-23)
const currentHour = new Date().getHours();

// Return data with hour and time period
return {
  hour: currentHour,
  period: currentHour < 12 ? 'morning' : 'evening',
  message: \`It's currently \${currentHour}:00\`
};</code></pre>
          <p>This code creates data about the current time that we can use in our conditions.</p>
        </div>
      `,
      action: 'click',
      validation: () => {
        const codeInputs = document.querySelectorAll('textarea[data-language="javascript"], .monaco-editor')
        return codeInputs.length > 0
      },
      hints: [
        'Click on the JavaScript block to open its configuration',
        'Paste the provided code into the code editor',
        'The code creates time data we can evaluate',
        'Save your changes when done'
      ],
      accessibilityInstructions: 'Configure the JavaScript block with the provided code to generate time-based data.',
      screenReaderText: 'Configure the JavaScript block to generate sample data for conditional evaluation.'
    },
    {
      id: 'add-condition-block',
      title: 'Add a Condition Block',
      description: 'Add the decision-making block to your workflow',
      target: '.block-library',
      content: `
        <div>
          <h3>Add Decision Logic</h3>
          <p>Now let's add a <strong>Condition</strong> block that will evaluate our time data and make decisions based on it.</p>
          <p>Find the Condition block in the library and drag it onto the canvas after your JavaScript block.</p>
          <div class="tutorial-tip">
            <strong>💡 Tip:</strong> Condition blocks are like traffic lights for your data - they direct the flow based on what they find.
          </div>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const conditionBlocks = document.querySelectorAll('[data-block-type="condition"]')
        return conditionBlocks.length > 0
      },
      hints: [
        'Look for the "Condition" block in the block library',
        'Condition blocks usually have a diamond shape or IF/THEN icon',
        'Drag it onto the canvas after your existing blocks',
        'You might find it under "Logic" or "Control Flow" categories'
      ],
      accessibilityInstructions: 'Find and add a Condition block to implement decision logic in your workflow.',
      screenReaderText: 'Add a Condition block to create decision-making logic in your workflow.'
    },
    {
      id: 'connect-to-condition',
      title: 'Connect to Condition',
      description: 'Connect your data source to the condition block',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Connect Your Data Flow</h3>
          <p>Connect your blocks in sequence:</p>
          <ol>
            <li>Starter → JavaScript (to generate data)</li>
            <li>JavaScript → Condition (to evaluate data)</li>
          </ol>
          <p>This ensures the data flows from generation to evaluation in the correct order.</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const edges = document.querySelectorAll('.react-flow__edge')
        return edges.length >= 2
      },
      hints: [
        'Connect the output of the JavaScript block to the input of the Condition block',
        'You should now have at least two connections in your workflow',
        'The data will flow: Starter → JavaScript → Condition',
        'Make sure all connections are properly established'
      ],
      accessibilityInstructions: 'Connect the JavaScript block output to the Condition block input to create a data flow.',
      screenReaderText: 'Connect your blocks in sequence to create a data flow for conditional evaluation.'
    },
    {
      id: 'configure-condition',
      title: 'Configure the Condition',
      description: 'Set up the condition to check if it\'s morning or evening',
      target: '[data-block-type="condition"]',
      content: `
        <div>
          <h3>Set Up Your Condition</h3>
          <p>Click on the Condition block to configure it. Set up a condition to check the time period:</p>
          <ul>
            <li><strong>Field:</strong> period</li>
            <li><strong>Operator:</strong> equals</li>
            <li><strong>Value:</strong> morning</li>
          </ul>
          <p>This will check if the time period is "morning" and branch accordingly.</p>
        </div>
      `,
      action: 'click',
      validation: () => {
        const conditionInputs = document.querySelectorAll('input[value*="period"], select[value*="equals"]')
        return conditionInputs.length > 0 ||
               document.querySelector('.condition-editor') !== null
      },
      hints: [
        'Click on the Condition block to open its configuration',
        'Look for fields to set the condition logic',
        'Set up: period equals "morning"',
        'This creates a TRUE/FALSE decision point'
      ],
      accessibilityInstructions: 'Configure the condition to check if the period equals morning.',
      screenReaderText: 'Configure the Condition block to evaluate if the current time period is morning.'
    },
    {
      id: 'add-true-action',
      title: 'Add Action for TRUE Path',
      description: 'Add what happens when the condition is true (morning)',
      target: '.workflow-container',
      content: `
        <div>
          <h3>What Happens in the Morning?</h3>
          <p>Add a <strong>Response</strong> block for the TRUE path (when it's morning). Connect it to the TRUE/YES output of the Condition block.</p>
          <p>Configure it to display a morning message like "Good morning! Time to start the day!"</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const responseBlocks = document.querySelectorAll('[data-block-type="response"]')
        const conditionConnections = document.querySelectorAll('.react-flow__edge[data-source*="condition"]')
        return responseBlocks.length >= 1 && conditionConnections.length >= 1
      },
      hints: [
        'Add a Response block for the TRUE/morning case',
        'Connect it to the TRUE output of the Condition block',
        'Look for outputs labeled "true", "yes", or with checkmark icons',
        'Configure the message for morning time'
      ],
      accessibilityInstructions: 'Add and connect a Response block to handle the TRUE condition path.',
      screenReaderText: 'Add a Response block for when the condition is true, representing the morning case.'
    },
    {
      id: 'add-false-action',
      title: 'Add Action for FALSE Path',
      description: 'Add what happens when the condition is false (evening)',
      target: '.workflow-container',
      content: `
        <div>
          <h3>What Happens in the Evening?</h3>
          <p>Add another <strong>Response</strong> block for the FALSE path (when it's evening). Connect it to the FALSE/NO output of the Condition block.</p>
          <p>Configure it to display an evening message like "Good evening! Time to wind down."</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const responseBlocks = document.querySelectorAll('[data-block-type="response"]')
        const conditionConnections = document.querySelectorAll('.react-flow__edge[data-source*="condition"]')
        return responseBlocks.length >= 2 && conditionConnections.length >= 2
      },
      hints: [
        'Add a second Response block for the FALSE/evening case',
        'Connect it to the FALSE output of the Condition block',
        'Look for outputs labeled "false", "no", or with X icons',
        'Configure a different message for evening time'
      ],
      accessibilityInstructions: 'Add and connect a second Response block to handle the FALSE condition path.',
      screenReaderText: 'Add a Response block for when the condition is false, representing the evening case.'
    },
    {
      id: 'test-conditional-workflow',
      title: 'Test Your Conditional Logic',
      description: 'Run the workflow to see conditional branching in action',
      target: '.control-bar',
      content: `
        <div>
          <h3>Test Your Smart Workflow</h3>
          <p>Time to see conditional logic in action! Run your workflow and observe:</p>
          <ul>
            <li>The JavaScript block generates time data</li>
            <li>The Condition block evaluates the time period</li>
            <li>Only ONE path executes based on the current time</li>
            <li>You'll see either the morning OR evening message</li>
          </ul>
          <div class="tutorial-tip">
            <strong>🎯 Smart!</strong> Your workflow now makes intelligent decisions based on data!
          </div>
        </div>
      `,
      action: 'click',
      validation: () => {
        const executionResults = document.querySelectorAll('.execution-results, .console-output')
        return executionResults.length > 0
      },
      hints: [
        'Click the Run button to execute your conditional workflow',
        'Watch which path lights up during execution',
        'Check the console for the appropriate time-based message',
        'Try running it at different times to see different outcomes'
      ],
      keyboardShortcuts: ['Ctrl+Enter'],
      accessibilityInstructions: 'Run the workflow to test your conditional logic implementation.',
      screenReaderText: 'Run your workflow to see how conditional logic creates different execution paths based on data.'
    }
  ],
  completionRewards: {
    badges: ['conditional-logic', 'smart-workflows'],
    unlockFeatures: ['advanced-conditions', 'loop-tutorials'],
    nextRecommendations: ['loop-processing', 'api-integration', 'advanced-conditions']
  },
  metadata: {
    version: '1.0.0',
    created: new Date('2025-09-03'),
    updated: new Date('2025-09-03'),
    author: 'Claude Development System',
    difficulty: 2,
    popularity: 78,
    completionRate: 72
  }
}

/**
 * API Integration Tutorial
 * 
 * Teaches users how to connect workflows to external services
 * and APIs for real-world automation scenarios.
 */
export const API_INTEGRATION_TUTORIAL: Tutorial = {
  id: 'api-integration-basics',
  title: 'Connect to External Services',
  description: 'Learn to integrate your workflows with external APIs and services to create powerful automations that interact with the real world.',
  category: 'intermediate',
  estimatedDuration: 25,
  prerequisites: ['first-workflow'],
  steps: [
    {
      id: 'intro-apis',
      title: 'Understanding API Integrations',
      description: 'Learn what APIs are and how they connect services',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Connecting to the Outside World</h3>
          <p>APIs (Application Programming Interfaces) let your workflows talk to other services:</p>
          <ul>
            <li><strong>Weather APIs:</strong> Get current weather data</li>
            <li><strong>Email APIs:</strong> Send notifications and alerts</li>
            <li><strong>Database APIs:</strong> Store and retrieve information</li>
            <li><strong>Social Media APIs:</strong> Post updates and monitor feeds</li>
          </ul>
          <p>Let's build a workflow that fetches real weather data and sends an alert if needed.</p>
        </div>
      `,
      action: 'highlight',
      hints: [
        'APIs are like bridges between different software systems',
        'They allow automated data exchange and actions',
        'Most web services provide APIs for automation'
      ],
      accessibilityInstructions: 'Learn about API concepts and how they enable service integrations.',
      screenReaderText: 'Introduction to API integrations and how they connect workflows to external services.'
    },
    {
      id: 'add-api-block',
      title: 'Add an API Block',
      description: 'Add a block that can make HTTP requests to external services',
      target: '.block-library',
      content: `
        <div>
          <h3>Connect to an External API</h3>
          <p>Let's start by adding the blocks we need:</p>
          <ol>
            <li>Add a <strong>Starter</strong> block</li>
            <li>Add an <strong>API</strong> or <strong>HTTP</strong> block to make the external request</li>
          </ol>
          <p>The API block will let us fetch real weather data from a weather service.</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const starterBlocks = document.querySelectorAll('[data-block-type="starter"]')
        const apiBlocks = document.querySelectorAll('[data-block-type="api"], [data-block-type="http"]')
        return starterBlocks.length > 0 && apiBlocks.length > 0
      },
      hints: [
        'Look for "API", "HTTP", or "Web Request" blocks',
        'These blocks can communicate with external services',
        'Start with a Starter block as usual',
        'API blocks are usually found in the "Integration" category'
      ],
      accessibilityInstructions: 'Add Starter and API blocks to enable external service communication.',
      screenReaderText: 'Add an API block to enable your workflow to communicate with external services.'
    },
    {
      id: 'configure-weather-api',
      title: 'Configure Weather API Call',
      description: 'Set up the API block to fetch weather data',
      target: '[data-block-type="api"], [data-block-type="http"]',
      content: `
        <div>
          <h3>Set Up Weather Data Fetching</h3>
          <p>Click on the API block and configure it to get weather data:</p>
          <ul>
            <li><strong>Method:</strong> GET</li>
            <li><strong>URL:</strong> https://api.openweathermap.org/data/2.5/weather?q=London&appid=demo&units=metric</li>
            <li><strong>Headers:</strong> Content-Type: application/json</li>
          </ul>
          <p>This will fetch current weather data for London using a demo API key.</p>
          <div class="tutorial-note">
            <strong>Note:</strong> This uses a demo endpoint for learning. In real scenarios, you'd use your own API keys.
          </div>
        </div>
      `,
      action: 'click',
      validation: () => {
        const urlInputs = document.querySelectorAll('input[value*="openweathermap"], input[value*="weather"]')
        return urlInputs.length > 0 ||
               document.querySelector('.api-config-panel') !== null
      },
      hints: [
        'Click on the API block to open its configuration',
        'Set the method to GET (for retrieving data)',
        'Enter the weather API URL exactly as provided',
        'Make sure to save your configuration'
      ],
      accessibilityInstructions: 'Configure the API block with the weather service URL and parameters.',
      screenReaderText: 'Configure the API block to fetch weather data from an external weather service.'
    },
    {
      id: 'add-condition-for-weather',
      title: 'Add Weather Condition Check',
      description: 'Add logic to check if weather requires an alert',
      target: '.block-library',
      content: `
        <div>
          <h3>Check Weather Conditions</h3>
          <p>Add a <strong>Condition</strong> block after the API block to check the weather data.</p>
          <p>We'll set it up to trigger an alert if the temperature is below 5°C (cold weather alert).</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const conditionBlocks = document.querySelectorAll('[data-block-type="condition"]')
        return conditionBlocks.length > 0
      },
      hints: [
        'Add a Condition block after the API block',
        'This will evaluate the temperature from the weather data',
        'Connect the API block output to the Condition block input',
        'We\'ll configure the actual condition in the next step'
      ],
      accessibilityInstructions: 'Add a Condition block to evaluate the weather data returned by the API.',
      screenReaderText: 'Add a Condition block to check if weather conditions require an alert.'
    },
    {
      id: 'configure-weather-condition',
      title: 'Configure Temperature Check',
      description: 'Set up the condition to check for cold weather',
      target: '[data-block-type="condition"]',
      content: `
        <div>
          <h3>Set Temperature Alert Threshold</h3>
          <p>Configure the Condition block to check for cold weather:</p>
          <ul>
            <li><strong>Field:</strong> main.temp (temperature from API response)</li>
            <li><strong>Operator:</strong> less than</li>
            <li><strong>Value:</strong> 5</li>
          </ul>
          <p>This will trigger when the temperature is below 5°C.</p>
        </div>
      `,
      action: 'click',
      validation: () => {
        const tempInputs = document.querySelectorAll('input[value*="temp"], input[value="5"]')
        return tempInputs.length > 0 ||
               document.querySelector('.condition-config') !== null
      },
      hints: [
        'Click on the Condition block to configure it',
        'Use "main.temp" to access the temperature from the API response',
        'Set the operator to "less than" and value to 5',
        'This checks if temperature is below 5 degrees Celsius'
      ],
      accessibilityInstructions: 'Configure the condition to check if temperature is below 5 degrees.',
      screenReaderText: 'Configure the Condition block to check for cold weather requiring an alert.'
    },
    {
      id: 'add-alert-response',
      title: 'Add Cold Weather Alert',
      description: 'Add a response for cold weather conditions',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Create Cold Weather Alert</h3>
          <p>Add a <strong>Response</strong> block connected to the TRUE output of the Condition block.</p>
          <p>Configure it to display: "❄️ Cold Weather Alert: Temperature is below 5°C. Dress warmly!"</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const responseBlocks = document.querySelectorAll('[data-block-type="response"]')
        const conditionEdges = document.querySelectorAll('.react-flow__edge[data-source*="condition"]')
        return responseBlocks.length >= 1 && conditionEdges.length >= 1
      },
      hints: [
        'Add a Response block for the cold weather alert',
        'Connect it to the TRUE output of the Condition block',
        'Configure an appropriate cold weather message',
        'Use emojis or clear text to make the alert noticeable'
      ],
      accessibilityInstructions: 'Add a Response block connected to the TRUE condition path for cold weather alerts.',
      screenReaderText: 'Add an alert response for when cold weather conditions are detected.'
    },
    {
      id: 'add-normal-response',
      title: 'Add Normal Weather Response',
      description: 'Add a response for normal weather conditions',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Handle Normal Weather</h3>
          <p>Add another <strong>Response</strong> block connected to the FALSE output of the Condition block.</p>
          <p>Configure it to display: "☀️ Weather looks fine! Current temperature is comfortable."</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const responseBlocks = document.querySelectorAll('[data-block-type="response"]')
        return responseBlocks.length >= 2
      },
      hints: [
        'Add a second Response block for normal weather',
        'Connect it to the FALSE output of the Condition block',
        'This handles when temperature is NOT below 5°C',
        'Configure a positive message for normal weather'
      ],
      accessibilityInstructions: 'Add a second Response block for normal weather conditions.',
      screenReaderText: 'Add a response for normal weather when no alert is needed.'
    },
    {
      id: 'test-api-workflow',
      title: 'Test Your API Integration',
      description: 'Run the workflow to see real API data in action',
      target: '.control-bar',
      content: `
        <div>
          <h3>Test Real-World Integration</h3>
          <p>Run your workflow to see API integration in action:</p>
          <ol>
            <li>The API block fetches real weather data from London</li>
            <li>The Condition block evaluates the temperature</li>
            <li>The appropriate Response block executes</li>
            <li>You see either a cold weather alert or normal weather message</li>
          </ol>
          <div class="tutorial-success">
            <strong>🌟 Amazing!</strong> You're now connecting to external services!
          </div>
        </div>
      `,
      action: 'click',
      validation: () => {
        const executionResults = document.querySelectorAll('.execution-results, .console-output')
        const apiResponses = document.querySelectorAll('.api-response, .http-response')
        return executionResults.length > 0 || apiResponses.length > 0
      },
      hints: [
        'Click Run to execute your API integration workflow',
        'Watch for the API call to complete first',
        'Check the console for the actual weather data received',
        'See which condition path executes based on real temperature'
      ],
      keyboardShortcuts: ['Ctrl+Enter'],
      accessibilityInstructions: 'Run the workflow to test your API integration with real weather data.',
      screenReaderText: 'Test your API integration workflow to see how it processes real external data.'
    }
  ],
  completionRewards: {
    badges: ['api-integration', 'external-services'],
    unlockFeatures: ['advanced-integrations', 'authentication-tutorials'],
    nextRecommendations: ['database-integration', 'webhook-handling', 'authentication-flows']
  },
  metadata: {
    version: '1.0.0',
    created: new Date('2025-09-03'),
    updated: new Date('2025-09-03'),
    author: 'Claude Development System',
    difficulty: 3,
    popularity: 85,
    completionRate: 68
  }
}

/**
 * Loop Processing Tutorial
 * 
 * Teaches users how to process multiple items efficiently
 * using loop blocks and batch operations.
 */
export const LOOP_PROCESSING_TUTORIAL: Tutorial = {
  id: 'loop-processing',
  title: 'Process Multiple Items with Loops',
  description: 'Learn to handle lists of data efficiently using loop blocks to process multiple items automatically.',
  category: 'intermediate',
  estimatedDuration: 18,
  prerequisites: ['first-workflow', 'conditional-workflow'],
  steps: [
    {
      id: 'intro-loops',
      title: 'Understanding Loops in Automation',
      description: 'Learn when and how to use loops for batch processing',
      target: '.workflow-container',
      content: `
        <div>
          <h3>Processing Multiple Items Automatically</h3>
          <p>Loops let you repeat actions for multiple items, like:</p>
          <ul>
            <li><strong>Email Processing:</strong> Send personalized emails to a list of customers</li>
            <li><strong>Data Validation:</strong> Check each record in a database for errors</li>
            <li><strong>File Processing:</strong> Resize multiple images in a folder</li>
            <li><strong>Report Generation:</strong> Create summaries for multiple departments</li>
          </ul>
          <p>Let's build a workflow that processes a list of customer orders.</p>
        </div>
      `,
      action: 'highlight',
      hints: [
        'Loops are perfect for repetitive tasks with multiple items',
        'They save time by automating batch operations',
        'Each iteration of the loop processes one item from the list'
      ],
      accessibilityInstructions: 'Learn about loop concepts for processing multiple data items.',
      screenReaderText: 'Introduction to loops for batch processing of multiple items in workflows.'
    },
    {
      id: 'create-sample-data',
      title: 'Create Sample Data List',
      description: 'Generate a list of items to process',
      target: '.block-library',
      content: `
        <div>
          <h3>Prepare Data for Processing</h3>
          <p>First, let's create sample data to work with:</p>
          <ol>
            <li>Add a <strong>Starter</strong> block</li>
            <li>Add a <strong>JavaScript</strong> block to create a list of customer orders</li>
          </ol>
          <p>We'll create mock order data that we can then process with a loop.</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const starterBlocks = document.querySelectorAll('[data-block-type="starter"]')
        const jsBlocks = document.querySelectorAll('[data-block-type="javascript"]')
        return starterBlocks.length > 0 && jsBlocks.length > 0
      },
      hints: [
        'Start with a Starter block as usual',
        'Add a JavaScript block to generate sample data',
        'The JavaScript block will create an array of items to process',
        'Connect the Starter to the JavaScript block'
      ],
      accessibilityInstructions: 'Add blocks to create sample data for loop processing demonstration.',
      screenReaderText: 'Add blocks to create sample data that we can process with loops.'
    },
    {
      id: 'configure-data-list',
      title: 'Configure the Data List',
      description: 'Set up the JavaScript block to create sample orders',
      target: '[data-block-type="javascript"]',
      content: `
        <div>
          <h3>Create Order Data</h3>
          <p>Click on the JavaScript block and add this code to create sample orders:</p>
          <pre><code>// Sample customer orders
const orders = [
  { id: 1001, customer: "Alice Johnson", amount: 150.50, status: "pending" },
  { id: 1002, customer: "Bob Smith", amount: 89.99, status: "pending" },
  { id: 1003, customer: "Carol Davis", amount: 245.00, status: "pending" },
  { id: 1004, customer: "David Wilson", amount: 67.25, status: "pending" }
];

return { orders };</code></pre>
          <p>This creates a list of orders that we can process individually.</p>
        </div>
      `,
      action: 'click',
      validation: () => {
        const codeEditors = document.querySelectorAll('textarea[data-language="javascript"], .monaco-editor')
        return codeEditors.length > 0
      },
      hints: [
        'Click on the JavaScript block to open the code editor',
        'Paste the provided code to create sample order data',
        'The code creates an array of order objects',
        'Each order has id, customer, amount, and status fields'
      ],
      accessibilityInstructions: 'Configure the JavaScript block with sample order data for processing.',
      screenReaderText: 'Configure sample order data that will be processed by the loop.'
    },
    {
      id: 'add-loop-block',
      title: 'Add a Loop Block',
      description: 'Add the loop container to process each order',
      target: '.block-library',
      content: `
        <div>
          <h3>Add Loop Processing</h3>
          <p>Now add a <strong>Loop</strong> block (also called "For Each" or "Iterate") to process each order individually.</p>
          <p>The Loop block will take your list of orders and run the same actions for each one.</p>
          <div class="tutorial-tip">
            <strong>💡 Tip:</strong> Loop blocks are containers - you'll add other blocks inside them to define what happens for each item.
          </div>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const loopBlocks = document.querySelectorAll('[data-block-type="loop"], [data-subflow-type="loop"]')
        return loopBlocks.length > 0
      },
      hints: [
        'Look for "Loop", "For Each", or "Iterate" blocks',
        'Loop blocks are often larger containers that hold other blocks',
        'They might be in the "Control Flow" or "Logic" category',
        'Drag it onto the canvas after your JavaScript block'
      ],
      accessibilityInstructions: 'Add a Loop block to create a container for processing each data item.',
      screenReaderText: 'Add a Loop block that will process each order from your data list.'
    },
    {
      id: 'configure-loop-source',
      title: 'Configure Loop Data Source',
      description: 'Tell the loop what data to iterate over',
      target: '[data-block-type="loop"]',
      content: `
        <div>
          <h3>Connect Loop to Data</h3>
          <p>Configure the Loop block to process the orders:</p>
          <ul>
            <li>Connect the JavaScript block output to the Loop block input</li>
            <li>In the Loop configuration, set the iteration source to "orders"</li>
          </ul>
          <p>This tells the loop to process each item in the orders array.</p>
        </div>
      `,
      action: 'click',
      validation: () => {
        const loopConnections = document.querySelectorAll('.react-flow__edge[data-target*="loop"]')
        return loopConnections.length > 0 ||
               document.querySelector('.loop-config-panel') !== null
      },
      hints: [
        'Connect the JavaScript block to the Loop block first',
        'Click on the Loop block to configure it',
        'Set the data source to iterate over the "orders" array',
        'The loop will run once for each order in the list'
      ],
      accessibilityInstructions: 'Connect the data source to the Loop block and configure the iteration.',
      screenReaderText: 'Connect your data source to the Loop block and configure it to process each order.'
    },
    {
      id: 'add-processing-logic',
      title: 'Add Processing Logic Inside Loop',
      description: 'Add blocks inside the loop to process each order',
      target: '.loop-container, [data-block-type="loop"]',
      content: `
        <div>
          <h3>Define What Happens for Each Order</h3>
          <p>Now add blocks INSIDE the loop container to define what happens for each order:</p>
          <ol>
            <li>Add a <strong>Condition</strong> block inside the loop</li>
            <li>Add <strong>Response</strong> blocks for different outcomes</li>
          </ol>
          <p>We'll check if the order amount is over $100 and send different notifications.</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const conditionsInLoop = document.querySelectorAll('[data-parent-id*="loop"] [data-block-type="condition"]')
        return conditionsInLoop.length > 0
      },
      hints: [
        'Drag blocks INTO the loop container (they should appear inside)',
        'Add a Condition block first to check order amounts',
        'The blocks inside will run for each order',
        'Look for visual indicators that blocks are inside the loop'
      ],
      accessibilityInstructions: 'Add processing blocks inside the loop container to define per-item actions.',
      screenReaderText: 'Add blocks inside the loop to define what processing happens for each order.'
    },
    {
      id: 'configure-order-condition',
      title: 'Configure Order Amount Check',
      description: 'Set up condition to check high-value orders',
      target: '[data-block-type="condition"]',
      content: `
        <div>
          <h3>Check Order Values</h3>
          <p>Configure the Condition block inside the loop to check for high-value orders:</p>
          <ul>
            <li><strong>Field:</strong> amount (this refers to the current order's amount)</li>
            <li><strong>Operator:</strong> greater than</li>
            <li><strong>Value:</strong> 100</li>
          </ul>
          <p>This will identify orders over $100 for special handling.</p>
        </div>
      `,
      action: 'click',
      validation: () => {
        const amountInputs = document.querySelectorAll('input[value*="amount"], input[value="100"]')
        return amountInputs.length > 0
      },
      hints: [
        'Click on the Condition block inside the loop',
        'Use "amount" to check the current order\'s amount',
        'Set it to check if amount is greater than 100',
        'Each loop iteration will check the current order\'s amount'
      ],
      accessibilityInstructions: 'Configure the condition to check if order amount exceeds $100.',
      screenReaderText: 'Configure the condition to identify high-value orders over $100.'
    },
    {
      id: 'add-high-value-response',
      title: 'Add High-Value Order Response',
      description: 'Add response for orders over $100',
      target: '.loop-container',
      content: `
        <div>
          <h3>Handle High-Value Orders</h3>
          <p>Add a Response block inside the loop, connected to the TRUE output of the Condition:</p>
          <p>Configure it to display: "🎉 High-value order from [customer]: $[amount] - Priority processing!"</p>
          <p>Use variables like {{customer}} and {{amount}} to include order details.</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const responsesInLoop = document.querySelectorAll('[data-parent-id*="loop"] [data-block-type="response"]')
        return responsesInLoop.length >= 1
      },
      hints: [
        'Add a Response block inside the loop, not outside',
        'Connect it to the TRUE path of the condition',
        'Use template variables to include order details',
        'This will run for each high-value order found'
      ],
      accessibilityInstructions: 'Add a Response block inside the loop for high-value order processing.',
      screenReaderText: 'Add a response for processing high-value orders over $100.'
    },
    {
      id: 'add-standard-response',
      title: 'Add Standard Order Response',
      description: 'Add response for regular orders',
      target: '.loop-container',
      content: `
        <div>
          <h3>Handle Standard Orders</h3>
          <p>Add another Response block connected to the FALSE output of the Condition:</p>
          <p>Configure it to display: "✅ Standard order from [customer]: $[amount] - Regular processing"</p>
        </div>
      `,
      action: 'drag',
      validation: () => {
        const responsesInLoop = document.querySelectorAll('[data-parent-id*="loop"] [data-block-type="response"]')
        return responsesInLoop.length >= 2
      },
      hints: [
        'Add another Response block inside the loop',
        'Connect it to the FALSE path of the condition',
        'This handles orders $100 and under',
        'Each order will trigger one of the two responses'
      ],
      accessibilityInstructions: 'Add a second response inside the loop for standard orders.',
      screenReaderText: 'Add a response for processing standard orders under $100.'
    },
    {
      id: 'test-loop-processing',
      title: 'Test Batch Processing',
      description: 'Run the workflow to see loop processing in action',
      target: '.control-bar',
      content: `
        <div>
          <h3>See Batch Processing in Action</h3>
          <p>Run your workflow to see how loops process multiple items:</p>
          <ol>
            <li>The JavaScript block creates the order list</li>
            <li>The Loop block processes each order individually</li>
            <li>For each order, the condition checks the amount</li>
            <li>You'll see 4 different responses (one for each order)</li>
          </ol>
          <div class="tutorial-success">
            <strong>🚀 Powerful!</strong> You're now automating batch processing!
          </div>
        </div>
      `,
      action: 'click',
      validation: () => {
        const loopResults = document.querySelectorAll('.loop-iteration-result, .batch-processing-result')
        const consoleOutputs = document.querySelectorAll('.console-output')
        return loopResults.length > 0 || consoleOutputs.length > 0
      },
      hints: [
        'Click Run to see batch processing in action',
        'Watch the loop execute multiple times',
        'Check the console for all 4 order processing results',
        'Notice how each order is handled individually'
      ],
      keyboardShortcuts: ['Ctrl+Enter'],
      accessibilityInstructions: 'Run the workflow to test batch processing of multiple orders.',
      screenReaderText: 'Test your loop processing workflow to see how it handles multiple orders automatically.'
    }
  ],
  completionRewards: {
    badges: ['batch-processing', 'loop-master'],
    unlockFeatures: ['advanced-loops', 'parallel-processing'],
    nextRecommendations: ['parallel-processing', 'advanced-conditions', 'data-transformation']
  },
  metadata: {
    version: '1.0.0',
    created: new Date('2025-09-03'),
    updated: new Date('2025-09-03'),
    author: 'Claude Development System',
    difficulty: 3,
    popularity: 74,
    completionRate: 65
  }
}

/**
 * Export all tutorial definitions
 */
export const TUTORIAL_DEFINITIONS = {
  [FIRST_WORKFLOW_TUTORIAL.id]: FIRST_WORKFLOW_TUTORIAL,
  [CONDITIONAL_WORKFLOW_TUTORIAL.id]: CONDITIONAL_WORKFLOW_TUTORIAL,
  [API_INTEGRATION_TUTORIAL.id]: API_INTEGRATION_TUTORIAL,
  [LOOP_PROCESSING_TUTORIAL.id]: LOOP_PROCESSING_TUTORIAL
} as const

/**
 * Get tutorial by ID with type safety
 */
export function getTutorial(id: keyof typeof TUTORIAL_DEFINITIONS): Tutorial {
  return TUTORIAL_DEFINITIONS[id]
}

/**
 * Get all available tutorials
 */
export function getAllTutorials(): Tutorial[] {
  return Object.values(TUTORIAL_DEFINITIONS)
}

/**
 * Get tutorials by category
 */
export function getTutorialsByCategory(category: Tutorial['category']): Tutorial[] {
  return getAllTutorials().filter(tutorial => tutorial.category === category)
}

/**
 * Get beginner tutorials (no prerequisites)
 */
export function getBeginnerTutorials(): Tutorial[] {
  return getAllTutorials().filter(tutorial => !tutorial.prerequisites || tutorial.prerequisites.length === 0)
}

/**
 * Get recommended next tutorials based on completed tutorials
 */
export function getRecommendedTutorials(completedTutorialIds: string[]): Tutorial[] {
  const completed = new Set(completedTutorialIds)
  
  return getAllTutorials().filter(tutorial => {
    // Skip already completed tutorials
    if (completed.has(tutorial.id)) return false
    
    // Check if prerequisites are met
    if (tutorial.prerequisites) {
      return tutorial.prerequisites.every(prereq => completed.has(prereq))
    }
    
    return true
  })
}

export default TUTORIAL_DEFINITIONS