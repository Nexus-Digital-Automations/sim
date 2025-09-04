import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { createErrorResponse, createOptionsResponse } from '@/app/api/files/utils'

const logger = createLogger('BatchPresignedUploadAPI')

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For local storage, we don't support batch presigned uploads
    return NextResponse.json(
      {
        error: 'Batch direct uploads not supported in local storage mode',
        code: 'BATCH_DIRECT_UPLOAD_NOT_SUPPORTED',
        directUploadSupported: false,
        message: 'Use individual file upload endpoints instead',
      },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Error in batch presigned URL endpoint:', error)
    return createErrorResponse(
      error instanceof Error ? error : new Error('Batch presigned URL endpoint error')
    )
  }
}

export async function OPTIONS() {
  return createOptionsResponse()
}
