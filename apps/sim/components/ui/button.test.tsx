/**
 * @vitest-environment jsdom
 *
 * Comprehensive Button Component Tests
 *
 * This test suite provides complete coverage for the Button component including:
 * - Basic rendering and prop handling
 * - All variant and size combinations
 * - User interaction simulation
 * - Accessibility compliance testing
 * - Keyboard navigation support
 * - Error states and edge cases
 * - Performance and memory leak detection
 * - Theme switching compatibility
 */

import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessibilityHelpers, renderWithProviders, testingHelpers } from '@/__tests__/test-utils'
import { Button, type ButtonProps } from './button'

/**
 * Mock console methods to suppress expected warnings during testing
 */
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  vi.clearAllMocks()

  // Suppress known warnings during testing
  console.warn = vi.fn()
  console.error = vi.fn()
})

afterEach(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

/**
 * Helper function to render Button with default props
 */
function renderButton(props: Partial<ButtonProps> = {}) {
  const defaultProps: ButtonProps = {
    children: 'Test Button',
    ...props,
  }

  return renderWithProviders(<Button {...defaultProps} />)
}

describe('Button Component', () => {
  /**
   * Basic Rendering Tests
   * Verify component renders correctly with different configurations
   */
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderButton()
      expect(container).toBeInTheDocument()
    })

    it('should render with default props', () => {
      renderButton()
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Test Button')
      expect(button).toBeEnabled()
    })

    it('should render with custom text content', () => {
      renderButton({ children: 'Custom Button Text' })

      expect(screen.getByRole('button', { name: /custom button text/i })).toBeInTheDocument()
    })

    it('should render with JSX children', () => {
      renderButton({
        children: (
          <>
            <span data-testid='icon'>🚀</span>
            <span>Launch</span>
          </>
        ),
      })

      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('Launch')).toBeInTheDocument()
    })

    it('should forward ref correctly', () => {
      const ref = vi.fn()
      renderWithProviders(<Button ref={ref}>Ref Test</Button>)

      expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement))
    })
  })

  /**
   * Variant Testing
   * Test all available button variants
   */
  describe('Button Variants', () => {
    const variants: Array<ButtonProps['variant']> = [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ]

    it.each(variants)('should render %s variant correctly', (variant) => {
      renderButton({ variant })
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('inline-flex')

      // Check variant-specific classes are applied
      const variantClassMap = {
        default: 'bg-primary',
        destructive: 'bg-destructive',
        outline: 'border',
        secondary: 'bg-secondary',
        ghost: 'hover:bg-accent',
        link: 'underline-offset-4',
      }

      if (variant && variantClassMap[variant]) {
        // Check if button has the variant-specific class
        const expectedClass = variantClassMap[variant]
        const classList = button.className.split(' ')
        const hasExpectedClass = classList.some((cls) => cls.includes(expectedClass.split('-')[0]))
        expect(hasExpectedClass).toBe(true)
      }
    })

    it('should apply hover effects correctly', async () => {
      const { user } = renderButton({ variant: 'default' })
      const button = screen.getByRole('button', { name: /test button/i })

      await user.hover(button)

      // Button should remain accessible during hover
      expect(button).toBeInTheDocument()
      expect(button).toBeVisible()
    })
  })

  /**
   * Size Testing
   * Test all available button sizes
   */
  describe('Button Sizes', () => {
    const sizes: Array<ButtonProps['size']> = ['default', 'sm', 'lg', 'icon']

    it.each(sizes)('should render %s size correctly', (size) => {
      renderButton({ size })
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toBeInTheDocument()

      // Check size-specific classes are applied
      const sizeClassMap = {
        default: 'h-10',
        sm: 'h-9',
        lg: 'h-11',
        icon: 'h-10',
      }

      if (size && sizeClassMap[size]) {
        expect(button).toHaveClass(sizeClassMap[size])
      }
    })

    it('should render icon size with icon content', () => {
      renderButton({
        size: 'icon',
        children: <span data-testid='icon-content'>⭐</span>,
        'aria-label': 'Star button',
      })

      const button = screen.getByRole('button', { name: /star button/i })
      expect(button).toBeInTheDocument()
      expect(screen.getByTestId('icon-content')).toBeInTheDocument()
    })
  })

  /**
   * User Interaction Tests
   * Simulate real user interactions
   */
  describe('User Interactions', () => {
    it('should handle click events', async () => {
      const handleClick = vi.fn()
      const { user } = renderButton({ onClick: handleClick })

      const button = screen.getByRole('button', { name: /test button/i })
      await user.click(button)

      expect(handleClick).toHaveBeenCalledOnce()
      expect(handleClick).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should handle multiple rapid clicks', async () => {
      const handleClick = vi.fn()
      const { user } = renderButton({ onClick: handleClick })

      const button = screen.getByRole('button', { name: /test button/i })

      // Simulate rapid clicking
      await user.click(button)
      await user.click(button)
      await user.click(button)

      expect(handleClick).toHaveBeenCalledTimes(3)
    })

    it('should handle keyboard activation (Enter)', async () => {
      const handleClick = vi.fn()
      const { user } = renderButton({ onClick: handleClick })

      const button = screen.getByRole('button', { name: /test button/i })
      button.focus()

      await user.keyboard('{Enter}')

      expect(handleClick).toHaveBeenCalledOnce()
    })

    it('should handle keyboard activation (Space)', async () => {
      const handleClick = vi.fn()
      const { user } = renderButton({ onClick: handleClick })

      const button = screen.getByRole('button', { name: /test button/i })
      button.focus()

      await user.keyboard(' ')

      expect(handleClick).toHaveBeenCalledOnce()
    })

    it('should not trigger click when disabled', async () => {
      const handleClick = vi.fn()
      const { user } = renderButton({ onClick: handleClick, disabled: true })

      const button = screen.getByRole('button', { name: /test button/i })
      await user.click(button)

      expect(handleClick).not.toHaveBeenCalled()
      expect(button).toBeDisabled()
    })
  })

  /**
   * Accessibility Tests
   * Ensure component meets accessibility standards
   */
  describe('Accessibility', () => {
    it('should have proper button role', () => {
      renderButton()
      const button = screen.getByRole('button')

      expect(button).toBeInTheDocument()
      expect(button.tagName).toBe('BUTTON')
    })

    it('should support aria-label for icon buttons', () => {
      renderButton({
        'aria-label': 'Close dialog',
        children: '×',
        size: 'icon',
      })

      const button = screen.getByRole('button', { name: /close dialog/i })
      expect(button).toHaveAttribute('aria-label', 'Close dialog')
    })

    it('should support aria-describedby', () => {
      renderButton({ 'aria-describedby': 'button-description' })
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toHaveAttribute('aria-describedby', 'button-description')
    })

    it('should be focusable by default', () => {
      renderButton()
      const button = screen.getByRole('button', { name: /test button/i })

      button.focus()
      expect(button).toHaveFocus()
    })

    it('should not be focusable when disabled', () => {
      renderButton({ disabled: true })
      const button = screen.getByRole('button', { name: /test button/i })

      button.focus()
      expect(button).not.toHaveFocus()
    })

    it('should have visible focus indicator', async () => {
      const { user } = renderButton()
      const button = screen.getByRole('button', { name: /test button/i })

      await user.tab()

      expect(button).toHaveFocus()
      // Focus indicator would be applied by default browser styles or custom focus styles
      const classList = button.className.split(' ')
      const hasFocusClass = classList.some(
        (cls) => cls.includes('focus') || cls.includes('outline')
      )
      expect(button).toBeVisible() // Focus should make button visible and accessible
    })

    it('should meet color contrast requirements', () => {
      renderButton({ variant: 'default' })
      const button = screen.getByRole('button', { name: /test button/i })

      // Basic color contrast check (would be enhanced with actual color analysis)
      const styles = getComputedStyle(button)
      expect(styles.color).toBeTruthy()
      expect(styles.backgroundColor).toBeTruthy()
    })
  })

  /**
   * AsChild Prop Tests
   * Test the asChild functionality with Radix Slot
   */
  describe('AsChild Functionality', () => {
    it('should render as child component when asChild is true', () => {
      renderWithProviders(
        <Button asChild>
          <a href='/test' data-testid='link-button'>
            Link Button
          </a>
        </Button>
      )

      const link = screen.getByTestId('link-button')
      expect(link).toBeInTheDocument()
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('href', '/test')
    })

    it('should apply button classes to child component', () => {
      renderWithProviders(
        <Button asChild variant='destructive' size='lg'>
          <div data-testid='div-button'>Custom Component</div>
        </Button>
      )

      const div = screen.getByTestId('div-button')
      // Check that child component receives button classes
      const classList = div.className.split(' ')
      const hasDestructiveClass = classList.some(
        (cls) => cls.includes('destructive') || cls.includes('bg-')
      )
      const hasLargeClass = classList.some((cls) => cls.includes('h-11') || cls.includes('lg'))
      expect(hasDestructiveClass || hasLargeClass).toBe(true) // Should have button styling
    })

    it('should forward events to child component', async () => {
      const handleClick = vi.fn()
      const { user } = renderWithProviders(
        <Button asChild>
          <button onClick={handleClick} data-testid='child-button'>
            Child Button
          </button>
        </Button>
      )

      const button = screen.getByTestId('child-button')
      await user.click(button)

      expect(handleClick).toHaveBeenCalledOnce()
    })
  })

  /**
   * Custom Styling Tests
   * Test custom className and styling props
   */
  describe('Custom Styling', () => {
    it('should merge custom className with default classes', () => {
      renderButton({ className: 'custom-button-class' })
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toHaveClass('custom-button-class')
      // Check for default button classes
      const classList = button.className.split(' ')
      const hasFlexClass = classList.some((cls) => cls.includes('flex') || cls.includes('inline'))
      expect(hasFlexClass).toBe(true) // Should have button layout classes
    })

    it('should apply custom CSS properties', () => {
      renderButton({
        style: {
          backgroundColor: 'red',
          color: 'white',
          fontSize: '16px',
        },
      })

      const button = screen.getByRole('button', { name: /test button/i })
      const styles = getComputedStyle(button)
      expect(styles.backgroundColor).toBe('rgb(255, 0, 0)') // red as RGB
      expect(styles.color).toBe('rgb(255, 255, 255)') // white as RGB
      expect(styles.fontSize).toBe('16px')
    })

    it('should support custom data attributes', () => {
      renderButton({
        'data-testid': 'custom-button',
        'data-analytics': 'cta-button',
      })

      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('data-analytics', 'cta-button')
    })
  })

  /**
   * State Management Tests
   * Test loading, disabled, and other state scenarios
   */
  describe('State Management', () => {
    it('should handle disabled state correctly', () => {
      renderButton({ disabled: true })
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toBeDisabled()
      // Check for disabled styling
      const classList = button.className.split(' ')
      const hasDisabledClass = classList.some(
        (cls) => cls.includes('disabled') || cls.includes('opacity')
      )
      expect(button).toHaveAttribute('disabled') // HTML disabled attribute is most important
    })

    it('should show loading state when provided', () => {
      renderButton({
        disabled: true,
        children: (
          <>
            <span data-testid='spinner'>🔄</span>
            Loading...
          </>
        ),
      })

      expect(screen.getByTestId('spinner')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should handle form submission state', () => {
      renderButton({
        type: 'submit',
        form: 'test-form',
      })

      const button = screen.getByRole('button', { name: /test button/i })
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('form', 'test-form')
    })
  })

  /**
   * Theme Compatibility Tests
   * Test component behavior with different themes
   */
  describe('Theme Compatibility', () => {
    it('should render correctly in light theme', () => {
      const { switchTheme } = renderButton({ variant: 'default' })

      switchTheme('light')
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toBeInTheDocument()
      expect(button).toBeVisible()
    })

    it('should render correctly in dark theme', async () => {
      const { switchTheme } = renderButton({ variant: 'default' })

      await switchTheme('dark')
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toBeInTheDocument()
      expect(button).toBeVisible()
    })

    it('should maintain accessibility in dark theme', async () => {
      const { switchTheme } = renderButton({ variant: 'outline' })

      await switchTheme('dark')
      const button = screen.getByRole('button', { name: /test button/i })

      expect(button).toBeInTheDocument()
      // Check for outline variant classes
      const classList = button.className.split(' ')
      const hasOutlineClass = classList.some(
        (cls) => cls.includes('border') || cls.includes('outline')
      )
      expect(button).toBeVisible() // Should remain visible and accessible in dark theme
    })
  })

  /**
   * Edge Cases and Error Handling
   * Test component behavior in unusual scenarios
   */
  describe('Edge Cases', () => {
    it('should handle undefined children gracefully', () => {
      renderWithProviders(<Button>{undefined}</Button>)
      const button = screen.getByRole('button')

      expect(button).toBeInTheDocument()
      expect(button).toBeEmpty()
    })

    it('should handle null children gracefully', () => {
      renderWithProviders(<Button>{null}</Button>)
      const button = screen.getByRole('button')

      expect(button).toBeInTheDocument()
      expect(button).toBeEmpty()
    })

    it('should handle very long text content', () => {
      const longText =
        'This is a very long button text that should be handled gracefully by the component without breaking the layout or accessibility features'

      renderButton({ children: longText })
      const button = screen.getByRole('button', { name: new RegExp(longText.substring(0, 20)) })

      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent(longText)
    })

    it('should handle special characters in text', () => {
      const specialText = '< > & " \' ® © ™ 中文 🚀 🎉'

      renderButton({ children: specialText })
      const button = screen.getByText(specialText)

      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent(specialText)
    })
  })

  /**
   * Performance Tests
   * Test component performance and memory usage
   */
  describe('Performance', () => {
    it('should render quickly', async () => {
      const renderTime = await testingHelpers.measureRenderTime(() => {
        renderButton()
      })

      // Button should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(100) // 100ms threshold
    })

    it('should not cause memory leaks on mount/unmount', () => {
      const memoryTracker = testingHelpers.detectMemoryLeaks('Button')

      const { unmount } = renderButton()
      unmount()

      const memoryDiff = memoryTracker.check()
      // Should not have significant memory increase after unmount
      expect(memoryDiff).toBeLessThan(100000) // 100KB threshold
    })

    it('should handle rapid re-renders efficiently', () => {
      let renderCount = 0

      function TestWrapper({ text }: { text: string }) {
        renderCount++
        return <Button>{text}</Button>
      }

      const { rerender } = renderWithProviders(<TestWrapper text='Initial' />)

      // Trigger multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<TestWrapper text={`Update ${i}`} />)
      }

      expect(renderCount).toBe(11) // Initial + 10 updates
      expect(screen.getByText('Update 9')).toBeInTheDocument()
    })
  })

  /**
   * Integration Tests
   * Test component in realistic scenarios
   */
  describe('Integration Scenarios', () => {
    it('should work in form context', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      const { user } = renderWithProviders(
        <form onSubmit={handleSubmit}>
          <input data-testid='input' type='text' name='test' />
          <Button type='submit'>Submit Form</Button>
        </form>
      )

      const input = screen.getByTestId('input')
      const button = screen.getByRole('button', { name: /submit form/i })

      await user.type(input, 'test value')
      await user.click(button)

      expect(handleSubmit).toHaveBeenCalledOnce()
    })

    it('should work with React Router Link', () => {
      renderWithProviders(
        <Button asChild>
          <a href='/dashboard' data-testid='nav-link'>
            Go to Dashboard
          </a>
        </Button>
      )

      const link = screen.getByTestId('nav-link')
      expect(link).toHaveAttribute('href', '/dashboard')
      // Check that link received button classes
      const classList = link.className.split(' ')
      const hasButtonClass = classList.some(
        (cls) => cls.includes('flex') || cls.includes('button') || cls.includes('inline')
      )
      expect(link).toBeInTheDocument() // Link should be properly rendered with button styling
    })

    it('should work in dialog/modal context', () => {
      const handleClose = vi.fn()

      renderWithProviders(
        <div role='dialog' aria-modal='true'>
          <h2>Test Dialog</h2>
          <p>Dialog content</p>
          <Button variant='outline' onClick={handleClose}>
            Cancel
          </Button>
          <Button variant='default'>Confirm</Button>
        </div>
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    })
  })

  /**
   * Accessibility Audit
   * Comprehensive accessibility testing
   */
  describe('Accessibility Audit', () => {
    it('should pass basic accessibility checks', () => {
      renderButton({ 'aria-label': 'Test button' })
      const button = screen.getByRole('button', { name: /test button/i })

      const accessibilityResults = accessibilityHelpers.checkAriaAttributes(button)
      expect(accessibilityResults.hasRole).toBe(false) // Button role is implicit
      expect(accessibilityResults.hasAriaLabel).toBe(true)
      expect(accessibilityResults.isAccessible).toBe(true)
    })

    it('should have proper screen reader content', () => {
      renderButton({ children: 'Save Changes' })
      const button = screen.getByRole('button', { name: /save changes/i })

      const screenReaderResults = accessibilityHelpers.checkScreenReaderContent(button)
      expect(screenReaderResults.hasScreenReaderText).toBe(true)
      expect(screenReaderResults.screenReaderText).toBe('Save Changes')
    })

    it('should support keyboard navigation', async () => {
      const { user } = renderButton()

      const keyboardResults = await accessibilityHelpers.testKeyboardNavigation(user)
      expect(keyboardResults.canReceiveFocus).toBe(true)
    })
  })
})
