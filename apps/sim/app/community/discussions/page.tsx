/**
 * Community Discussions - Q&A Forum Page
 *
 * Main Q&A discussion forum featuring:
 * - Threaded discussion system with nested replies
 * - Question categorization and advanced filtering
 * - Real-time updates and voting system
 * - Expert answer highlighting and verification
 * - Advanced search with full-text and semantic search
 *
 * Integrates with the community reputation system and provides
 * gamification elements to encourage quality contributions.
 *
 * @version 1.0.0
 * @created 2025-09-04
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { DiscussionFilters } from '@/components/community/discussions/discussion-filters'
import { DiscussionsList } from '@/components/community/discussions/discussions-list'
import { QuickActions } from '@/components/community/discussions/quick-actions'
import { TrendingTopics } from '@/components/community/discussions/trending-topics'
import { LoadingSkeleton } from '@/components/ui/skeleton'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Q&A Discussions | Sim Community',
  description:
    'Browse community discussions, ask questions, and get expert help with automation workflows. Join the conversation with thousands of automation enthusiasts.',
  keywords: [
    'Q&A',
    'discussions',
    'automation questions',
    'workflow help',
    'community support',
    'expert answers',
    'troubleshooting',
    'integration help',
  ],
}

interface DiscussionsPageProps {
  searchParams: {
    category?: string
    sort?: string
    status?: string
    page?: string
    search?: string
  }
}

/**
 * Community Discussions Page
 *
 * Main forum interface providing:
 * - Filtered list of discussions with pagination
 * - Category-based navigation and filtering
 * - Search functionality with advanced options
 * - Trending topics and featured discussions
 * - Quick actions for posting and interaction
 */
export default async function DiscussionsPage({ searchParams }: DiscussionsPageProps) {
  const session = await auth()

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Page Header */}
      <div className='border-gray-200 border-b bg-white dark:border-gray-700 dark:bg-gray-800'>
        <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h1 className='font-bold text-2xl text-gray-900 dark:text-white'>Q&A Discussions</h1>
              <p className='mt-2 text-gray-600 text-sm dark:text-gray-300'>
                Ask questions, share solutions, and learn from the automation community
              </p>
            </div>
            <Suspense fallback={<LoadingSkeleton className='h-10 w-40' />}>
              <QuickActions userId={session?.user?.id} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-4'>
          {/* Filters Sidebar */}
          <div className='lg:col-span-1'>
            <div className='space-y-6'>
              <Suspense fallback={<LoadingSkeleton className='h-96 w-full' />}>
                <DiscussionFilters
                  selectedCategory={searchParams.category}
                  selectedSort={searchParams.sort}
                  selectedStatus={searchParams.status}
                />
              </Suspense>

              <Suspense fallback={<LoadingSkeleton className='h-48 w-full' />}>
                <TrendingTopics />
              </Suspense>
            </div>
          </div>

          {/* Main Discussions List */}
          <div className='lg:col-span-3'>
            <Suspense
              fallback={
                <div className='space-y-4'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <LoadingSkeleton key={i} className='h-32 w-full' />
                  ))}
                </div>
              }
            >
              <DiscussionsList
                category={searchParams.category}
                sort={searchParams.sort}
                status={searchParams.status}
                page={Number.parseInt(searchParams.page || '1')}
                search={searchParams.search}
                userId={session?.user?.id}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
