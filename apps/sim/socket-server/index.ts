import { createServer } from 'http'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'
import { createSocketIOServer } from '@/socket-server/config/socket'
import { setupAllHandlers } from '@/socket-server/handlers'
import { initializeParlantHooks } from '@/socket-server/integrations/parlant-hooks'
import { type AuthenticatedSocket, authenticateSocket } from '@/socket-server/middleware/auth'
import { initializeChatSecurity } from '@/socket-server/middleware/chat-security'
import { initializeParlantSecurity } from '@/socket-server/middleware/parlant-security'
import { chatMetricsCollector, chatPerformanceOptimizer } from '@/socket-server/monitoring/chat-metrics'
import { RoomManager } from '@/socket-server/rooms/manager'
import { createHttpHandler } from '@/socket-server/routes/http'

const logger = createLogger('CollaborativeSocketServer')

// Enhanced server configuration - HTTP server will be configured with handler after all dependencies are set up
const httpServer = createServer()

const io = createSocketIOServer(httpServer)

// Initialize room manager after io is created
const roomManager = new RoomManager(io)

// Initialize Parlant integration hooks
initializeParlantHooks(io, roomManager)

// Initialize security monitoring
initializeParlantSecurity(io)
initializeChatSecurity()

io.use(authenticateSocket)

const httpHandler = createHttpHandler(roomManager, logger)
httpServer.on('request', httpHandler)

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  // Don't exit in production, just log
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

httpServer.on('error', (error) => {
  logger.error('HTTP server error:', error)
})

io.engine.on('connection_error', (err) => {
  logger.error('Socket.IO connection error:', {
    req: err.req?.url,
    code: err.code,
    message: err.message,
    context: err.context,
  })
})

io.on('connection', (socket: AuthenticatedSocket) => {
  logger.info(`New socket connection: ${socket.id}`)

  // Track connection for metrics
  if (socket.userId) {
    chatMetricsCollector.trackConnection(socket.id)
  }

  // Setup all handlers including enhanced chat handlers
  setupAllHandlers(socket, roomManager)

  // Handle disconnection for metrics
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`)
    if (socket.userId) {
      chatMetricsCollector.trackDisconnection(socket.id)
    }
  })
})

httpServer.on('request', (req, res) => {
  logger.info(`🌐 HTTP Request: ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    host: req.headers.host,
    timestamp: new Date().toISOString(),
  })
})

io.engine.on('connection_error', (err) => {
  logger.error('❌ Engine.IO Connection error:', {
    code: err.code,
    message: err.message,
    context: err.context,
    req: err.req
      ? {
          url: err.req.url,
          method: err.req.method,
          headers: err.req.headers,
        }
      : 'No request object',
  })
})

const PORT = Number(env.PORT || env.SOCKET_PORT || 3002)

logger.info('Starting Socket.IO server...', {
  port: PORT,
  nodeEnv: env.NODE_ENV,
  hasDatabase: !!env.DATABASE_URL,
  hasAuth: !!env.BETTER_AUTH_SECRET,
})

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`Socket.IO server running on port ${PORT}`)
  logger.info(`🏥 Health check available at: http://localhost:${PORT}/health`)

  // Start periodic metrics logging every 5 minutes
  setInterval(() => {
    chatMetricsCollector.logMetrics()

    // Apply automatic optimizations if needed
    chatPerformanceOptimizer.applyAutomaticOptimizations()
  }, 5 * 60 * 1000) // 5 minutes

  // Log initial metrics after 30 seconds
  setTimeout(() => {
    chatMetricsCollector.logMetrics()
    logger.info('Chat metrics logging initialized')
  }, 30000)
})

httpServer.on('error', (error) => {
  logger.error('❌ Server failed to start:', error)
  process.exit(1)
})

process.on('SIGINT', () => {
  logger.info('Shutting down Socket.IO server...')
  httpServer.close(() => {
    logger.info('Socket.IO server closed')
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  logger.info('Shutting down Socket.IO server...')
  httpServer.close(() => {
    logger.info('Socket.IO server closed')
    process.exit(0)
  })
})
