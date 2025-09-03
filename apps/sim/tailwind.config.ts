/**
 * Tailwind CSS Configuration for Sim AI Platform
 *
 * This configuration extends Tailwind CSS with custom design tokens, animations,
 * and utility classes specifically designed for the Sim AI platform.
 *
 * Key Features:
 * - CSS-in-JS theme integration with CSS custom properties
 * - Custom color palette supporting light/dark themes
 * - Advanced animations for UI interactions and feedback
 * - Design system consistency with reusable spacing and typography
 * - Performance-optimized content scanning patterns
 *
 * Architecture:
 * - Uses HSL color space for better theme variations
 * - CSS custom properties for runtime theme switching
 * - Semantic color naming for consistent UI patterns
 * - Custom animations for enhanced user experience
 *
 * @see https://tailwindcss.com/docs/configuration
 * @see https://ui.shadcn.com/docs/theming
 */

import type { Config } from 'tailwindcss'

export default {
  /**
   * Dark Mode Configuration
   * Uses CSS class strategy for manual theme switching
   * Allows precise control over theme application and user preference persistence
   */
  darkMode: ['class'],

  /**
   * Content Sources for CSS Generation
   * Defines file patterns that Tailwind scans for class usage
   * Optimized to include all component files while excluding dependencies
   */
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}', // Next.js pages directory
    './components/**/*.{js,ts,jsx,tsx,mdx}', // React components
    './app/**/*.{js,ts,jsx,tsx,mdx}', // App Router directory
    '!./app/node_modules/**', // Exclude app-level node_modules
    '!**/node_modules/**', // Exclude all node_modules directories
  ],
  /**
   * Theme Configuration
   * Extends Tailwind's default theme with custom design tokens
   * Uses CSS custom properties for runtime theme switching
   */
  theme: {
    extend: {
      /**
       * Color Palette
       * Semantic color system using CSS custom properties
       * Supports light/dark themes through HSL color space
       * Each color references a CSS variable for dynamic theming
       */
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        gradient: {
          primary: 'hsl(var(--gradient-primary))',
          secondary: 'hsl(var(--gradient-secondary))',
        },
      },
      fontWeight: {
        medium: '460',
        semibold: '540',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionProperty: {
        width: 'width',
        left: 'left',
        padding: 'padding',
      },
      keyframes: {
        'slide-down': {
          '0%': {
            transform: 'translate(-50%, -100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translate(-50%, 0)',
            opacity: '1',
          },
        },
        'notification-slide': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-100%)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'notification-fade-out': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(0)',
          },
        },
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'rocket-pulse': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.7',
          },
        },
        'run-glow': {
          '0%, 100%': {
            filter: 'opacity(1)',
          },
          '50%': {
            filter: 'opacity(0.7)',
          },
        },
        'caret-blink': {
          '0%,70%,100%': {
            opacity: '1',
          },
          '20%,50%': {
            opacity: '0',
          },
        },
        'pulse-slow': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.7',
          },
        },
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.3s ease-out',
        'notification-slide': 'notification-slide 0.3s ease-out forwards',
        'notification-fade-out': 'notification-fade-out 0.2s ease-out forwards',
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'rocket-pulse': 'rocket-pulse 1.5s ease-in-out infinite',
        'run-glow': 'run-glow 2s ease-in-out infinite',
        'caret-blink': 'caret-blink 1.25s ease-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
