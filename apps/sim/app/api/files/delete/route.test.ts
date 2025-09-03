/**
 * File Delete API Route Test Suite - Bun/Vitest 3.x Compatible
 *
 * Comprehensive test coverage for file deletion operations across multiple storage providers.
 * Tests both local file system and cloud storage (S3, Azure Blob) deletion scenarios.
 *
 * Key Features:
 * - Enhanced logging for debugging file operations
 * - Production-ready error handling and validation
 * - Secure path validation and access control
 * - Cloud storage provider abstraction
 * - CORS preflight request handling
 *
 * Storage Providers Tested:
 * - Local file system with secure path validation
 * - AWS S3 with proper key-based deletion
 * - Azure Blob Storage with container operations
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Import enhanced test utilities for bun/vitest compatibility
import {
  createEnhancedMockRequest,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'

// Import module mocks for consistent mocking across tests
import '@/app/api/__test-utils__/module-mocks'

describe('File Delete API Route - Enhanced Test Suite', () => {
  let mocks: ReturnType<typeof setupEnhancedTestMocks>

  beforeEach(() => {
    console.log('🧪 Setting up File Delete API tests with enhanced mocks')

    // Initialize enhanced test mocks with file-specific configurations
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true },
      database: { select: { results: [[]] } },
      permissions: { level: 'admin' },
    })

    console.log('✅ File Delete API test setup complete')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up File Delete API test mocks')
    mocks.cleanup()
    vi.clearAllMocks()
  })

  it('should handle local file deletion successfully', async () => {
    console.log('🧪 Testing local file deletion with secure path validation')

    // Mock local file system operations for secure deletion
    vi.doMock('@/lib/uploads', () => ({
      isUsingCloudStorage: vi.fn().mockReturnValue(false),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      uploadFile: vi.fn().mockResolvedValue({
        path: '/api/files/serve/test-file.txt',
        key: 'test-file.txt',
        name: 'test-file.txt',
        size: 100,
        type: 'text/plain',
      }),
    }))

    console.log('📝 Creating mock request for local file deletion')
    const req = createEnhancedMockRequest('POST', {
      filePath: '/api/files/serve/test-file.txt',
    })

    console.log('🔧 Importing and executing DELETE route handler')
    const { POST } = await import('@/app/api/files/delete/route')
    const response = await POST(req)
    const data = await response.json()

    console.log('✅ Local file deletion response:', { status: response.status, data })

    // Verify successful deletion response
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('message')
    expect(['File deleted successfully', "File not found, but that's okay"]).toContain(data.message)

    console.log('✅ Local file deletion test completed successfully')
  })

  it('should handle file not found gracefully', async () => {
    console.log('🧪 Testing graceful handling of nonexistent file deletion')

    // Mock file system to simulate file not found scenario
    vi.doMock('@/lib/uploads', () => ({
      isUsingCloudStorage: vi.fn().mockReturnValue(false),
      deleteFile: vi.fn().mockRejectedValue(new Error('ENOENT: no such file or directory')),
      uploadFile: vi.fn().mockResolvedValue({
        path: '/api/files/serve/test-file.txt',
        key: 'test-file.txt',
        name: 'test-file.txt',
        size: 100,
        type: 'text/plain',
      }),
    }))

    console.log('📝 Creating mock request for nonexistent file')
    const req = createEnhancedMockRequest('POST', {
      filePath: '/api/files/serve/nonexistent.txt',
    })

    console.log('🔧 Executing DELETE route for nonexistent file')
    const { POST } = await import('@/app/api/files/delete/route')
    const response = await POST(req)
    const data = await response.json()

    console.log('✅ File not found response:', { status: response.status, data })

    // Verify graceful handling of missing files (should still return success)
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('message')

    console.log('✅ File not found graceful handling test completed')
  })

  it('should handle S3 file deletion successfully', async () => {
    console.log('🧪 Testing S3 cloud storage file deletion with key-based operations')

    // Mock S3 cloud storage operations with proper key extraction
    vi.doMock('@/lib/uploads', () => ({
      deleteFile: vi.fn().mockResolvedValue(undefined),
      isUsingCloudStorage: vi.fn().mockReturnValue(true),
      uploadFile: vi.fn().mockResolvedValue({
        path: '/api/files/serve/test-key',
        key: 'test-key',
        name: 'test.txt',
        size: 100,
        type: 'text/plain',
      }),
    }))

    // Mock AWS S3 client for cloud storage operations
    vi.doMock('@aws-sdk/client-s3', () => ({
      S3Client: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockResolvedValue({
          DeleteMarker: true,
          VersionId: 'mock-version-id',
        }),
      })),
      DeleteObjectCommand: vi.fn().mockImplementation((params) => {
        console.log('🔧 S3 DeleteObjectCommand created with params:', params)
        return { Bucket: params.Bucket, Key: params.Key }
      }),
    }))

    console.log('📝 Creating mock request for S3 file deletion')
    const req = createEnhancedMockRequest('POST', {
      filePath: '/api/files/serve/s3/1234567890-test-file.txt',
    })

    console.log('🔧 Executing S3 file deletion')
    const { POST } = await import('@/app/api/files/delete/route')
    const response = await POST(req)
    const data = await response.json()

    console.log('✅ S3 deletion response:', { status: response.status, data })

    // Verify successful S3 deletion
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('message', 'File deleted successfully from cloud storage')

    // Verify that deleteFile was called with correct key (extracted from path)
    const uploads = await import('@/lib/uploads')
    expect(uploads.deleteFile).toHaveBeenCalledWith('1234567890-test-file.txt')

    console.log('✅ S3 file deletion test completed successfully')
  })

  it('should handle Azure Blob file deletion successfully', async () => {
    console.log('🧪 Testing Azure Blob Storage file deletion with container operations')

    // Mock Azure Blob Storage operations with proper blob handling
    vi.doMock('@/lib/uploads', () => ({
      deleteFile: vi.fn().mockResolvedValue(undefined),
      isUsingCloudStorage: vi.fn().mockReturnValue(true),
      uploadFile: vi.fn().mockResolvedValue({
        path: '/api/files/serve/test-key',
        key: 'test-key',
        name: 'test.txt',
        size: 100,
        type: 'text/plain',
      }),
    }))

    // Mock Azure Blob Storage SDK
    vi.doMock('@azure/storage-blob', () => ({
      BlobServiceClient: vi.fn().mockImplementation(() => ({
        getContainerClient: vi.fn().mockImplementation(() => ({
          getBlobClient: vi.fn().mockImplementation(() => ({
            delete: vi.fn().mockResolvedValue({
              requestId: 'mock-request-id',
              version: 'mock-version',
              date: new Date(),
            }),
          })),
        })),
      })),
    }))

    console.log('📝 Creating mock request for Azure Blob file deletion')
    const req = createEnhancedMockRequest('POST', {
      filePath: '/api/files/serve/blob/1234567890-test-document.pdf',
    })

    console.log('🔧 Executing Azure Blob file deletion')
    const { POST } = await import('@/app/api/files/delete/route')
    const response = await POST(req)
    const data = await response.json()

    console.log('✅ Azure Blob deletion response:', { status: response.status, data })

    // Verify successful Azure Blob deletion
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('message', 'File deleted successfully from cloud storage')

    // Verify that deleteFile was called with correct blob name
    const uploads = await import('@/lib/uploads')
    expect(uploads.deleteFile).toHaveBeenCalledWith('1234567890-test-document.pdf')

    console.log('✅ Azure Blob file deletion test completed successfully')
  })

  it('should handle missing file path with proper validation', async () => {
    console.log('🧪 Testing validation for missing file path parameter')

    // Create request with empty body to test validation
    console.log('📝 Creating mock request with missing file path')
    const req = createEnhancedMockRequest('POST', {})

    console.log('🔧 Testing file path validation')
    const { POST } = await import('@/app/api/files/delete/route')
    const response = await POST(req)
    const data = await response.json()

    console.log('✅ Missing file path validation response:', { status: response.status, data })

    // Verify proper validation error handling
    expect(response.status).toBe(400)
    expect(data).toHaveProperty('error', 'InvalidRequestError')
    expect(data).toHaveProperty('message', 'No file path provided')

    console.log('✅ Missing file path validation test completed')
  })

  it('should handle CORS preflight requests with proper headers', async () => {
    console.log('🧪 Testing CORS preflight request handling for cross-origin file operations')

    console.log('🔧 Executing OPTIONS method for CORS preflight')
    const { OPTIONS } = await import('@/app/api/files/delete/route')
    const response = await OPTIONS()

    console.log('✅ CORS preflight response:', {
      status: response.status,
      allowMethods: response.headers.get('Access-Control-Allow-Methods'),
      allowHeaders: response.headers.get('Access-Control-Allow-Headers'),
    })

    // Verify proper CORS configuration for file operations
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, DELETE, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')

    console.log('✅ CORS preflight request handling test completed')
  })
})
