import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('MultipartUploadAPI')

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For local storage, multipart uploads are not needed
    // Large files can be handled by the regular upload endpoint
    return NextResponse.json(
      {
        error: 'Multipart upload not supported in local storage mode',
        code: 'MULTIPART_UPLOAD_NOT_SUPPORTED',
        message: 'Use the regular file upload endpoint for all file sizes',
      },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Error in multipart upload endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error in multipart upload endpoint' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}

export async function GET(request: NextRequest) {
  return POST(request)
}
