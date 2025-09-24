/**
 * Contextual Help System Demo
 *
 * Comprehensive demonstration of the contextual help system features
 * including intelligent content generation, interactive guidance, and
 * multi-modal delivery.
 *
 * @author Contextual Help Agent
 * @version 1.0.0
 */

import { useState } from 'react'
import {
  ContextualHelpProvider,
  HelpSearchPanel,
  HelpTooltip,
  InteractiveGuidancePanel,
  useContextualHelp,
} from '../components'

// Demo App Component
function ContextualHelpDemo() {
  return (
    <ContextualHelpProvider
      initialContext={{
        userId: 'demo_user',
        workspaceId: 'demo_workspace',
        currentRoute: '/demo',
        toolContext: {
          toolId: 'demo_dashboard',
          toolName: 'Demo Dashboard',
        },
        userState: {
          expertiseLevel: 'intermediate',
          preferredHelpMode: 'tooltip',
        },
      }}
      enableAnalytics={true}
      debugMode={true}
    >
      <div className='contextual-help-demo'>
        <header className='demo-header'>
          <h1>Contextual Help System Demo</h1>
          <p>Experience intelligent, adaptive help that learns from your context</p>
        </header>

        <main className='demo-content'>
          <ToolbarSection />
          <DashboardSection />
          <GuidanceSection />
          <SearchSection />
          <AnalyticsSection />
        </main>

        <HelpSystemStatus />
      </div>
    </ContextualHelpProvider>
  )
}

// Toolbar with contextual tooltips
function ToolbarSection() {
  return (
    <section className='demo-section'>
      <h2>Interactive Toolbar with Contextual Help</h2>
      <div className='toolbar'>
        <HelpTooltip
          toolId='create_report'
          toolName='Report Creator'
          content='Create comprehensive reports from your data with our intelligent report builder.'
          trigger='hover'
          position='bottom'
          theme='light'
        >
          <button className='toolbar-btn'>Create Report</button>
        </HelpTooltip>

        <HelpTooltip
          toolId='data_export'
          toolName='Data Exporter'
          currentAction='export_selection'
          trigger='hover'
          position='bottom'
          maxWidth={300}
        >
          <button className='toolbar-btn'>Export Data</button>
        </HelpTooltip>

        <HelpTooltip
          toolId='share_dashboard'
          toolName='Dashboard Sharing'
          trigger='click'
          position='bottom'
          persistent={true}
          autoClose={15000}
        >
          <button className='toolbar-btn'>Share Dashboard</button>
        </HelpTooltip>

        <HelpTooltip
          toolId='settings'
          toolName='Dashboard Settings'
          trigger='focus'
          position='left'
          announceToScreenReader={true}
        >
          <button className='toolbar-btn'>Settings</button>
        </HelpTooltip>
      </div>
    </section>
  )
}

// Dashboard with contextual help based on user actions
function DashboardSection() {
  const { generateIntelligentHelp } = useContextualHelp()
  const [selectedMetric, setSelectedMetric] = useState<string>('')
  const [helpContent, setHelpContent] = useState<any>(null)

  const handleMetricSelect = async (metric: string) => {
    setSelectedMetric(metric)

    // Generate contextual help for the selected metric
    await generateIntelligentHelp({
      toolId: 'analytics_metrics',
      toolName: 'Analytics Metrics',
      userExpertiseLevel: 'intermediate',
      currentContext: {
        id: 'metric_context',
        userId: 'demo_user',
        workspaceId: 'demo_workspace',
        sessionId: 'demo_session',
        currentRoute: '/demo/dashboard',
        currentAction: `viewing_${metric}`,
        toolContext: {
          toolId: 'analytics_metrics',
          toolName: 'Analytics Metrics',
          currentStep: metric,
          parameters: { metric, timeframe: '30d' },
        },
        userState: {
          expertiseLevel: 'intermediate',
          recentActions: [`selected_${metric}`],
          strugglingAreas: [],
          preferredHelpMode: 'panel',
          accessibility: {
            screenReader: false,
            reducedMotion: false,
            highContrast: false,
            fontSize: 'normal',
            voiceGuidance: false,
            keyboardNavigation: true,
          },
        },
        timestamp: new Date(),
        metadata: {},
      },
      contentType: 'panel',
      deliveryMode: 'sidebar',
      adaptToAccessibility: false,
    })
  }

  return (
    <section className='demo-section'>
      <h2>Smart Dashboard with Contextual Assistance</h2>
      <div className='dashboard-grid'>
        <div className='metrics-panel'>
          <h3>Key Metrics</h3>
          {['impressions', 'clicks', 'conversions', 'revenue'].map((metric) => (
            <div
              key={metric}
              className={`metric-card ${selectedMetric === metric ? 'selected' : ''}`}
              onClick={() => handleMetricSelect(metric)}
            >
              <h4>{metric.charAt(0).toUpperCase() + metric.slice(1)}</h4>
              <div className='metric-value'>{Math.floor(Math.random() * 10000)}</div>
              <div className='metric-change'>+{Math.floor(Math.random() * 20)}%</div>
            </div>
          ))}
        </div>

        <div className='chart-panel'>
          <h3>Performance Chart</h3>
          <div className='chart-placeholder'>
            <p>Interactive chart would appear here</p>
            <p>Selected metric: {selectedMetric || 'None'}</p>
          </div>
        </div>

        <div className='filters-panel'>
          <h3>Filters</h3>
          <HelpTooltip
            toolId='date_filter'
            toolName='Date Range Filter'
            content='Select the date range for your analytics. Use preset ranges or choose custom dates.'
            trigger='hover'
            position='top'
          >
            <select className='filter-select'>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Custom range</option>
            </select>
          </HelpTooltip>

          <HelpTooltip
            toolId='segment_filter'
            toolName='Audience Segmentation'
            trigger='click'
            position='top'
            maxWidth={400}
          >
            <select className='filter-select'>
              <option>All Audiences</option>
              <option>New Visitors</option>
              <option>Returning Visitors</option>
              <option>Mobile Users</option>
            </select>
          </HelpTooltip>
        </div>
      </div>
    </section>
  )
}

// Interactive guidance section
function GuidanceSection() {
  const [showGuidance, setShowGuidance] = useState(false)
  const { startGuidance } = useContextualHelp()

  const handleStartGuidance = async (type: 'quick_start' | 'comprehensive' | 'troubleshooting') => {
    await startGuidance('demo_dashboard', type)
    setShowGuidance(true)
  }

  return (
    <section className='demo-section'>
      <h2>Interactive Guidance & Tutorials</h2>
      <div className='guidance-controls'>
        <button className='guidance-btn primary' onClick={() => handleStartGuidance('quick_start')}>
          Quick Start Tutorial
        </button>
        <button
          className='guidance-btn secondary'
          onClick={() => handleStartGuidance('comprehensive')}
        >
          Comprehensive Guide
        </button>
        <button
          className='guidance-btn tertiary'
          onClick={() => handleStartGuidance('troubleshooting')}
        >
          Troubleshooting Help
        </button>
      </div>

      <InteractiveGuidancePanel
        isVisible={showGuidance}
        onClose={() => setShowGuidance(false)}
        position='right'
        width={450}
        minimizable={true}
        draggable={true}
        allowSkip={true}
        showProgress={true}
        theme='auto'
        onTutorialComplete={(tutorial) => {
          console.log('Tutorial completed:', tutorial.id)
          setShowGuidance(false)
        }}
        onTutorialSkip={() => {
          console.log('Tutorial skipped')
          setShowGuidance(false)
        }}
      />
    </section>
  )
}

// Search functionality
function SearchSection() {
  const [showSearch, setShowSearch] = useState(false)
  const { searchHelp } = useContextualHelp()

  const handleSearch = async (query: string) => {
    await searchHelp(query, {
      type: ['tooltip', 'tutorial', 'panel'],
      difficulty: ['beginner', 'intermediate'],
    })
  }

  return (
    <section className='demo-section'>
      <h2>Intelligent Help Search</h2>
      <div className='search-controls'>
        <button className='search-btn' onClick={() => setShowSearch(!showSearch)}>
          {showSearch ? 'Hide Search' : 'Search Help Topics'}
        </button>
      </div>

      <HelpSearchPanel
        isVisible={showSearch}
        onClose={() => setShowSearch(false)}
        position='overlay'
        width={600}
        height={500}
        placeholder='Search for help topics, tutorials, or guides...'
        showRecentSearches={true}
        showSuggestions={true}
        enableSemanticSearch={true}
        enableFuzzySearch={true}
        showFilters={true}
        maxResults={10}
        onSearchResult={(results) => {
          console.log('Search results:', results.length)
        }}
        onResultSelect={(result) => {
          console.log('Selected result:', result.content.title)
        }}
      />
    </section>
  )
}

// Analytics and system status
function AnalyticsSection() {
  const { state } = useContextualHelp()

  return (
    <section className='demo-section'>
      <h2>Help System Analytics</h2>
      <div className='analytics-grid'>
        <div className='stat-card'>
          <h4>Help Views</h4>
          <div className='stat-value'>{state.helpMetrics.totalHelpViews}</div>
        </div>
        <div className='stat-card'>
          <h4>Feedback Submitted</h4>
          <div className='stat-value'>{state.helpMetrics.feedbackSubmitted}</div>
        </div>
        <div className='stat-card'>
          <h4>Session Duration</h4>
          <div className='stat-value'>
            {state.helpMetrics.sessionStartTime
              ? `${Math.floor((Date.now() - state.helpMetrics.sessionStartTime.getTime()) / 1000)}s`
              : '0s'}
          </div>
        </div>
        <div className='stat-card'>
          <h4>Active Guidance</h4>
          <div className='stat-value'>{state.activeGuidance.tutorial ? 'Yes' : 'No'}</div>
        </div>
      </div>

      <div className='help-history'>
        <h4>Recent Help Content</h4>
        <div className='history-list'>
          {state.helpHistory.slice(0, 5).map((content, index) => (
            <div key={content.id} className='history-item'>
              <span className='content-title'>{content.title}</span>
              <span className='content-type'>{content.type}</span>
              <span className='content-rating'>★ {content.analytics.averageRating.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// System status indicator
function HelpSystemStatus() {
  const { state } = useContextualHelp()

  return (
    <div className='help-system-status'>
      <div className={`status-indicator ${state.isInitialized ? 'active' : 'inactive'}`}>
        <span className='status-dot' />
        <span className='status-text'>
          Help System: {state.isInitialized ? 'Active' : 'Initializing...'}
        </span>
      </div>

      {state.isLoading && (
        <div className='loading-indicator'>
          <span className='spinner' />
          <span>Loading help content...</span>
        </div>
      )}

      {state.error && (
        <div className='error-indicator'>
          <span className='error-icon'>⚠</span>
          <span className='error-text'>{state.error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  )
}

// CSS Styles (would typically be in a separate file)
const demoStyles = `
.contextual-help-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 40px;
}

.demo-section {
  margin-bottom: 40px;
  padding: 24px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: #fafbfc;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: 8px 16px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: #f6f8fa;
  border-color: #8c959f;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.metrics-panel, .chart-panel, .filters-panel {
  padding: 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #d0d7de;
}

.metric-card {
  padding: 12px;
  margin: 8px 0;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.metric-card:hover, .metric-card.selected {
  background: #dbeafe;
  border-color: #3b82f6;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
  border: 2px dashed #d0d7de;
  border-radius: 4px;
}

.filter-select {
  width: 100%;
  padding: 8px;
  margin: 8px 0;
  border: 1px solid #d0d7de;
  border-radius: 4px;
}

.guidance-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.guidance-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.guidance-btn.primary {
  background: #2563eb;
  color: white;
}

.guidance-btn.secondary {
  background: #64748b;
  color: white;
}

.guidance-btn.tertiary {
  background: #dc2626;
  color: white;
}

.search-controls {
  margin-bottom: 20px;
}

.search-btn {
  padding: 10px 20px;
  background: #059669;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 16px;
  background: white;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #2563eb;
}

.help-history {
  background: white;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #d0d7de;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.help-system-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 12px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #d0d7de;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
}

.status-indicator.active .status-dot {
  background: #16a34a;
}

.loading-indicator, .error-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
}

.loading-indicator {
  background: #dbeafe;
  color: #1e40af;
}

.error-indicator {
  background: #fecaca;
  color: #dc2626;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
`

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = demoStyles
  document.head.appendChild(styleElement)
}

export default ContextualHelpDemo
