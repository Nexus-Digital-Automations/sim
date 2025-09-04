// BlobClient and S3Client are server-only - import from specific files when needed
// export * as BlobClient from '@/lib/uploads/blob/blob-client'
// export * as S3Client from '@/lib/uploads/s3/s3-client'

export {
  bufferToBase64,
  createFileContent as createAnthropicFileContent,
  type FileAttachment,
  getContentType as getAnthropicContentType,
  getFileExtension,
  getMimeTypeFromExtension,
  isSupportedFileType,
  type MessageContent as AnthropicMessageContent,
  MIME_TYPE_MAPPING,
} from '@/lib/uploads/file-utils'
export {
  LOCAL_CONFIG,
  UPLOAD_DIR,
  USE_BLOB_STORAGE,
  USE_LOCAL_STORAGE,
  USE_S3_STORAGE,
} from '@/lib/uploads/setup'
export {
  type CustomStorageConfig,
  deleteFile,
  downloadFile,
  type FileInfo,
  getPresignedUrl,
  getPresignedUrlWithConfig,
  getServePathPrefix,
  getStorageProvider,
  isUsingCloudStorage,
  uploadFile,
} from '@/lib/uploads/storage-client'
