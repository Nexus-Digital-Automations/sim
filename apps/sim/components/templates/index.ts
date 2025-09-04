/**
 * Template Components - Comprehensive Template Browser and Installation UI System
 *
 * This module exports all template browser and installation components that create
 * a comprehensive template marketplace experience based on research findings from
 * leading automation platforms including n8n, Zapier, Make.com, and Microsoft Power Automate.
 *
 * Component Categories:
 * - Browser & Discovery: Main marketplace interface with advanced search and filtering
 * - Installation & Setup: Guided template installation with customization options
 * - Content Display: Detailed template information and community features
 * - AI-Powered Features: Recommendation engine with personalized suggestions
 * - User Organization: Collections and comparison tools for template management
 * - Discovery & Curation: Hub for trending, featured, and curated content
 *
 * Key Features Implemented:
 * ✅ Template gallery with card-based layout and advanced filtering
 * ✅ Real-time search with debouncing and intelligent suggestions
 * ✅ Category navigation and exploration
 * ✅ Template detail pages with comprehensive information display
 * ✅ Rating and review system with user feedback
 * ✅ One-click template installation with guided setup wizard
 * ✅ Customization options and preview before installation
 * ✅ AI-powered recommendation engine with multiple strategies
 * ✅ Template discovery hub with trending and featured content
 * ✅ User collections for template organization
 * ✅ Side-by-side template comparison tool
 * ✅ Infinite scroll with performance optimization
 * ✅ Mobile-responsive design with touch interactions
 * ✅ Accessibility-compliant interaction patterns
 *
 * @author Claude Code Template System - UI/UX Architecture Team
 * @version 2.0.0
 */

export { TemplateAnalyticsDashboard } from './template-analytics-dashboard'
export { TemplateApprovalDashboard } from './template-approval-dashboard'
export type { TemplateBrowserProps } from './template-browser'
// Core browser and gallery components
export { TemplateBrowser } from './template-browser'
export { TemplateCategoryNavigation } from './template-category-navigation'
export type { TemplateCollectionsProps } from './template-collections'
// User organization and management components
export { TemplateCollections } from './template-collections'
export type { TemplateComparisonProps } from './template-comparison'
export { TemplateComparison } from './template-comparison'
export type { TemplateDetailPageProps } from './template-detail-page'
// Content display and detail components
export { TemplateDetailPage } from './template-detail-page'
export type { DiscoveryContent, TemplateDiscoveryHubProps } from './template-discovery-hub'
// Discovery and curation components
export { TemplateDiscoveryHub } from './template-discovery-hub'
export type { TemplateGalleryProps } from './template-gallery'
export { TemplateGallery } from './template-gallery'
export type { TemplateInstallationWizardProps } from './template-installation-wizard'
// Installation and setup components
export { TemplateInstallationWizard } from './template-installation-wizard'
// Management and analytics components
export { TemplateManagementDashboard } from './template-management-dashboard'
export { TemplatePreviewDialog } from './template-preview-dialog'
export type {
  RecommendationContext,
  RecommendationStrategy,
  TemplateRecommendationEngineProps,
} from './template-recommendation-engine'
// AI-powered recommendation system
export { TemplateRecommendationEngine } from './template-recommendation-engine'
export type { TemplateSearchFiltersProps } from './template-search-filters'
export { TemplateSearchFilters } from './template-search-filters'

/**
 * Template Browser System Overview
 *
 * This comprehensive template browser system provides:
 *
 * 1. **DISCOVERY EXPERIENCE**
 *    - Advanced search with real-time suggestions and autocomplete
 *    - Category-based navigation with hierarchical organization
 *    - AI-powered recommendations with multiple strategies
 *    - Trending, featured, and curated content sections
 *    - Infinite scroll with performance optimization
 *
 * 2. **TEMPLATE INFORMATION**
 *    - Detailed template pages with comprehensive metadata
 *    - Visual workflow previews and block diagrams
 *    - Community ratings, reviews, and social proof
 *    - Usage statistics and performance metrics
 *    - Compatibility and requirement analysis
 *
 * 3. **INSTALLATION & SETUP**
 *    - Guided installation wizard with step-by-step process
 *    - Template customization and configuration options
 *    - Credential mapping and environment setup
 *    - Preview and validation before installation
 *    - Progress tracking with detailed feedback
 *
 * 4. **USER ORGANIZATION**
 *    - Personal collections with custom organization
 *    - Template comparison with side-by-side analysis
 *    - Favorites and bookmarking system
 *    - Sharing and collaboration features
 *    - Bulk operations and multi-template management
 *
 * 5. **AI-POWERED FEATURES**
 *    - Personalized recommendations based on behavior
 *    - Similar template suggestions with ML analysis
 *    - Contextual suggestions based on workspace activity
 *    - Collaborative filtering with community data
 *    - Trending analysis with real-time updates
 *
 * 6. **COMMUNITY FEATURES**
 *    - Rating and review system with moderation
 *    - Template sharing and social interactions
 *    - Creator profiles and contribution tracking
 *    - Community-driven curation and quality control
 *    - Social proof with usage statistics
 *
 * Usage Example:
 * ```tsx
 * import {
 *   TemplateBrowser,
 *   TemplateInstallationWizard,
 *   TemplateRecommendationEngine
 * } from '@/components/templates'
 *
 * function TemplateMarketplace() {
 *   return (
 *     <div className="template-marketplace">
 *       <TemplateBrowser
 *         workspaceId={workspaceId}
 *         userId={userId}
 *         features={{
 *           recommendations: true,
 *           collections: true,
 *           socialFeatures: true,
 *           analytics: true,
 *           bulkOperations: true
 *         }}
 *         onTemplateInstall={handleInstallation}
 *         onTemplatePreview={handlePreview}
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * The system is designed to be:
 * - **Performant**: Optimized for large template catalogs with virtualization
 * - **Accessible**: WCAG 2.1 compliant with keyboard navigation and screen readers
 * - **Responsive**: Mobile-first design with adaptive layouts
 * - **Extensible**: Modular architecture for easy customization and enhancement
 * - **Production-Ready**: Comprehensive error handling and loading states
 */
