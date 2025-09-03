import type { MetadataRoute } from 'next'
import { getBrandConfig } from '@/lib/branding/branding'

/**
 * Enhanced PWA Manifest for Mobile-Optimized Sim Workflow Management
 *
 * Provides comprehensive Progressive Web App configuration with:
 * - Native-like mobile experience with standalone display
 * - Complete icon set for all mobile platforms and sizes
 * - Optimized orientation and display settings for workflow management
 * - Advanced PWA features including shortcuts and categories
 * - Screenshot support for app store presentation
 *
 * Mobile Optimization Features:
 * - Touch-friendly interaction patterns
 * - Offline-first architecture support
 * - Installation prompts and native-like behavior
 * - Background sync capabilities
 * - Push notification foundation
 */
export default function manifest(): MetadataRoute.Manifest {
  const brand = getBrandConfig()

  return {
    // Core App Identity
    name: `${brand.name} - AI Workflow Builder`,
    short_name: brand.name,
    description:
      'Build and deploy AI agents using our mobile-optimized workflow builder. Create, monitor, and manage AI workflows on any device with touch-friendly interface and offline capabilities.',

    // PWA Configuration
    start_url: '/',
    display: 'standalone', // Native-like app experience
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'], // Progressive enhancement
    orientation: 'any', // Support all orientations for flexible workflow building

    // Visual Branding
    background_color: brand.theme?.backgroundColor || '#701FFC',
    theme_color: brand.theme?.primaryColor || '#701FFC',

    // Comprehensive Icon Set for All Platforms
    icons: [
      // Android Icons
      {
        src: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable', // Supports both standard and maskable formats
      },
      {
        src: '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      // iOS Icons (Apple Touch)
      {
        src: '/favicon/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      // Favicon variations
      {
        src: '/favicon/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
    ],

    // App Categories for Better Discovery
    categories: ['business', 'productivity', 'utilities', 'developer'],

    // App Shortcuts for Quick Actions (Android/Chrome)
    shortcuts: [
      {
        name: 'Create Workflow',
        short_name: 'Create',
        description: 'Quickly create a new AI workflow',
        url: '/workspace?action=create',
        icons: [
          {
            src: '/icon.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'Monitor Workflows',
        short_name: 'Monitor',
        description: 'View workflow execution status and logs',
        url: '/workspace?tab=logs',
        icons: [
          {
            src: '/icon.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'Template Library',
        short_name: 'Templates',
        description: 'Browse pre-built workflow templates',
        url: '/workspace/templates',
        icons: [
          {
            src: '/icon.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
          },
        ],
      },
    ],

    // Mobile-Specific Features
    prefer_related_applications: false, // Prefer PWA over native app store
    related_applications: [], // Can be populated with future native apps

    // Screenshots for App Store-like presentation (supported by some browsers)
    screenshots: [
      {
        src: '/static/mobile-workflow-builder.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow', // Mobile portrait
        label: 'Mobile Workflow Builder - Create AI workflows with touch-optimized interface',
      },
      {
        src: '/static/mobile-dashboard.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Mobile Dashboard - Monitor workflow execution status and performance',
      },
      {
        src: '/static/tablet-workflow-canvas.png',
        sizes: '1024x768',
        type: 'image/png',
        form_factor: 'wide', // Tablet landscape
        label: 'Tablet Canvas - Full workflow building experience optimized for larger screens',
      },
    ],

    // Advanced PWA Features
    edge_side_panel: {
      preferred_width: 400, // Optimal width for workflow panels
    },

    // Scope and Navigation
    scope: '/',
    id: 'sim-workflow-builder', // Unique identifier for the PWA

    // Launch Configuration
    launch_handler: {
      client_mode: 'navigate-existing', // Focus existing instance rather than opening new
    },

    // Protocol Handlers (Future: sim:// URL scheme)
    protocol_handlers: [
      {
        protocol: 'web+sim',
        url: '/workspace/import?url=%s',
      },
    ],
  }
}
