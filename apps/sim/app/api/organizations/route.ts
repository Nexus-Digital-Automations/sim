import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createOrganizationForTeamPlan } from '@/lib/billing/organization'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('CreateTeamOrganization')

const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9-_]+$/,
      'Slug can only contain lowercase letters, numbers, hyphens, and underscores'
    )
    .trim()
    .optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - no active session' }, { status: 401 })
    }

    const user = session.user

    // Parse and validate request body
    let organizationName = user.name
    let organizationSlug: string | undefined

    try {
      const rawBody = await request.json()
      const validatedData = CreateOrganizationSchema.parse(rawBody)

      if (validatedData.name) {
        organizationName = validatedData.name
      }
      if (validatedData.slug) {
        organizationSlug = validatedData.slug
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid organization creation data', { errors: error.errors })
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        )
      }
      // If no body or invalid JSON, use defaults - not an error for this endpoint
    }

    logger.info('Creating organization for team plan', {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      organizationName,
      organizationSlug,
    })

    // Create organization and make user the owner/admin
    const organizationId = await createOrganizationForTeamPlan(
      user.id,
      organizationName || undefined,
      user.email,
      organizationSlug
    )

    logger.info('Successfully created organization for team plan', {
      userId: user.id,
      organizationId,
    })

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        name: organizationName,
        slug: organizationSlug,
      },
    })
  } catch (error) {
    logger.error('Failed to create organization for team plan', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: 'Failed to create organization',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
