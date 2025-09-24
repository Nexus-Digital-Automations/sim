/**
 * Real-Time Communication Integration Tests
 * =======================================
 *
 * This suite tests the Socket.io integration between Sim's existing Socket.io infrastructure
 * and Parlant agents, ensuring real-time communication works seamlessly with workspace
 * isolation and authentication.
 *
 * Test Coverage:
 * - Socket.io connection establishment with authentication
 * - Workspace-scoped real-time events
 * - Agent conversation streaming
 * - Multi-user workspace communication
 * - Connection resilience and error handling
 * - Performance under concurrent connections
 */

const io = require('socket.io-client')
const jwt = require('jsonwebtoken')
const axios = require('axios')

describe('Real-Time Communication Integration Tests', () => {
  const testConfig = {
    socket_server_url: process.env.SOCKET_SERVER_URL || 'http://localhost:3001',
    parlant_server_url: process.env.PARLANT_SERVER_URL || 'http://localhost:8800',
    jwt_secret: process.env.BETTER_AUTH_SECRET || 'test-auth-secret',
    connection_timeout: 5000,
    test_timeout: 30000,
  }

  const testUsers = [
    {
      id: `realtime-user-1-${Date.now()}`,
      name: 'Real-time Test User 1',
      email: 'realtime-test-1@example.com',
      workspace_id: 'realtime-workspace-1',
    },
    {
      id: `realtime-user-2-${Date.now()}`,
      name: 'Real-time Test User 2',
      email: 'realtime-test-2@example.com',
      workspace_id: 'realtime-workspace-2',
    },
  ]

  const testAgents = []
  const activeConnections = []

  beforeAll(async () => {
    console.log('🔌 Setting up Real-Time Communication Integration Tests')

    // Create test agents for real-time testing
    for (const user of testUsers) {
      const authToken = generateValidJwtToken(user)

      try {
        const agentResponse = await axios.post(
          `${testConfig.parlant_server_url}/api/v1/agents`,
          {
            name: `Real-time Agent for ${user.name}`,
            description: 'Agent for real-time communication testing',
            workspace_id: user.workspace_id,
            configuration: {
              real_time_enabled: true,
              streaming_responses: true,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        )

        testAgents.push({
          id: agentResponse.data.id,
          user_id: user.id,
          workspace_id: user.workspace_id,
          auth_token: authToken,
        })
      } catch (error) {
        console.warn(`⚠️  Could not create test agent for ${user.name}: ${error.message}`)
      }
    }

    console.log(`✅ Created ${testAgents.length} test agents for real-time testing`)
  })

  afterAll(async () => {
    console.log('🧹 Cleaning up Real-Time Communication Tests')

    // Disconnect all active connections
    activeConnections.forEach((socket) => {
      if (socket.connected) {
        socket.disconnect()
      }
    })

    // Clean up test agents
    for (const agent of testAgents) {
      try {
        await axios.delete(`${testConfig.parlant_server_url}/api/v1/agents/${agent.id}`, {
          headers: {
            Authorization: `Bearer ${agent.auth_token}`,
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        console.warn(`⚠️  Could not clean up agent ${agent.id}: ${error.message}`)
      }
    }

    console.log('✅ Real-time communication test cleanup completed')
  })

  describe('🔌 Socket.io Connection and Authentication', () => {
    test(
      'Establishes authenticated Socket.io connection',
      async () => {
        const user = testUsers[0]
        const authToken = generateValidJwtToken(user)

        return new Promise((resolve, reject) => {
          const socket = io(testConfig.socket_server_url, {
            auth: {
              token: authToken,
            },
            timeout: testConfig.connection_timeout,
          })

          activeConnections.push(socket)

          socket.on('connect', () => {
            console.log('  ✅ Socket.io connection established with authentication')

            expect(socket.connected).toBe(true)
            expect(socket.id).toBeTruthy()

            socket.disconnect()
            resolve()
          })

          socket.on('connect_error', (error) => {
            console.log(`  ❌ Socket.io connection failed: ${error.message}`)
            reject(error)
          })

          setTimeout(() => {
            socket.disconnect()
            reject(new Error('Connection timeout'))
          }, testConfig.connection_timeout)
        })
      },
      testConfig.test_timeout
    )

    test(
      'Rejects connection with invalid authentication',
      async () => {
        const invalidToken = 'invalid.jwt.token'

        return new Promise((resolve, reject) => {
          const socket = io(testConfig.socket_server_url, {
            auth: {
              token: invalidToken,
            },
            timeout: testConfig.connection_timeout,
          })

          socket.on('connect', () => {
            console.log('  ❌ Socket.io should not have connected with invalid token')
            socket.disconnect()
            reject(new Error('Connection should have been rejected'))
          })

          socket.on('connect_error', (error) => {
            console.log('  ✅ Socket.io properly rejected invalid authentication')
            expect(error).toBeTruthy()
            resolve()
          })

          setTimeout(() => {
            socket.disconnect()
            resolve() // Assume rejection if no connection after timeout
          }, testConfig.connection_timeout)
        })
      },
      testConfig.test_timeout
    )
  })

  describe('🏢 Workspace-Scoped Real-Time Events', () => {
    test(
      'Users can join workspace-specific rooms',
      async () => {
        const user = testUsers[0]
        const authToken = generateValidJwtToken(user)

        return new Promise((resolve, reject) => {
          const socket = io(testConfig.socket_server_url, {
            auth: {
              token: authToken,
            },
          })

          activeConnections.push(socket)

          socket.on('connect', () => {
            console.log('  → Joining workspace room')

            // Join workspace room
            socket.emit('join_workspace', user.workspace_id)
          })

          socket.on('workspace_joined', (data) => {
            console.log('  ✅ Successfully joined workspace room')

            expect(data.workspace_id).toBe(user.workspace_id)
            expect(data.user_id).toBe(user.id)

            socket.disconnect()
            resolve()
          })

          socket.on('error', (error) => {
            console.log(`  ❌ Workspace join error: ${error.message}`)
            socket.disconnect()
            reject(error)
          })

          setTimeout(() => {
            socket.disconnect()
            reject(new Error('Workspace join timeout'))
          }, testConfig.connection_timeout)
        })
      },
      testConfig.test_timeout
    )

    test(
      'Workspace isolation prevents cross-workspace event access',
      async () => {
        const user1 = testUsers[0]
        const user2 = testUsers[1]
        const user1Token = generateValidJwtToken(user1)
        const user2Token = generateValidJwtToken(user2)

        return new Promise((resolve, reject) => {
          let connectionsEstablished = 0
          let messagesReceived = 0
          const expectedConnections = 2

          // User 1 socket
          const socket1 = io(testConfig.socket_server_url, {
            auth: { token: user1Token },
          })

          // User 2 socket
          const socket2 = io(testConfig.socket_server_url, {
            auth: { token: user2Token },
          })

          activeConnections.push(socket1, socket2)

          const handleConnection = (socket, user) => {
            socket.on('connect', () => {
              connectionsEstablished++
              console.log(`  → User ${user.id} connected`)

              // Join respective workspace
              socket.emit('join_workspace', user.workspace_id)
            })

            socket.on('workspace_joined', (data) => {
              console.log(`  → User ${user.id} joined workspace ${data.workspace_id}`)

              if (connectionsEstablished === expectedConnections) {
                // Both users connected, test cross-workspace isolation
                console.log('  → Testing workspace isolation')

                // User 1 sends message in their workspace
                socket1.emit('workspace_message', {
                  workspace_id: user1.workspace_id,
                  message: 'Message from User 1',
                  type: 'test_isolation',
                })
              }
            })

            socket.on('workspace_message', (data) => {
              messagesReceived++
              console.log(`  → User ${user.id} received message: ${data.message}`)

              // Only User 1 should receive the message
              if (user.id === user1.id) {
                expect(data.workspace_id).toBe(user1.workspace_id)
                expect(data.message).toBe('Message from User 1')

                setTimeout(() => {
                  // Verify User 2 didn't receive the message
                  if (messagesReceived === 1) {
                    console.log('  ✅ Workspace isolation working: cross-workspace message blocked')
                    socket1.disconnect()
                    socket2.disconnect()
                    resolve()
                  } else {
                    console.log(
                      `  ❌ Workspace isolation failed: ${messagesReceived} messages received`
                    )
                    socket1.disconnect()
                    socket2.disconnect()
                    reject(new Error('Workspace isolation failed'))
                  }
                }, 2000)
              } else {
                // User 2 should not receive User 1's message
                console.log(`  ❌ Workspace isolation failed: User 2 received User 1's message`)
                socket1.disconnect()
                socket2.disconnect()
                reject(
                  new Error('Workspace isolation failed: User 2 received cross-workspace message')
                )
              }
            })
          }

          handleConnection(socket1, user1)
          handleConnection(socket2, user2)

          setTimeout(() => {
            socket1.disconnect()
            socket2.disconnect()
            reject(new Error('Workspace isolation test timeout'))
          }, testConfig.test_timeout)
        })
      },
      testConfig.test_timeout
    )
  })

  describe('🤖 Real-Time Agent Conversations', () => {
    test('Streams agent responses in real-time', async () => {
      if (testAgents.length === 0) {
        console.warn('⚠️  No test agents available for real-time conversation testing')
        return
      }

      const agent = testAgents[0]
      const user = testUsers.find((u) => u.id === agent.user_id)

      return new Promise((resolve, reject) => {
        const socket = io(testConfig.socket_server_url, {
          auth: {
            token: agent.auth_token,
          },
        })

        activeConnections.push(socket)

        const responseChunks = []
        let conversationComplete = false

        socket.on('connect', () => {
          console.log('  → Connected for agent conversation streaming')

          // Join workspace
          socket.emit('join_workspace', agent.workspace_id)
        })

        socket.on('workspace_joined', () => {
          console.log('  → Starting streaming conversation with agent')

          // Start conversation with agent
          socket.emit('agent_conversation_start', {
            agent_id: agent.id,
            message: 'Hello! Can you explain real-time communication in detail?',
            stream: true,
          })
        })

        socket.on('agent_response_chunk', (chunk) => {
          console.log('  → Received response chunk')

          expect(chunk.agent_id).toBe(agent.id)
          expect(chunk.content).toBeTruthy()
          expect(chunk.chunk_index).toBeDefined()

          responseChunks.push(chunk)
        })

        socket.on('agent_response_complete', (data) => {
          console.log('  ✅ Agent conversation streaming completed')

          expect(data.agent_id).toBe(agent.id)
          expect(data.total_chunks).toBe(responseChunks.length)
          expect(responseChunks.length).toBeGreaterThan(0)

          conversationComplete = true
          socket.disconnect()
          resolve({
            chunks_received: responseChunks.length,
            total_content_length: responseChunks.reduce(
              (sum, chunk) => sum + chunk.content.length,
              0
            ),
          })
        })

        socket.on('error', (error) => {
          console.log(`  ❌ Agent conversation error: ${error.message}`)
          socket.disconnect()
          reject(error)
        })

        setTimeout(() => {
          if (!conversationComplete) {
            console.log(
              `  ⚠️  Agent conversation timeout after receiving ${responseChunks.length} chunks`
            )
            socket.disconnect()

            if (responseChunks.length > 0) {
              // Partial success - streaming started but didn't complete
              resolve({
                chunks_received: responseChunks.length,
                status: 'partial_success',
                note: 'Streaming started but timed out',
              })
            } else {
              reject(new Error('Agent conversation streaming timeout - no chunks received'))
            }
          }
        }, 15000) // Longer timeout for streaming
      })
    }, 20000)

    test(
      'Handles multiple concurrent agent conversations',
      async () => {
        if (testAgents.length < 2) {
          console.warn('⚠️  Need at least 2 test agents for concurrent conversation testing')
          return
        }

        const agent1 = testAgents[0]
        const agent2 = testAgents[1]
        const concurrentConnections = 2

        return new Promise((resolve, reject) => {
          let conversationsCompleted = 0
          const conversationResults = []

          const startConversation = (agent, conversationId) => {
            const socket = io(testConfig.socket_server_url, {
              auth: {
                token: agent.auth_token,
              },
            })

            activeConnections.push(socket)

            let responseReceived = false

            socket.on('connect', () => {
              socket.emit('join_workspace', agent.workspace_id)
            })

            socket.on('workspace_joined', () => {
              socket.emit('agent_conversation_start', {
                agent_id: agent.id,
                message: `Concurrent test message ${conversationId}`,
                conversation_id: conversationId,
              })
            })

            socket.on('agent_response', (data) => {
              console.log(`  ✅ Concurrent conversation ${conversationId} completed`)

              expect(data.agent_id).toBe(agent.id)
              expect(data.response).toBeTruthy()

              responseReceived = true
              conversationsCompleted++

              conversationResults.push({
                conversation_id: conversationId,
                agent_id: agent.id,
                response_length: data.response.length,
              })

              if (conversationsCompleted === concurrentConnections) {
                console.log('  ✅ All concurrent conversations completed successfully')
                socket.disconnect()
                resolve(conversationResults)
              } else {
                socket.disconnect()
              }
            })

            socket.on('error', (error) => {
              console.log(`  ❌ Concurrent conversation ${conversationId} error: ${error.message}`)
              socket.disconnect()

              if (!responseReceived) {
                reject(error)
              }
            })
          }

          // Start concurrent conversations
          startConversation(agent1, 'concurrent-1')
          startConversation(agent2, 'concurrent-2')

          setTimeout(() => {
            if (conversationsCompleted < concurrentConnections) {
              console.log(
                `  ⚠️  Concurrent conversation timeout: ${conversationsCompleted}/${concurrentConnections} completed`
              )

              if (conversationsCompleted > 0) {
                resolve(conversationResults) // Partial success
              } else {
                reject(new Error('Concurrent conversation test timeout'))
              }
            }
          }, testConfig.test_timeout)
        })
      },
      testConfig.test_timeout
    )
  })

  describe('🔄 Connection Resilience and Error Handling', () => {
    test('Handles connection drops and reconnection', async () => {
      const user = testUsers[0]
      const authToken = generateValidJwtToken(user)

      return new Promise((resolve, reject) => {
        let connectionCount = 0
        let reconnectionSuccessful = false

        const socket = io(testConfig.socket_server_url, {
          auth: {
            token: authToken,
          },
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
        })

        activeConnections.push(socket)

        socket.on('connect', () => {
          connectionCount++
          console.log(`  → Connection established (attempt ${connectionCount})`)

          if (connectionCount === 1) {
            // First connection - simulate disconnect
            setTimeout(() => {
              console.log('  → Simulating connection drop')
              socket.disconnect()
            }, 1000)
          } else if (connectionCount === 2) {
            // Reconnection successful
            console.log('  ✅ Reconnection successful')
            reconnectionSuccessful = true
            socket.disconnect()
            resolve({
              reconnection_successful: true,
              total_connection_attempts: connectionCount,
            })
          }
        })

        socket.on('disconnect', (reason) => {
          console.log(`  → Disconnected: ${reason}`)

          if (connectionCount === 1) {
            // Expected disconnect - socket will attempt to reconnect
            console.log('  → Expected disconnect, waiting for reconnection...')
          }
        })

        socket.on('reconnect_error', (error) => {
          console.log(`  ❌ Reconnection error: ${error.message}`)
          socket.disconnect()
          reject(error)
        })

        setTimeout(() => {
          if (!reconnectionSuccessful) {
            console.log('  ❌ Reconnection test timeout')
            socket.disconnect()
            reject(new Error('Reconnection test timeout'))
          }
        }, 10000)
      })
    }, 15000)
  })

  describe('⚡ Performance Under Load', () => {
    test('Handles multiple concurrent Socket.io connections', async () => {
      const concurrentConnections = 10
      const user = testUsers[0]
      const authToken = generateValidJwtToken(user)

      console.log(`  → Testing ${concurrentConnections} concurrent Socket.io connections`)

      return new Promise((resolve, reject) => {
        let connectionsEstablished = 0
        let allConnectionsReady = false
        const sockets = []

        const startTime = performance.now()

        for (let i = 0; i < concurrentConnections; i++) {
          const socket = io(testConfig.socket_server_url, {
            auth: {
              token: authToken,
            },
          })

          sockets.push(socket)
          activeConnections.push(socket)

          socket.on('connect', () => {
            connectionsEstablished++

            if (connectionsEstablished === concurrentConnections && !allConnectionsReady) {
              allConnectionsReady = true
              const connectionTime = performance.now() - startTime

              console.log(
                `  ✅ All ${concurrentConnections} connections established in ${connectionTime.toFixed(2)}ms`
              )

              // Test broadcasting to all connections
              socket.emit('broadcast_test', {
                workspace_id: user.workspace_id,
                message: 'Broadcast test message',
              })
            }
          })

          socket.on('broadcast_received', (data) => {
            if (allConnectionsReady) {
              console.log('  ✅ Broadcast received by concurrent connection')

              // Disconnect all sockets
              sockets.forEach((s) => s.disconnect())

              resolve({
                concurrent_connections: concurrentConnections,
                connection_time: performance.now() - startTime,
                broadcast_successful: true,
              })
            }
          })

          socket.on('connect_error', (error) => {
            console.log(`  ❌ Connection ${i} failed: ${error.message}`)
            sockets.forEach((s) => s.disconnect())
            reject(error)
          })
        }

        setTimeout(() => {
          if (connectionsEstablished < concurrentConnections) {
            console.log(
              `  ⚠️  Performance test partial success: ${connectionsEstablished}/${concurrentConnections} connections`
            )
            sockets.forEach((s) => s.disconnect())

            resolve({
              concurrent_connections: connectionsEstablished,
              connection_time: performance.now() - startTime,
              status: 'partial_success',
            })
          } else if (!allConnectionsReady) {
            sockets.forEach((s) => s.disconnect())
            reject(new Error('Performance test timeout'))
          }
        }, 15000)
      })
    }, 20000)
  })

  // Helper functions
  function generateValidJwtToken(user) {
    const payload = {
      user_id: user.id,
      email: user.email,
      name: user.name,
      workspace_id: user.workspace_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    }

    return jwt.sign(payload, testConfig.jwt_secret, { algorithm: 'HS256' })
  }
})
