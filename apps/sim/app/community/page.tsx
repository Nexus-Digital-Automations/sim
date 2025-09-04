/**
 * Community Platform - Main Page Component
 *
 * Comprehensive community support and Q&A platform featuring:
 * - Discussion forums with threading and categorization
 * - Knowledge base articles and community wiki
 * - Expert verification and reputation system integration
 * - Real-time notifications and activity feeds
 * - Advanced search and filtering capabilities
 *
 * Based on research findings from community support platform analysis.
 * Integrates with existing community reputation and badge systems.
 *
 * @version 1.0.0
 * @created 2025-09-04
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CommunityDashboard } from '@/components/community/dashboard'
import { CommunityNavigation } from '@/components/community/navigation'
import { CommunityStats } from '@/components/community/stats'
import { LoadingSkeleton } from '@/components/ui/skeleton'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Community | Sim - Q&A Platform & Support Hub',
  description:
    'Join the Sim community for discussions, Q&A, knowledge sharing, and expert support. Get help with automation workflows and share your expertise.',
  keywords: [
    'community',
    'Q&A',
    'support',
    'discussions',
    'automation help',
    'workflow assistance',
    'expert advice',
    'knowledge base',
  ],
  openGraph: {
    title: 'Sim Community - Q&A Platform & Support Hub',
    description:
      'Connect with automation experts, ask questions, share knowledge, and build better workflows together.',
    type: 'website',
  },
}

/**
 * Community Platform Main Page
 *
 * Provides the primary entry point for the community Q&A platform with:
 * - Navigation between different community sections
 * - Real-time community statistics and activity overview
 * - Personalized dashboard based on user reputation and interests
 * - Quick access to popular discussions and knowledge base
 *
 * Features progressive loading and responsive design for optimal UX.
 */
export default async function CommunityPage() {
  const session = await auth()

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Community Header */}
      <div className='border-gray-200 border-b bg-white dark:border-gray-700 dark:bg-gray-800'>
        <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='font-bold text-2xl text-gray-900 dark:text-white'>
                Community Q&A Platform
              </h1>
              <p className='mt-2 text-gray-600 text-sm dark:text-gray-300'>
                Connect with automation experts, share knowledge, and build better workflows
                together
              </p>
            </div>
            <Suspense fallback={<LoadingSkeleton className='h-16 w-48' />}>
              <CommunityStats />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Main Community Content */}
      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-4'>
          {/* Navigation Sidebar */}
          <div className='lg:col-span-1'>
            <Suspense fallback={<LoadingSkeleton className='h-96 w-full' />}>
              <CommunityNavigation userId={session?.user?.id} />
            </Suspense>
          </div>

          {/* Main Dashboard Content */}
          <div className='lg:col-span-3'>
            <Suspense fallback={<LoadingSkeleton className='h-96 w-full' />}>
              <CommunityDashboard userId={session?.user?.id} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
