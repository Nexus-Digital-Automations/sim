import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { createErrorResponse, createOptionsResponse } from '@/app/api/files/utils'

const logger = createLogger('PresignedUploadAPI')

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For local storage, we don't support direct presigned uploads
    // Files should be uploaded through the regular upload endpoint
    return NextResponse.json(
      {
        error: 'Direct uploads not supported in local storage mode',
        code: 'DIRECT_UPLOAD_NOT_SUPPORTED',
        directUploadSupported: false,
        message: 'Use the regular file upload endpoint instead',
      },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Error in presigned URL endpoint:', error)
    return createErrorResponse(
      error instanceof Error ? error : new Error('Presigned URL endpoint error')
    )
  }
}

export async function OPTIONS() {
  return createOptionsResponse()
}
