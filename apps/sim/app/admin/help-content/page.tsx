'use client'

// Simple SVG icon components to replace heroicons
const DocumentTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    />
  </svg>
)

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    />
  </svg>
)

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 6v6m0 0v6m0-6h6m-6 0H6'
    />
  </svg>
)

export default function HelpContentManagementPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='border-gray-200 border-b bg-white shadow'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between py-6'>
            <div className='flex items-center'>
              <DocumentTextIcon className='mr-3 h-8 w-8 text-blue-600' />
              <h1 className='font-bold text-2xl text-gray-900'>Help Content Management</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <div className='space-y-6'>
          <div className='flex items-center justify-between'>
            <h2 className='font-bold text-2xl text-gray-900'>Content Management Dashboard</h2>
            <button
              className='inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              aria-label='Create new content'
            >
              <PlusIcon className='mr-2 h-5 w-5' />
              Create Content
            </button>
          </div>

          {/* Simplified Dashboard */}
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            <div className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
              <div className='flex items-center'>
                <DocumentTextIcon className='h-8 w-8 text-blue-600' />
                <div className='ml-4'>
                  <p className='font-medium text-gray-600 text-sm'>Total Content</p>
                  <p className='font-bold text-2xl text-gray-900'>0</p>
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
              <div className='flex items-center'>
                <ChartBarIcon className='h-8 w-8 text-green-600' />
                <div className='ml-4'>
                  <p className='font-medium text-gray-600 text-sm'>Published</p>
                  <p className='font-bold text-2xl text-gray-900'>0</p>
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
              <div className='flex items-center'>
                <DocumentTextIcon className='h-8 w-8 text-purple-600' />
                <div className='ml-4'>
                  <p className='font-medium text-gray-600 text-sm'>Draft Content</p>
                  <p className='font-bold text-2xl text-gray-900'>0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
