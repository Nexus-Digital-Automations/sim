/**
 * Comprehensive Help System Example - Complete implementation showcase
 *
 * Demonstrates the integration and usage of all help system components:
 * - AI Help Chat with contextual awareness
 * - Interactive tutorials with step-by-step guidance
 * - Contextual overlays with smart positioning
 * - Help panel with search and content browsing
 * - Help search bar with advanced filtering
 *
 * This example shows how to:
 * - Initialize and configure the help system
 * - Provide contextual help based on user location
 * - Create interactive onboarding experiences
 * - Implement intelligent search and discovery
 * - Track user interactions and analytics
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import { useRef, useState } from 'react'
import {
  BookOpenIcon,
  HelpCircleIcon,
  MessageCircleIcon,
  PlayIcon,
  SearchIcon,
  ZapIcon,
} from 'lucide-react'
import {
  type ActionButton,
  AIHelpChat,
  ContextualOverlay,
  HelpPanel,
  HelpSearchBar,
  InteractiveTutorial,
  type SearchFilter,
  type TutorialStep,
} from '@/components/help'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ========================
// EXAMPLE COMPONENT
// ========================

export function ComprehensiveHelpExample() {
  // Component state
  const [activeDemo, setActiveDemo] = useState<string>('overview')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false)
  const [isTutorialActive, setIsTutorialActive] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)

  // Refs for contextual targeting
  const searchBarRef = useRef<HTMLDivElement>(null)
  const tutorialButtonRef = useRef<HTMLButtonElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // ========================
  // EXAMPLE DATA
  // ========================

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to the Help System',
      content:
        'This tutorial will guide you through all the help features available in the platform.',
      type: 'instruction',
      highlightType: 'none',
      tips: ['Take your time to explore each feature', 'You can pause or skip at any time'],
      estimatedTime: 10,
    },
    {
      id: 'search-bar',
      title: 'Help Search Bar',
      content: 'Use the search bar to quickly find help content, tutorials, and documentation.',
      targetRef: searchBarRef,
      highlightType: 'overlay',
      tips: [
        'Try searching for "workflows" or "getting started"',
        'Use filters to narrow down results',
        'Recent searches are saved for quick access',
      ],
      estimatedTime: 15,
    },
    {
      id: 'ai-chat',
      title: 'AI Assistant',
      content: 'Chat with our AI assistant for personalized help and guidance.',
      highlightType: 'spotlight',
      tips: [
        'Ask specific questions about features',
        'The AI understands your current context',
        'You can provide feedback on responses',
      ],
      estimatedTime: 20,
    },
    {
      id: 'contextual-help',
      title: 'Contextual Help',
      content: "Get relevant help tips and information based on what you're currently doing.",
      targetRef: settingsRef,
      highlightType: 'outline',
      tips: [
        'Help appears automatically when needed',
        'Click on help icons for more details',
        'Contextual tips are personalized to your workflow',
      ],
      estimatedTime: 15,
    },
    {
      id: 'completion',
      title: 'Tutorial Complete!',
      content: "You've learned about all the help system features. You can access them anytime.",
      type: 'completion',
      highlightType: 'none',
      tips: [
        'Remember: Help is always available when you need it',
        'Try the AI chat for complex questions',
        'Check the help panel for detailed documentation',
      ],
      estimatedTime: 10,
    },
  ]

  const searchFilters: SearchFilter[] = [
    {
      id: 'tutorials',
      label: 'Tutorials',
      icon: <PlayIcon className='h-3 w-3' />,
      description: 'Step-by-step guides',
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <ZapIcon className='h-3 w-3' />,
      description: 'Automation help',
    },
    {
      id: 'getting-started',
      label: 'Getting Started',
      icon: <BookOpenIcon className='h-3 w-3' />,
      description: 'Beginner guides',
    },
  ]

  const overlayActions: ActionButton[] = [
    {
      id: 'learn-more',
      label: 'Learn More',
      action: 'learn_more',
      variant: 'outline',
      icon: <BookOpenIcon className='h-3 w-3' />,
      parameters: { url: '/help/detailed-guide' },
    },
    {
      id: 'start-tutorial',
      label: 'Start Tutorial',
      action: 'start_tutorial',
      variant: 'primary',
      icon: <PlayIcon className='h-3 w-3' />,
    },
  ]

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleSearchQuery = (query: string, filters?: string[]) => {
    console.log('Search query:', query, 'Filters:', filters)
    // Implement search logic here
  }

  const handleTutorialComplete = (completionData: any) => {
    console.log('Tutorial completed:', completionData)
    setIsTutorialActive(false)
    // Show completion message or redirect
  }

  const handleOverlayAction = (action: string, data?: any) => {
    console.log('Overlay action:', action, data)

    switch (action) {
      case 'start_tutorial':
        setIsTutorialActive(true)
        setShowOverlay(false)
        break
      case 'learn_more':
        if (data?.url) {
          window.open(data.url, '_blank')
        }
        break
      case 'dismiss':
        setShowOverlay(false)
        break
    }
  }

  const handleChatMessage = (message: any) => {
    console.log('Chat message sent:', message)
    // Handle message processing
  }

  // ========================
  // RENDER DEMO SECTIONS
  // ========================

  const renderOverviewDemo = () => (
    <div className='space-y-6'>
      <div>
        <h2 className='mb-4 font-semibold text-xl'>Help System Overview</h2>
        <p className='mb-6 text-muted-foreground'>
          The comprehensive help system provides multiple ways for users to get assistance:
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <MessageCircleIcon className='h-5 w-5' />
              AI Chat Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-muted-foreground text-sm'>
              Intelligent conversational help with context awareness and personalized responses.
            </p>
            <Button onClick={() => setIsChatOpen(!isChatOpen)} size='sm'>
              {isChatOpen ? 'Close Chat' : 'Open AI Chat'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BookOpenIcon className='h-5 w-5' />
              Interactive Tutorials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-muted-foreground text-sm'>
              Step-by-step guided tours with element highlighting and progress tracking.
            </p>
            <Button
              ref={tutorialButtonRef}
              onClick={() => setIsTutorialActive(true)}
              size='sm'
              disabled={isTutorialActive}
            >
              {isTutorialActive ? 'Tutorial Running' : 'Start Tutorial'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <SearchIcon className='h-5 w-5' />
              Advanced Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-muted-foreground text-sm'>
              Smart search with auto-complete, filters, and contextual suggestions.
            </p>
            <div ref={searchBarRef}>
              <HelpSearchBar
                placeholder='Try searching for help...'
                enableFilters={true}
                availableFilters={searchFilters}
                onSearch={handleSearchQuery}
                enableShortcuts={true}
                showRecentSearches={true}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <HelpCircleIcon className='h-5 w-5' />
              Contextual Help
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-muted-foreground text-sm'>
              Smart overlays that appear based on user context and actions.
            </p>
            <div className='space-y-2'>
              <Button onClick={() => setShowOverlay(!showOverlay)} size='sm'>
                {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
              </Button>
              <div
                ref={settingsRef}
                className='rounded border p-4 text-center text-muted-foreground text-sm'
              >
                {showOverlay
                  ? 'Contextual help overlay is active'
                  : 'Click to trigger contextual help'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderSearchDemo = () => (
    <div className='space-y-6'>
      <div>
        <h2 className='mb-4 font-semibold text-xl'>Help Search System</h2>
        <p className='mb-6 text-muted-foreground'>
          Advanced search capabilities with intelligent suggestions and filtering.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Features</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <HelpSearchBar
            placeholder='Search help content, tutorials, and guides...'
            enableFilters={true}
            availableFilters={searchFilters}
            selectedFilters={[]}
            onSearch={handleSearchQuery}
            enableShortcuts={true}
            showRecentSearches={true}
            showPopularQueries={true}
            showContextualSuggestions={true}
            maxSuggestions={8}
          />

          <div className='mt-4 space-y-2'>
            <h4 className='font-medium text-sm'>Features:</h4>
            <ul className='space-y-1 text-muted-foreground text-sm'>
              <li>• Real-time search with auto-complete</li>
              <li>• Smart filtering by category and content type</li>
              <li>• Recent searches and popular queries</li>
              <li>• Contextual suggestions based on current page</li>
              <li>• Keyboard shortcuts (Cmd/Ctrl + K)</li>
              <li>• Fuzzy matching for typo tolerance</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTutorialDemo = () => (
    <div className='space-y-6'>
      <div>
        <h2 className='mb-4 font-semibold text-xl'>Interactive Tutorials</h2>
        <p className='mb-6 text-muted-foreground'>
          Guided step-by-step tutorials with element highlighting and progress tracking.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutorial Controls</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-4'>
            <Button onClick={() => setIsTutorialActive(true)} disabled={isTutorialActive}>
              {isTutorialActive ? 'Tutorial Running' : 'Start Tutorial'}
            </Button>

            {isTutorialActive && (
              <span className='text-muted-foreground text-sm'>
                Tutorial is active - follow the highlighted steps
              </span>
            )}
          </div>

          <div className='space-y-2'>
            <h4 className='font-medium text-sm'>Tutorial Features:</h4>
            <ul className='space-y-1 text-muted-foreground text-sm'>
              <li>• Element highlighting with collision detection</li>
              <li>• Smart positioning and auto-scrolling</li>
              <li>• Progress tracking and completion analytics</li>
              <li>• Branching paths based on user choices</li>
              <li>• Pause/resume and skip functionality</li>
              <li>• Accessibility compliance (WCAG 2.1)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderChatDemo = () => (
    <div className='space-y-6'>
      <div>
        <h2 className='mb-4 font-semibold text-xl'>AI Help Assistant</h2>
        <p className='mb-6 text-muted-foreground'>
          Intelligent conversational help with context awareness and real-time responses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chat Features</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Button onClick={() => setIsChatOpen(!isChatOpen)}>
            {isChatOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          </Button>

          <div className='space-y-2'>
            <h4 className='font-medium text-sm'>AI Assistant Capabilities:</h4>
            <ul className='space-y-1 text-muted-foreground text-sm'>
              <li>• Context-aware responses based on current page</li>
              <li>• Natural language understanding</li>
              <li>• Action suggestions and quick shortcuts</li>
              <li>• Conversation history and session management</li>
              <li>• Rich message formatting with code blocks</li>
              <li>• Feedback collection and rating system</li>
            </ul>
          </div>

          {isChatOpen && (
            <div className='mt-4'>
              <p className='mb-2 text-muted-foreground text-sm'>
                AI chat is open in floating mode. Try asking:
              </p>
              <ul className='space-y-1 text-muted-foreground text-sm'>
                <li>• "How do I create a workflow?"</li>
                <li>• "Help me with getting started"</li>
                <li>• "I'm having trouble with automation"</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <div className='mx-auto max-w-6xl p-6'>
      <div className='mb-8'>
        <h1 className='mb-4 font-bold text-3xl'>Help System Integration Example</h1>
        <p className='text-lg text-muted-foreground'>
          A comprehensive demonstration of all help system components working together.
        </p>
      </div>

      <Tabs value={activeDemo} onValueChange={setActiveDemo}>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='search'>Search</TabsTrigger>
          <TabsTrigger value='tutorials'>Tutorials</TabsTrigger>
          <TabsTrigger value='ai-chat'>AI Chat</TabsTrigger>
        </TabsList>

        <div className='mt-6'>
          <TabsContent value='overview'>{renderOverviewDemo()}</TabsContent>
          <TabsContent value='search'>{renderSearchDemo()}</TabsContent>
          <TabsContent value='tutorials'>{renderTutorialDemo()}</TabsContent>
          <TabsContent value='ai-chat'>{renderChatDemo()}</TabsContent>
        </div>
      </Tabs>

      {/* Help Panel */}
      <HelpPanel
        isOpen={isHelpPanelOpen}
        onClose={() => setIsHelpPanelOpen(false)}
        enableSearch={true}
        enableFilters={true}
        availableCategories={['Getting Started', 'Workflows', 'Advanced Features']}
        enableBookmarks={true}
        enableRatings={true}
        enableHistory={true}
      />

      {/* AI Chat */}
      {isChatOpen && (
        <AIHelpChat
          variant='floating'
          position='bottom-right'
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onMessageSent={handleChatMessage}
          enableVoiceInput={false}
          enableFileAttachments={false}
          contextData={{
            currentDemo: activeDemo,
            userLevel: 'beginner',
            features: ['tutorials', 'search', 'ai-chat'],
          }}
        />
      )}

      {/* Interactive Tutorial */}
      {isTutorialActive && (
        <InteractiveTutorial
          tutorialId='help-system-tour'
          title='Help System Tutorial'
          description='Learn about all the help features available'
          steps={tutorialSteps}
          onComplete={handleTutorialComplete}
          onExit={() => setIsTutorialActive(false)}
          allowSkip={true}
          allowPause={true}
          showProgress={true}
          showStepNumbers={true}
          variant='overlay'
          position='bottom-right'
        />
      )}

      {/* Contextual Overlay */}
      {showOverlay && (
        <ContextualOverlay
          targetRef={settingsRef}
          helpType='feature'
          priority='medium'
          content={{
            title: 'Settings Overview',
            description: 'Configure your help preferences and settings',
            content:
              'This area contains various settings and configuration options. You can customize your help experience, notification preferences, and accessibility options.',
            tags: ['settings', 'configuration', 'preferences'],
            tips: [
              'Adjust help notification frequency',
              'Enable keyboard shortcuts for quick access',
              'Set your experience level for personalized content',
            ],
            estimatedReadingTime: 30,
          }}
          trigger='manual'
          dismissible={true}
          showActions={true}
          actionButtons={overlayActions}
          onInteraction={handleOverlayAction}
          onDismiss={() => setShowOverlay(false)}
          position='auto'
          variant='default'
        />
      )}

      {/* Fixed Help Button */}
      <Button
        onClick={() => setIsHelpPanelOpen(true)}
        className='fixed bottom-4 left-4 z-40 rounded-full shadow-lg'
        size='sm'
      >
        <HelpCircleIcon className='mr-2 h-4 w-4' />
        Help
      </Button>
    </div>
  )
}

export default ComprehensiveHelpExample
