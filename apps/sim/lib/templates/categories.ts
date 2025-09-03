/**
 * Template Categories System - Comprehensive Organization and Discovery
 *
 * This module provides a comprehensive categorization system for templates including:
 * - Hierarchical category structure with subcategories
 * - Category-based filtering and search optimization
 * - Popular tag management and trending analysis
 * - Category analytics and usage metrics
 * - Dynamic category management and expansion
 * - Industry-specific template organization
 *
 * Category Architecture:
 * - Top-level categories for broad classification
 * - Subcategories for specific use cases and domains
 * - Tag-based cross-categorization for flexible discovery
 * - Industry and role-based organization
 * - Difficulty-based grouping within categories
 *
 * @author Claude Code Template System
 * @version 2.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { TemplateCategory } from './types'

// Initialize logger for category operations
const logger = createLogger('TemplateCategories')

/**
 * Comprehensive template category definitions
 *
 * Organized by business domain with detailed subcategories,
 * usage examples, and metadata for optimal discovery.
 */
export const TEMPLATE_CATEGORIES: Record<string, TemplateCategory> = {
  // ========================
  // BUSINESS AUTOMATION
  // ========================
  'business-automation': {
    id: 'business-automation',
    name: 'Business Automation',
    description:
      'Streamline business processes with CRM workflows, marketing campaigns, sales pipelines, and operational automation',
    icon: 'briefcase',
    color: '#3b82f6', // Blue
    templateCount: 0,
    popularTags: ['crm', 'sales', 'marketing', 'automation', 'business-process'],
    subcategories: [
      {
        id: 'crm-workflows',
        name: 'CRM Workflows',
        description:
          'Customer relationship management automation including lead nurturing, contact management, and sales pipeline optimization',
        icon: 'users',
        color: '#3b82f6',
        templateCount: 0,
        popularTags: ['crm', 'lead-management', 'customer-data', 'sales-pipeline', 'contact-sync'],
      },
      {
        id: 'marketing-automation',
        name: 'Marketing Automation',
        description:
          'Email campaigns, social media scheduling, lead generation, and marketing analytics workflows',
        icon: 'megaphone',
        color: '#f59e0b',
        templateCount: 0,
        popularTags: [
          'email-marketing',
          'social-media',
          'lead-generation',
          'campaigns',
          'analytics',
        ],
      },
      {
        id: 'sales-pipelines',
        name: 'Sales Pipelines',
        description:
          'Sales process automation, quote generation, proposal workflows, and deal tracking systems',
        icon: 'trending-up',
        color: '#10b981',
        templateCount: 0,
        popularTags: ['sales-process', 'quotes', 'proposals', 'deal-tracking', 'revenue'],
      },
      {
        id: 'lead-management',
        name: 'Lead Management',
        description:
          'Lead scoring, qualification, distribution, and nurturing workflows for improved conversion rates',
        icon: 'target',
        color: '#8b5cf6',
        templateCount: 0,
        popularTags: ['lead-scoring', 'qualification', 'nurturing', 'conversion', 'distribution'],
      },
      {
        id: 'customer-onboarding',
        name: 'Customer Onboarding',
        description:
          'Automated onboarding sequences, welcome workflows, and customer success processes',
        icon: 'user-plus',
        color: '#06b6d4',
        templateCount: 0,
        popularTags: ['onboarding', 'welcome-sequence', 'customer-success', 'training', 'setup'],
      },
      {
        id: 'invoice-processing',
        name: 'Invoice Processing',
        description:
          'Automated invoicing, payment tracking, billing workflows, and financial document management',
        icon: 'file-text',
        color: '#f97316',
        templateCount: 0,
        popularTags: ['invoicing', 'billing', 'payments', 'accounting', 'finance'],
      },
    ],
  },

  // ========================
  // DATA PROCESSING & ETL
  // ========================
  'data-processing': {
    id: 'data-processing',
    name: 'Data Processing & ETL',
    description:
      'Data transformation, database synchronization, API data collection, reporting, and analytics workflows',
    icon: 'database',
    color: '#6366f1', // Indigo
    templateCount: 0,
    popularTags: ['etl', 'data-transformation', 'database', 'analytics', 'reporting'],
    subcategories: [
      {
        id: 'data-transformation',
        name: 'Data Transformation',
        description: 'Convert, clean, and transform data between different formats and structures',
        icon: 'shuffle',
        color: '#6366f1',
        templateCount: 0,
        popularTags: [
          'data-cleaning',
          'format-conversion',
          'data-validation',
          'transformation',
          'etl',
        ],
      },
      {
        id: 'database-sync',
        name: 'Database Synchronization',
        description:
          'Keep databases in sync, migrate data, and maintain data consistency across systems',
        icon: 'refresh-cw',
        color: '#10b981',
        templateCount: 0,
        popularTags: ['database-sync', 'data-migration', 'replication', 'backup', 'consistency'],
      },
      {
        id: 'api-collection',
        name: 'API Data Collection',
        description: 'Collect, aggregate, and process data from various APIs and web services',
        icon: 'globe',
        color: '#3b82f6',
        templateCount: 0,
        popularTags: [
          'api-integration',
          'data-collection',
          'web-scraping',
          'aggregation',
          'third-party',
        ],
      },
      {
        id: 'reporting-analytics',
        name: 'Reporting & Analytics',
        description: 'Generate reports, dashboards, and analytics from various data sources',
        icon: 'bar-chart-3',
        color: '#f59e0b',
        templateCount: 0,
        popularTags: ['reporting', 'dashboards', 'analytics', 'kpi', 'business-intelligence'],
      },
      {
        id: 'data-migration',
        name: 'Data Migration',
        description:
          'Migrate data between systems, platforms, and databases with validation and rollback',
        icon: 'move',
        color: '#8b5cf6',
        templateCount: 0,
        popularTags: ['migration', 'platform-switch', 'data-transfer', 'validation', 'rollback'],
      },
      {
        id: 'backup-automation',
        name: 'Backup Automation',
        description: 'Automated backup workflows for databases, files, and system configurations',
        icon: 'hard-drive',
        color: '#64748b',
        templateCount: 0,
        popularTags: ['backup', 'disaster-recovery', 'archival', 'storage', 'automation'],
      },
    ],
  },

  // ========================
  // DEVOPS & CI/CD
  // ========================
  'devops-cicd': {
    id: 'devops-cicd',
    name: 'DevOps & CI/CD',
    description:
      'Deployment automation, testing workflows, monitoring, infrastructure management, and development operations',
    icon: 'server',
    color: '#ef4444', // Red
    templateCount: 0,
    popularTags: ['devops', 'cicd', 'deployment', 'testing', 'monitoring'],
    subcategories: [
      {
        id: 'deployment-automation',
        name: 'Deployment Automation',
        description:
          'Automated deployment pipelines, rollback procedures, and release management workflows',
        icon: 'rocket',
        color: '#ef4444',
        templateCount: 0,
        popularTags: ['deployment', 'pipeline', 'release', 'rollback', 'automation'],
      },
      {
        id: 'testing-workflows',
        name: 'Testing Workflows',
        description: 'Automated testing pipelines, quality assurance, and test result management',
        icon: 'check-circle',
        color: '#10b981',
        templateCount: 0,
        popularTags: ['testing', 'qa', 'unit-tests', 'integration', 'automation'],
      },
      {
        id: 'monitoring-alerting',
        name: 'Monitoring & Alerting',
        description:
          'System monitoring, performance tracking, alerting, and incident response workflows',
        icon: 'activity',
        color: '#f59e0b',
        templateCount: 0,
        popularTags: ['monitoring', 'alerts', 'performance', 'incident-response', 'uptime'],
      },
      {
        id: 'infrastructure-management',
        name: 'Infrastructure Management',
        description:
          'Cloud infrastructure provisioning, scaling, configuration management, and resource optimization',
        icon: 'cloud',
        color: '#06b6d4',
        templateCount: 0,
        popularTags: ['infrastructure', 'cloud', 'scaling', 'provisioning', 'iac'],
      },
      {
        id: 'security-scanning',
        name: 'Security Scanning',
        description: 'Automated security scans, vulnerability assessments, and compliance checking',
        icon: 'shield',
        color: '#8b5cf6',
        templateCount: 0,
        popularTags: ['security', 'vulnerability', 'compliance', 'scanning', 'audit'],
      },
      {
        id: 'backup-recovery',
        name: 'Backup & Recovery',
        description:
          'Disaster recovery workflows, backup verification, and system restoration procedures',
        icon: 'life-buoy',
        color: '#64748b',
        templateCount: 0,
        popularTags: ['backup', 'disaster-recovery', 'restoration', 'verification', 'continuity'],
      },
    ],
  },

  // ========================
  // SOCIAL MEDIA MANAGEMENT
  // ========================
  'social-media': {
    id: 'social-media',
    name: 'Social Media Management',
    description:
      'Content publishing, engagement tracking, cross-platform posting, social listening, and community management',
    icon: 'share-2',
    color: '#ec4899', // Pink
    templateCount: 0,
    popularTags: ['social-media', 'content', 'engagement', 'publishing', 'analytics'],
    subcategories: [
      {
        id: 'content-publishing',
        name: 'Content Publishing',
        description:
          'Automated content scheduling, cross-platform posting, and content distribution workflows',
        icon: 'calendar',
        color: '#ec4899',
        templateCount: 0,
        popularTags: [
          'publishing',
          'scheduling',
          'content-distribution',
          'cross-platform',
          'automation',
        ],
      },
      {
        id: 'engagement-tracking',
        name: 'Engagement Tracking',
        description:
          'Monitor likes, comments, shares, mentions, and engagement metrics across platforms',
        icon: 'heart',
        color: '#f59e0b',
        templateCount: 0,
        popularTags: ['engagement', 'metrics', 'analytics', 'tracking', 'social-listening'],
      },
      {
        id: 'cross-platform-posting',
        name: 'Cross-Platform Posting',
        description:
          'Simultaneously post content across multiple social media platforms with platform-specific optimization',
        icon: 'layers',
        color: '#3b82f6',
        templateCount: 0,
        popularTags: [
          'cross-platform',
          'multi-channel',
          'optimization',
          'content-adaptation',
          'reach',
        ],
      },
      {
        id: 'social-listening',
        name: 'Social Listening',
        description:
          'Monitor brand mentions, sentiment analysis, competitor tracking, and trend identification',
        icon: 'ear',
        color: '#8b5cf6',
        templateCount: 0,
        popularTags: ['social-listening', 'sentiment', 'brand-monitoring', 'trends', 'competitors'],
      },
      {
        id: 'influencer-management',
        name: 'Influencer Management',
        description:
          'Influencer outreach, campaign management, performance tracking, and relationship building',
        icon: 'star',
        color: '#f97316',
        templateCount: 0,
        popularTags: ['influencer', 'outreach', 'campaigns', 'collaboration', 'relationships'],
      },
      {
        id: 'content-curation',
        name: 'Content Curation',
        description: 'Discover, collect, and organize relevant content for sharing and engagement',
        icon: 'bookmark',
        color: '#10b981',
        templateCount: 0,
        popularTags: ['curation', 'content-discovery', 'organization', 'sharing', 'relevance'],
      },
    ],
  },

  // ========================
  // E-COMMERCE AUTOMATION
  // ========================
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce Automation',
    description:
      'Order processing, inventory management, customer service, product management, and sales optimization',
    icon: 'shopping-cart',
    color: '#059669', // Emerald
    templateCount: 0,
    popularTags: ['ecommerce', 'orders', 'inventory', 'customers', 'sales'],
    subcategories: [
      {
        id: 'order-processing',
        name: 'Order Processing',
        description: 'Automated order fulfillment, shipping workflows, and order status management',
        icon: 'package',
        color: '#059669',
        templateCount: 0,
        popularTags: ['orders', 'fulfillment', 'shipping', 'tracking', 'processing'],
      },
      {
        id: 'inventory-management',
        name: 'Inventory Management',
        description:
          'Stock tracking, reorder automation, supplier management, and inventory optimization',
        icon: 'box',
        color: '#f59e0b',
        templateCount: 0,
        popularTags: ['inventory', 'stock', 'reorder', 'suppliers', 'optimization'],
      },
      {
        id: 'customer-service',
        name: 'Customer Service',
        description:
          'Support ticket automation, FAQ responses, returns processing, and customer communication',
        icon: 'headphones',
        color: '#3b82f6',
        templateCount: 0,
        popularTags: ['support', 'tickets', 'returns', 'communication', 'service'],
      },
      {
        id: 'product-management',
        name: 'Product Management',
        description:
          'Product catalog updates, pricing optimization, competitor analysis, and product lifecycle management',
        icon: 'package-2',
        color: '#8b5cf6',
        templateCount: 0,
        popularTags: ['products', 'catalog', 'pricing', 'competitors', 'lifecycle'],
      },
      {
        id: 'payment-processing',
        name: 'Payment Processing',
        description:
          'Payment verification, refund automation, subscription management, and financial reconciliation',
        icon: 'credit-card',
        color: '#10b981',
        templateCount: 0,
        popularTags: ['payments', 'refunds', 'subscriptions', 'billing', 'reconciliation'],
      },
      {
        id: 'shipping-logistics',
        name: 'Shipping & Logistics',
        description:
          'Shipping rate calculation, carrier integration, delivery tracking, and logistics optimization',
        icon: 'truck',
        color: '#f97316',
        templateCount: 0,
        popularTags: ['shipping', 'logistics', 'carriers', 'tracking', 'delivery'],
      },
    ],
  },

  // ========================
  // FINANCIAL & ACCOUNTING
  // ========================
  financial: {
    id: 'financial',
    name: 'Financial & Accounting',
    description:
      'Invoice processing, payment automation, financial reporting, expense management, and compliance workflows',
    icon: 'dollar-sign',
    color: '#eab308', // Yellow
    templateCount: 0,
    popularTags: ['finance', 'accounting', 'invoicing', 'payments', 'reporting'],
    subcategories: [
      {
        id: 'invoice-processing',
        name: 'Invoice Processing',
        description:
          'Automated invoice generation, approval workflows, and payment tracking systems',
        icon: 'file-text',
        color: '#eab308',
        templateCount: 0,
        popularTags: ['invoicing', 'approval', 'payment-tracking', 'billing', 'automation'],
      },
      {
        id: 'payment-automation',
        name: 'Payment Automation',
        description:
          'Automated payment processing, recurring billing, payment reminders, and reconciliation',
        icon: 'banknote',
        color: '#10b981',
        templateCount: 0,
        popularTags: ['payments', 'billing', 'reminders', 'reconciliation', 'recurring'],
      },
      {
        id: 'financial-reporting',
        name: 'Financial Reporting',
        description:
          'Generate financial statements, budgets, forecasts, and compliance reports automatically',
        icon: 'chart-line',
        color: '#3b82f6',
        templateCount: 0,
        popularTags: ['reporting', 'statements', 'budgets', 'forecasts', 'compliance'],
      },
      {
        id: 'expense-management',
        name: 'Expense Management',
        description:
          'Expense tracking, approval workflows, reimbursement processing, and policy compliance',
        icon: 'receipt',
        color: '#f97316',
        templateCount: 0,
        popularTags: ['expenses', 'reimbursement', 'approval', 'policy', 'tracking'],
      },
      {
        id: 'tax-automation',
        name: 'Tax Automation',
        description:
          'Tax calculation, filing preparation, compliance monitoring, and regulatory reporting',
        icon: 'calculator',
        color: '#8b5cf6',
        templateCount: 0,
        popularTags: ['tax', 'compliance', 'filing', 'calculation', 'regulatory'],
      },
      {
        id: 'compliance-reporting',
        name: 'Compliance Reporting',
        description:
          'Regulatory compliance, audit preparation, risk assessment, and governance workflows',
        icon: 'shield-check',
        color: '#64748b',
        templateCount: 0,
        popularTags: ['compliance', 'audit', 'risk', 'governance', 'regulatory'],
      },
    ],
  },

  // ========================
  // HUMAN RESOURCES
  // ========================
  'human-resources': {
    id: 'human-resources',
    name: 'Human Resources',
    description:
      'Employee onboarding, performance management, recruitment workflows, and HR automation',
    icon: 'users',
    color: '#06b6d4', // Cyan
    templateCount: 0,
    popularTags: ['hr', 'employees', 'recruitment', 'onboarding', 'performance'],
    subcategories: [
      {
        id: 'employee-onboarding',
        name: 'Employee Onboarding',
        description:
          'New hire workflows, document collection, training schedules, and onboarding checklists',
        icon: 'user-check',
        color: '#06b6d4',
        templateCount: 0,
        popularTags: ['onboarding', 'new-hire', 'training', 'documents', 'checklist'],
      },
      {
        id: 'recruitment-workflows',
        name: 'Recruitment Workflows',
        description:
          'Job posting, candidate screening, interview scheduling, and hiring decision workflows',
        icon: 'search',
        color: '#8b5cf6',
        templateCount: 0,
        popularTags: ['recruitment', 'hiring', 'candidates', 'interviews', 'screening'],
      },
      {
        id: 'performance-management',
        name: 'Performance Management',
        description:
          'Performance reviews, goal setting, feedback collection, and employee development tracking',
        icon: 'target',
        color: '#f59e0b',
        templateCount: 0,
        popularTags: ['performance', 'reviews', 'goals', 'feedback', 'development'],
      },
      {
        id: 'leave-management',
        name: 'Leave Management',
        description: 'Time-off requests, approval workflows, leave balances, and absence tracking',
        icon: 'calendar-x',
        color: '#10b981',
        templateCount: 0,
        popularTags: ['leave', 'time-off', 'approval', 'absence', 'balance'],
      },
    ],
  },

  // ========================
  // EDUCATION & TRAINING
  // ========================
  education: {
    id: 'education',
    name: 'Education & Training',
    description:
      'Course management, student onboarding, assessment workflows, and educational automation',
    icon: 'graduation-cap',
    color: '#7c3aed', // Violet
    templateCount: 0,
    popularTags: ['education', 'training', 'courses', 'students', 'assessment'],
    subcategories: [
      {
        id: 'course-management',
        name: 'Course Management',
        description:
          'Course creation, enrollment workflows, content delivery, and progress tracking',
        icon: 'book-open',
        color: '#7c3aed',
        templateCount: 0,
        popularTags: ['courses', 'enrollment', 'content', 'progress', 'management'],
      },
      {
        id: 'student-workflows',
        name: 'Student Workflows',
        description:
          'Student registration, communication, support requests, and engagement tracking',
        icon: 'user-graduate',
        color: '#06b6d4',
        templateCount: 0,
        popularTags: ['students', 'registration', 'communication', 'support', 'engagement'],
      },
      {
        id: 'assessment-automation',
        name: 'Assessment Automation',
        description:
          'Assignment grading, quiz automation, feedback delivery, and performance analytics',
        icon: 'clipboard-check',
        color: '#10b981',
        templateCount: 0,
        popularTags: ['assessment', 'grading', 'quiz', 'feedback', 'analytics'],
      },
    ],
  },
}

/**
 * Category Management Service
 *
 * Provides comprehensive category management functionality including:
 * - Category hierarchy navigation and management
 * - Template count tracking and analytics
 * - Popular tag analysis and trending detection
 * - Category-based search optimization
 * - Dynamic category creation and maintenance
 */
export class CategoryManager {
  private readonly requestId: string
  private readonly logger = createLogger('CategoryManager')

  constructor(requestId?: string) {
    this.requestId = requestId || crypto.randomUUID().slice(0, 8)

    this.logger.info(`[${this.requestId}] CategoryManager initialized`, {
      categoryCount: Object.keys(TEMPLATE_CATEGORIES).length,
      totalSubcategories: this.getTotalSubcategoryCount(),
    })
  }

  /**
   * Get all top-level categories with metadata
   */
  getAllCategories(): TemplateCategory[] {
    return Object.values(TEMPLATE_CATEGORIES)
  }

  /**
   * Get a specific category by ID with subcategories
   */
  getCategoryById(categoryId: string): TemplateCategory | null {
    return TEMPLATE_CATEGORIES[categoryId] || null
  }

  /**
   * Get all subcategories across all categories
   */
  getAllSubcategories(): TemplateCategory[] {
    const subcategories: TemplateCategory[] = []

    Object.values(TEMPLATE_CATEGORIES).forEach((category) => {
      if (category.subcategories) {
        subcategories.push(...category.subcategories)
      }
    })

    return subcategories
  }

  /**
   * Find categories by search term
   */
  searchCategories(searchTerm: string): TemplateCategory[] {
    const term = searchTerm.toLowerCase()
    const matches: TemplateCategory[] = []

    Object.values(TEMPLATE_CATEGORIES).forEach((category) => {
      // Check main category
      if (
        category.name.toLowerCase().includes(term) ||
        category.description.toLowerCase().includes(term) ||
        category.popularTags.some((tag) => tag.toLowerCase().includes(term))
      ) {
        matches.push(category)
      }

      // Check subcategories
      if (category.subcategories) {
        const matchingSubcategories = category.subcategories.filter(
          (sub) =>
            sub.name.toLowerCase().includes(term) ||
            sub.description.toLowerCase().includes(term) ||
            sub.popularTags.some((tag) => tag.toLowerCase().includes(term))
        )

        if (matchingSubcategories.length > 0) {
          matches.push({
            ...category,
            subcategories: matchingSubcategories,
          })
        }
      }
    })

    return matches
  }

  /**
   * Get popular tags across all categories
   */
  getAllPopularTags(): { tag: string; count: number; categories: string[] }[] {
    const tagMap = new Map<string, { count: number; categories: Set<string> }>()

    Object.values(TEMPLATE_CATEGORIES).forEach((category) => {
      category.popularTags.forEach((tag) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { count: 0, categories: new Set() })
        }
        const tagData = tagMap.get(tag)!
        tagData.count += 1
        tagData.categories.add(category.name)

        // Include subcategory tags
        if (category.subcategories) {
          category.subcategories.forEach((sub) => {
            if (sub.popularTags.includes(tag)) {
              tagData.count += 1
              tagData.categories.add(sub.name)
            }
          })
        }
      })
    })

    return Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        categories: Array.from(data.categories),
      }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Get category hierarchy for navigation
   */
  getCategoryHierarchy(): Array<{
    category: TemplateCategory
    subcategories: TemplateCategory[]
    path: string[]
  }> {
    return Object.values(TEMPLATE_CATEGORIES).map((category) => ({
      category,
      subcategories: category.subcategories || [],
      path: [category.id],
    }))
  }

  /**
   * Update template counts for categories (would be called from template service)
   */
  async updateTemplateCounts(categoryCounts: Record<string, number>): Promise<void> {
    this.logger.info(`[${this.requestId}] Updating template counts`, { categoryCounts })

    // In a real implementation, this would update the database
    // For now, we'll just log the operation
    Object.entries(categoryCounts).forEach(([categoryId, count]) => {
      if (TEMPLATE_CATEGORIES[categoryId]) {
        TEMPLATE_CATEGORIES[categoryId].templateCount = count
      }
    })
  }

  /**
   * Get category statistics for analytics
   */
  getCategoryStats(): {
    totalCategories: number
    totalSubcategories: number
    totalTags: number
    averageTemplatesPerCategory: number
    topCategories: Array<{ category: string; templateCount: number }>
  } {
    const totalCategories = Object.keys(TEMPLATE_CATEGORIES).length
    const totalSubcategories = this.getTotalSubcategoryCount()
    const allTags = this.getAllPopularTags()
    const totalTags = allTags.length

    const categoryTemplateList = Object.values(TEMPLATE_CATEGORIES)
      .map((cat) => ({ category: cat.name, templateCount: cat.templateCount }))
      .sort((a, b) => b.templateCount - a.templateCount)

    const totalTemplates = categoryTemplateList.reduce((sum, cat) => sum + cat.templateCount, 0)
    const averageTemplatesPerCategory = totalCategories > 0 ? totalTemplates / totalCategories : 0

    return {
      totalCategories,
      totalSubcategories,
      totalTags,
      averageTemplatesPerCategory: Math.round(averageTemplatesPerCategory),
      topCategories: categoryTemplateList.slice(0, 5),
    }
  }

  /**
   * Validate category ID exists
   */
  isValidCategory(categoryId: string): boolean {
    if (TEMPLATE_CATEGORIES[categoryId]) {
      return true
    }

    // Check subcategories
    return Object.values(TEMPLATE_CATEGORIES).some((category) =>
      category.subcategories?.some((sub) => sub.id === categoryId)
    )
  }

  /**
   * Get breadcrumb path for a category
   */
  getCategoryBreadcrumb(categoryId: string): Array<{ id: string; name: string }> {
    // Check main categories
    if (TEMPLATE_CATEGORIES[categoryId]) {
      return [{ id: categoryId, name: TEMPLATE_CATEGORIES[categoryId].name }]
    }

    // Check subcategories
    for (const [mainCatId, category] of Object.entries(TEMPLATE_CATEGORIES)) {
      if (category.subcategories) {
        const subcategory = category.subcategories.find((sub) => sub.id === categoryId)
        if (subcategory) {
          return [
            { id: mainCatId, name: category.name },
            { id: categoryId, name: subcategory.name },
          ]
        }
      }
    }

    return []
  }

  private getTotalSubcategoryCount(): number {
    return Object.values(TEMPLATE_CATEGORIES).reduce(
      (count, category) => count + (category.subcategories?.length || 0),
      0
    )
  }
}

// Export singleton instance
export const categoryManager = new CategoryManager()

/**
 * Utility functions for category operations
 */
export const CategoryUtils = {
  /**
   * Format category name for display
   */
  formatCategoryName(categoryId: string): string {
    return categoryId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  },

  /**
   * Generate category slug from name
   */
  generateCategorySlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  },

  /**
   * Get category color with fallback
   */
  getCategoryColor(category: TemplateCategory): string {
    return category.color || '#64748b' // Default gray
  },

  /**
   * Get category icon with fallback
   */
  getCategoryIcon(category: TemplateCategory): string {
    return category.icon || 'folder' // Default folder icon
  },

  /**
   * Filter categories by template count
   */
  filterCategoriesByTemplateCount(
    categories: TemplateCategory[],
    minCount = 1
  ): TemplateCategory[] {
    return categories.filter((category) => category.templateCount >= minCount)
  },

  /**
   * Sort categories by various criteria
   */
  sortCategories(
    categories: TemplateCategory[],
    sortBy: 'name' | 'templateCount' | 'id' = 'name',
    order: 'asc' | 'desc' = 'asc'
  ): TemplateCategory[] {
    return [...categories].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'templateCount':
          comparison = a.templateCount - b.templateCount
          break
        case 'id':
          comparison = a.id.localeCompare(b.id)
          break
      }

      return order === 'asc' ? comparison : -comparison
    })
  },
}
