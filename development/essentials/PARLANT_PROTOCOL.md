### **Introduction: What is Parlant?**

[cite\_start]Parlant is an open-source **Agentic Behavior Modeling (ABM) Engine** designed for creating sophisticated, customer-facing LLM agents[cite: 245, 293]. [cite\_start]It solves the critical challenge of making LLM agents conform to specific business rules and interaction patterns, which is often difficult to achieve with simple prompt engineering[cite: 247, 248].

[cite\_start]The core philosophy of Parlant is to separate the *what* (business logic in code) from the *how* (conversational behavior in natural language)[cite: 663, 717]. [cite\_start]This allows you to build agents that are both highly adaptable to user interactions and reliably aligned with your business requirements[cite: 241, 243].

-----

### \#\# ⚙️ Chapter 1: Getting Started

This section will guide you through installing Parlant and creating your first agent.

#### **1. Installation**

[cite\_start]First, ensure you have **Python 3.10 or higher**[cite: 301]. You can install Parlant from PyPI:

```bash
pip install parlant
```

[cite\_start]Parlant uses OpenAI by default, so you'll need to set your API key as an environment variable[cite: 308]:

```bash
export OPENAI_API_KEY="<YOUR_API_KEY>"
```

[cite\_start]Parlant also supports other LLM providers like Anthropic and Cerebras, which can be configured during server setup[cite: 309, 311, 313].

#### **2. Creating Your First Agent**

[cite\_start]Create a file named `main.py` and add the following code to initialize a server and create a basic agent[cite: 303]:

```python
# main.py
import asyncio
import parlant.sdk as p

async def main():
  # The 'async with' block starts and stops the server cleanly
  async with p.Server() as server:
    # Create an agent with a name and a general description
    agent = await server.create_agent(
        name="Otto Carmen",
        description="You are a helpful assistant working at a car dealership.",
    )
    print(f"Agent '{agent.name}' created with ID: {agent.id}")

if __name__ == "__main__":
    asyncio.run(main())
```

Run the program from your terminal:

```bash
python main.py
```

#### **3. Creating Your First Guideline**

[cite\_start]**Guidelines** are the fundamental building blocks of behavior in Parlant[cite: 250]. [cite\_start]They are simple, granular rules that nudge the agent's behavior in specific situations[cite: 251, 888]. [cite\_start]Each guideline consists of a **condition** (when it applies) and an **action** (what to do)[cite: 899].

[cite\_start]Let's add a guideline to your agent[cite: 318]:

```python
# main.py (updated)
import asyncio
import parlant.sdk as p

async def main():
  async with p.Server() as server:
    agent = await server.create_agent(
        name="Otto Carmen",
        description="You are a helpful assistant working at a car dealership.",
    )

    # Add a guideline to the agent
    await agent.create_guideline(
        # This is when the guideline will be triggered
        condition="the customer greets you",
        # This is what the guideline instructs the agent to do
        action="offer a refreshing drink",
    )
    print(f"Agent '{agent.name}' created and configured.")


if __name__ == "__main__":
    asyncio.run(main())
```

#### **4. Testing Your Agent**

[cite\_start]With the server running, open your web browser and navigate to **`http://localhost:8800`**[cite: 122, 314]. You can use this simple interface to start a session and chat with your agent. [cite\_start]Greet your agent, and it should offer you a drink\![cite: 319].

-----

### \#\# 🧠 Chapter 2: Core Concepts of Behavior Modeling

Here are the primary components you'll use to define your agent's behavior.

#### **1. Sessions and Events**

Parlant's interaction model is designed to mimic real conversations. [cite\_start]Instead of a rigid request-reply cycle, it uses an **event-driven, asynchronous timeline**[cite: 7, 18, 967].

  * [cite\_start]A **Session** represents a continuous conversation between a customer and an agent[cite: 1]. [cite\_start]It encapsulates every interaction, including messages, status updates, and tool results[cite: 3].
  * [cite\_start]Everything that happens in a session is an **Event**, ordered by an "offset" number starting from 0[cite: 19, 55, 56].
  * [cite\_start]This model allows customers to send multiple messages before an agent replies, and allows the agent to send follow-up messages proactively, just like a real person[cite: 8, 9, 963, 965].

#### **2. Guidelines**

As you saw, guidelines are the primary way to control agent behavior. [cite\_start]You can add as many as you need without worrying about context limits, as Parlant’s **Guideline Matcher** intelligently selects only the most relevant ones for any given situation[cite: 252, 317, 917].

#### **3. Tools & APIs**

[cite\_start]Tools are Python functions that allow your agent to interact with external systems, databases, or APIs[cite: 296, 86]. [cite\_start]In Parlant, tools are always associated with guidelines, which provides a clear "chain of intent"—the agent only considers using a tool when a specific guideline's condition is met[cite: 660, 661, 906].

Here is the basic structure of a tool:

```python
import parlant.sdk as p

# The @p.tool decorator registers the function as a tool
@p.tool
async def get_account_balance(context: p.ToolContext, account_id: str) -> p.ToolResult:
  """Fetches the current balance for a given customer account."""
  
  # Simulate fetching data from an external API or database
  balance = 1234.50
  
  # The ToolResult object encapsulates the output
  return p.ToolResult(data={"balance": balance})

# To use the tool, attach it to a guideline
await agent.create_guideline(
    condition="The customer asks for their account balance",
    action="Look up their account balance and inform them.",
    tools=[get_account_balance]
)
```

[cite\_start]The `ToolContext` object provides contextual information like `session_id` and `customer_id`[cite: 726, 727, 728].

#### **4. Journeys**

[cite\_start]For more complex, multi-step processes like booking an appointment or troubleshooting an issue, you should use **Journeys**[cite: 294, 485, 786]. [cite\_start]A journey is a state diagram that guides the agent through a conversational flow[cite: 790, 805].

[cite\_start]Unlike rigid flowcharts, journeys in Parlant are flexible[cite: 792, 796]. [cite\_start]The agent strives to follow the path but can adapt to the user's interaction style, skip steps, or revisit previous ones if needed[cite: 795, 797].

[cite\_start]Here's a snippet from the healthcare agent example, showing how states and transitions are defined[cite: 109, 110]:

```python
async def create_scheduling_journey(server: p.Server, agent: p.Agent) -> p.Journey:
  journey = await agent.create_journey(
    title="Schedule an Appointment",
    description="Helps the patient find a time for their appointment.",
    conditions=["The patient wants to schedule an appointment"],
  )

  # Initial state transitions to a chat state
  t0 = await journey.initial_state.transition_to(chat_state="Determine the reason for the visit")

  # Next state is a tool state to fetch data
  t1 = await t0.target.transition_to(tool_state=get_upcoming_slots)
  
  # Next state asks the user a question
  t2 = await t1.target.transition_to(chat_state="List available times and ask which works for them")

  # Conditional transition for the "happy path"
  t3 = await t2.target.transition_to(
    chat_state="Confirm the details with the patient before scheduling",
    condition="The patient picks a time",
  )
  
  # ... and so on
  return journey
```

-----

### \#\# 🖥️ Chapter 3: Building a Frontend

You have two main options for building a user interface that connects to your Parlant server.

#### **Option 1: Use the Official React Widget (Easiest)**

[cite\_start]If your frontend is built with React, the quickest way to get started is with the `parlant-chat-react` widget[cite: 29, 320, 558].

**Installation:**

```bash
npm install parlant-chat-react
```

**Usage:**

```jsx
import React from 'react';
import ParlantChatbox from 'parlant-chat-react';

function App() {
  return (
    <div>
      <h1>My Application</h1>
      <ParlantChatbox
        server="http://localhost:8800" // Your Parlant server URL
        agentId="your-agent-id"       // The ID of the agent to chat with
      />
    </div>
  );
}

export default App;
```

[cite\_start]The widget is highly customizable with CSS classes and custom component replacements[cite: 562, 563].

#### **Option 2: Build a Custom Frontend with Client SDKs**

[cite\_start]For full control or non-React projects, you can use the official client SDKs for Python or TypeScript/JavaScript[cite: 28, 33, 324]. The core interaction pattern involves:

1.  [cite\_start]**Initializing a Client:** Connect to your Parlant server[cite: 36, 569].
2.  [cite\_start]**Creating a Session:** Start a new conversation with an agent[cite: 40, 571].
3.  [cite\_start]**Sending Customer Messages:** Use `client.sessions.create_event` to send user input[cite: 41, 574].
4.  **Receiving Agent Events:** Use `client.sessions.list_events` in a continuous loop with a `wait_for_data` parameter. [cite\_start]This is a **long-polling** mechanism that efficiently waits for new events (like agent messages or status updates) to arrive[cite: 46, 47, 578, 981]. [cite\_start]Your UI should *only* display events that it receives from this endpoint to ensure it is synchronized with the server[cite: 380, 616].

-----

### \#\# 📚 Chapter 4: Enhancing Agent Knowledge and Control

These features allow you to make your agent smarter and more reliable.

#### **1. Glossary**

[cite\_start]The **Glossary** is your agent's domain-specific dictionary[cite: 765, 766]. [cite\_start]It helps the agent understand unique business terminology and interpret your guidelines correctly[cite: 767, 771]. For example:

```python
await agent.create_term(
    name="Ocean View",
    description="Our premium rooms on floors 15-20 facing the Atlantic",
    synonyms=["seaside rooms", "beach view"],
)
```

#### **2. Retrievers (RAG)**

[cite\_start]**Retrievers** are functions used for **Retrieval-Augmented Generation (RAG)**[cite: 941, 942]. [cite\_start]They fetch contextual information to ground the agent's knowledge before it generates a response[cite: 941]. [cite\_start]This is ideal for answering questions from a knowledge base or fetching relevant documents based on the conversation[cite: 943]. [cite\_start]Unlike tools, retrievers are executed in parallel with other tasks, reducing response latency[cite: 944].

#### **3. Canned Responses**

[cite\_start]For situations requiring absolute control over the agent's output, use **Canned Responses**[cite: 1027]. [cite\_start]This feature eliminates hallucinations and ensures brand consistency by forcing the agent to select its response from a pre-approved list of templates[cite: 298, 1028, 1029].

You can set the agent's `composition_mode` to:

  * [cite\_start]**`FLUID`**: The agent prefers canned responses but can generate its own if no good match is found[cite: 1041].
  * **`STRICT`**: The agent can *only* use responses from your list. [cite\_start]This is ideal for high-risk or compliance-heavy use cases[cite: 1042, 1043].

[cite\_start]Templates can contain dynamic fields for personalization[cite: 1055]:

```python
await agent.create_canned_response(
    template="Hi {{std.customer.name}}, I can help with that."
)
```

#### **4. Variables**

[cite\_start]**Variables** allow your agent to be aware of customer-specific information, enabling deep personalization[cite: 859, 860]. [cite\_start]A variable might track a customer's subscription plan, company size, or purchase history[cite: 862]. [cite\_start]Values can be set manually or dynamically updated by a tool[cite: 871, 872].

-----

### \#\# 🚀 Chapter 5: Advanced Topics & Production Readiness

#### **1. Human Handoff**

[cite\_start]Parlant has built-in support for seamless human handoff[cite: 369]. You can create a tool that sets a session's mode to `"manual"`. [cite\_start]This stops the AI agent from automatically responding, allowing a human operator to take over the conversation using the client SDKs or REST API[cite: 372, 373].

#### **2. API Hardening**

For production, you must secure your API. [cite\_start]Parlant provides a robust authorization and rate-limiting system[cite: 328]. [cite\_start]You can implement a custom `AuthorizationPolicy` to integrate with your existing authentication system (e.g., JWT) and define fine-grained permissions and rate limits for different operations or user tiers[cite: 330, 336, 338].

#### **3. Session Persistence**

[cite\_start]By default, sessions are stored in memory and are lost on restart[cite: 13]. For production, you must persist them. [cite\_start]Parlant offers built-in support for local JSON file storage (`session_store="local"`) and MongoDB (`session_store="mongodb://..."`)[cite: 15, 16].

#### **4. Extending the Engine**

[cite\_start]Parlant is designed to be extensible without modifying the source code, following the Open/Closed Principle[cite: 524, 525]. You can use:

  * [cite\_start]**Engine Hooks**: Register functions to run at specific points in the response generation cycle[cite: 529, 530].
  * [cite\_start]**Dependency Injection**: Provide your own implementation for core components, such as a custom `NLPService` to integrate a different language model[cite: 535, 208].

### \#\# 📜 Conclusion: The Agentic Design Methodology

[cite\_start]Building with Parlant requires a shift in mindset from traditional development[cite: 438]. [cite\_start]You are not writing deterministic code; you are guiding a probabilistic system[cite: 442, 443]. Success depends on mastering the art of **Agentic Behavior Modeling**:

  * **Be Specific:** Vague instructions lead to unpredictable behavior. [cite\_start]Instead of "Make the customer feel better," write "Acknowledge their frustration specifically, express empathy, and ask for details."[cite: 454, 931].
  * [cite\_start]**Iterate:** You cannot specify all behavior upfront[cite: 466]. [cite\_start]Deploy your agent, monitor its interactions, identify where it deviates, and add or refine guidelines to correct its behavior in a targeted way[cite: 467, 472, 476].
  * [cite\_start]**Separate Logic from Behavior:** Keep complex business logic inside **Tools** (code) and use **Guidelines** and **Journeys** to define the conversational interaction (natural language)[cite: 717, 718].

[cite\_start]Parlant provides the framework to *enforce* your instructions reliably at scale; your role as a developer is to learn the art of articulating those instructions clearly and effectively[cite: 511, 515, 516].