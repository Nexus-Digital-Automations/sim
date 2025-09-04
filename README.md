<p align="center">
  <a href="https://sim.ai" target="_blank" rel="noopener noreferrer">
    <img src="apps/sim/public/logo/reverse/text/large.png" alt="Sim Logo" width="500"/>
  </a>
</p>

<p align="center">Build and deploy AI agent workflows in minutes.</p>

<p align="center">
  <a href="https://sim.ai" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/sim.ai-6F3DFA" alt="Sim.ai"></a>
  <a href="https://discord.gg/Hr4UWYEcTT" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/simdotai" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/twitter/follow/simstudioai?style=social" alt="Twitter"></a>
  <a href="https://docs.sim.ai" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Docs-6F3DFA.svg" alt="Documentation"></a>
</p>

<p align="center">
  <img src="apps/sim/public/static/demo.gif" alt="Sim Demo" width="800"/>
</p>

## Quickstart

### Local Self-hosted Setup

This is a locally hosted AI workflow automation platform. No cloud dependencies required.

```bash
# Clone the repository
git clone https://github.com/simstudioai/sim.git

# Navigate to the project directory
cd sim

# Start Sim with Docker Compose (Local setup)
docker compose -f docker-compose.local.yml up -d
```

Access the application at [http://localhost:3000/](http://localhost:3000/)

#### Using Local Models with Ollama

Run Sim with local AI models using [Ollama](https://ollama.ai) - no external APIs required:

```bash
# Start with GPU support (automatically downloads gemma3:4b model)
docker compose -f docker-compose.ollama.yml --profile setup up -d

# For CPU-only systems:
docker compose -f docker-compose.ollama.yml --profile cpu --profile setup up -d
```

Wait for the model to download, then visit [http://localhost:3000](http://localhost:3000). Add more models with:
```bash
docker compose -f docker-compose.ollama.yml exec ollama ollama pull llama3.1:8b
```

### Self-hosted: Dev Containers

1. Open VS Code with the [Remote - Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open the project and click "Reopen in Container" when prompted
3. Run `bun run dev:full` in the terminal or use the `sim-start` alias
   - This starts both the main application and the realtime socket server

### Self-hosted: Manual Setup

**Requirements:**
- [Bun](https://bun.sh/) runtime
- PostgreSQL 12+ with [pgvector extension](https://github.com/pgvector/pgvector) (required for AI embeddings)

**Note:** Sim uses vector embeddings for AI features like knowledge bases and semantic search, which requires the `pgvector` PostgreSQL extension.

1. Clone and install dependencies:

```bash
git clone https://github.com/simstudioai/sim.git
cd sim
bun install
```

2. Set up PostgreSQL with pgvector:

You need PostgreSQL with the `vector` extension for embedding support. Choose one option:

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL with pgvector extension
docker run --name simstudio-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=simstudio \
  -p 5432:5432 -d \
  pgvector/pgvector:pg17
```

**Option B: Manual Installation**
- Install PostgreSQL 12+ and the pgvector extension
- See [pgvector installation guide](https://github.com/pgvector/pgvector#installation)

3. Set up environment:

```bash
cd apps/sim
cp .env.example .env  # Configure with required variables (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL)
```

Update your `.env` file with the database URL:
```bash
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/simstudio"
```

4. Set up the database:

```bash
bunx drizzle-kit migrate 
```

5. Start the development servers:

**Recommended approach - run both servers together (from project root):**

```bash
bun run dev:full
```

This starts both the main Next.js application and the realtime socket server required for full functionality.

**Alternative - run servers separately:**

Next.js app (from project root):
```bash
bun run dev
```

Realtime socket server (from `apps/sim` directory in a separate terminal):
```bash
cd apps/sim
bun run dev:sockets
```

## Copilot API Keys

Copilot is a Sim-managed service. To use Copilot on a self-hosted instance:

- Go to https://sim.ai → Settings → Copilot and generate a Copilot API key
- Set `COPILOT_API_KEY` in your self-hosted environment to that value

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Runtime**: [Bun](https://bun.sh/)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: [Better Auth](https://better-auth.com)
- **UI**: [Shadcn](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Flow Editor**: [ReactFlow](https://reactflow.dev/)
- **Docs**: [Fumadocs](https://fumadocs.vercel.app/)
- **Monorepo**: [Turborepo](https://turborepo.org/)
- **Realtime**: [Socket.io](https://socket.io/)
- **Background Jobs**: [Trigger.dev](https://trigger.dev/)

## Contributing

We welcome contributions! Please see our [Contributing Guide](.github/CONTRIBUTING.md) for details.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

<p align="center">Made with ❤️ by the Sim Team</p>
