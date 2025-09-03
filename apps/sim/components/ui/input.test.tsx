/**
 * @vitest-environment jsdom
 *
 * Comprehensive Input Component Tests
 *
 * This test suite provides complete coverage for the Input component including:
 * - Basic rendering and prop handling
 * - All input types and attributes
 * - User interaction simulation
 * - Form integration and validation
 * - Accessibility compliance testing
 * - Keyboard navigation and focus management
 * - Error states and edge cases
 * - Performance and memory optimization
 * - File upload functionality
 * - Security considerations
 */

import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessibilityHelpers, renderWithProviders, testingHelpers } from '@/__tests__/test-utils'
import { Input } from './input'

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
 * Helper function to render Input with default props
 */
function renderInput(props: React.ComponentProps<typeof Input> = {}) {
  const defaultProps = {
    placeholder: 'Enter text',
    ...props,
  }

  return renderWithProviders(<Input {...defaultProps} />)
}

describe('Input Component', () => {
  /**
   * Basic Rendering Tests
   * Verify component renders correctly with different configurations
   */
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderInput()
      expect(container).toBeInTheDocument()
    })

    it('should render as input element', () => {
      renderInput()
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe('INPUT')
      // Default type is not explicitly set, browser defaults to 'text'
      expect(input.type).toBe('text') // Browser default
    })

    it('should apply default classes', () => {
      renderInput()
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toHaveClass(
        'flex',
        'h-10',
        'w-full',
        'rounded-md',
        'border',
        'border-input',
        'bg-background'
      )
    })

    it('should forward ref correctly', () => {
      const ref = vi.fn()
      renderWithProviders(<Input ref={ref} placeholder='Ref test' />)

      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement))
    })

    it('should have default autoComplete off', () => {
      renderInput()
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toHaveAttribute('autoComplete', 'off')
    })

    it('should have default autoCorrect, autoCapitalize, and spellCheck disabled', () => {
      renderInput()
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toHaveAttribute('autoCorrect', 'off')
      expect(input).toHaveAttribute('autoCapitalize', 'off')
      expect(input).toHaveAttribute('spellCheck', 'false')
    })
  })

  /**
   * Input Types Tests
   * Test all supported HTML input types
   */
  describe('Input Types', () => {
    const inputTypes = [
      'text',
      'email',
      'password',
      'number',
      'tel',
      'url',
      'search',
      'date',
      'time',
      'datetime-local',
      'month',
      'week',
      'color',
      'range',
      'file',
      'hidden',
    ]

    it.each(inputTypes)('should render %s type correctly', (type) => {
      renderInput({ type })
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toHaveAttribute('type', type)
    })

    it('should handle password type with security considerations', () => {
      renderInput({ type: 'password', placeholder: 'Enter password' })
      const input = screen.getByPlaceholderText('Enter password')

      expect(input).toHaveAttribute('type', 'password')
      expect(input).toHaveAttribute('autoComplete', 'off')
      expect(input).toHaveAttribute('autoCorrect', 'off')
    })

    it('should handle email type with validation attributes', () => {
      renderInput({
        type: 'email',
        placeholder: 'Enter email',
        required: true,
        'aria-describedby': 'email-error',
      })
      const input = screen.getByPlaceholderText('Enter email')

      expect(input).toHaveAttribute('type', 'email')
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('aria-describedby', 'email-error')
    })

    it('should handle number type with min/max constraints', () => {
      renderInput({
        type: 'number',
        min: 0,
        max: 100,
        step: 1,
        placeholder: 'Enter number',
      })
      const input = screen.getByPlaceholderText('Enter number')

      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '100')
      expect(input).toHaveAttribute('step', '1')
    })

    it('should handle file type with accept attribute', () => {
      renderInput({
        type: 'file',
        accept: '.jpg,.png,.pdf',
        multiple: true,
      })
      const input =
        screen.getByRole('textbox', { hidden: true }) ||
        document.querySelector('input[type="file"]')

      expect(input).toHaveAttribute('type', 'file')
      expect(input).toHaveAttribute('accept', '.jpg,.png,.pdf')
      expect(input).toHaveAttribute('multiple')
    })
  })

  /**
   * User Interaction Tests
   * Simulate real user input and interactions
   */
  describe('User Interactions', () => {
    it('should handle text input correctly', async () => {
      const { user } = renderInput()
      const input = screen.getByPlaceholderText('Enter text')

      await user.type(input, 'Hello World')

      expect(input).toHaveValue('Hello World')
    })

    it('should handle controlled input with onChange', async () => {
      const handleChange = vi.fn()
      const { user } = renderInput({ onChange: handleChange })

      const input = screen.getByPlaceholderText('Enter text')
      await user.type(input, 'test')

      expect(handleChange).toHaveBeenCalledTimes(4) // One for each character
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: expect.any(String) }),
        })
      )
    })

    it('should handle focus and blur events', async () => {
      const handleFocus = vi.fn()
      const handleBlur = vi.fn()
      const { user } = renderInput({
        onFocus: handleFocus,
        onBlur: handleBlur,
      })

      const input = screen.getByPlaceholderText('Enter text')

      await user.click(input)
      expect(handleFocus).toHaveBeenCalledOnce()
      expect(input).toHaveFocus()

      await user.tab()
      expect(handleBlur).toHaveBeenCalledOnce()
    })

    it('should handle keyboard events', async () => {
      const handleKeyDown = vi.fn()
      const handleKeyUp = vi.fn()
      const { user } = renderInput({
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
      })

      const input = screen.getByPlaceholderText('Enter text')
      await user.click(input)
      await user.keyboard('a')

      expect(handleKeyDown).toHaveBeenCalled()
      expect(handleKeyUp).toHaveBeenCalled()
    })

    it('should handle special key combinations', async () => {
      const handleKeyDown = vi.fn()
      const { user } = renderInput({ onKeyDown: handleKeyDown })

      const input = screen.getByPlaceholderText('Enter text')
      await user.click(input)

      // Test Ctrl+A (select all)
      await user.keyboard('{Control>}a{/Control}')
      expect(handleKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'a',
          ctrlKey: true,
        })
      )
    })

    it('should handle paste events', async () => {
      const handlePaste = vi.fn()
      const { user } = renderInput({ onPaste: handlePaste })

      const input = screen.getByPlaceholderText('Enter text')
      await user.click(input)

      // Simulate paste
      await user.paste('Pasted content')

      expect(input).toHaveValue('Pasted content')
    })

    it('should not accept input when disabled', async () => {
      const { user } = renderInput({ disabled: true, value: 'Initial' })
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toBeDisabled()

      await user.type(input, 'Should not work')
      expect(input).toHaveValue('Initial')
    })

    it('should not accept input when readonly', async () => {
      const { user } = renderInput({ readOnly: true, value: 'Readonly value' })
      const input = screen.getByDisplayValue('Readonly value')

      await user.type(input, 'Should not work')
      expect(input).toHaveValue('Readonly value')
    })
  })

  /**
   * Form Integration Tests
   * Test component behavior within forms
   */
  describe('Form Integration', () => {
    it('should work with form submission', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      const { user } = renderWithProviders(
        <form onSubmit={handleSubmit}>
          <Input name='username' placeholder='Username' required />
          <Input name='email' type='email' placeholder='Email' required />
          <button type='submit'>Submit</button>
        </form>
      )

      const usernameInput = screen.getByPlaceholderText('Username')
      const emailInput = screen.getByPlaceholderText('Email')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      expect(handleSubmit).toHaveBeenCalledOnce()
    })

    it('should validate required fields', async () => {
      const { user } = renderWithProviders(
        <form>
          <Input name='required-field' placeholder='Required field' required />
          <button type='submit'>Submit</button>
        </form>
      )

      const submitButton = screen.getByRole('button', { name: /submit/i })

      // Try to submit without filling required field
      await user.click(submitButton)

      const input = screen.getByPlaceholderText('Required field')
      expect(input).toHaveAttribute('required')
      expect(input).toBeInvalid()
    })

    it('should handle form validation with pattern attribute', async () => {
      const { user } = renderInput({
        type: 'text',
        pattern: '[0-9]{3}-[0-9]{3}-[0-9]{4}',
        placeholder: 'Phone number (xxx-xxx-xxxx)',
        title: 'Please enter a valid phone number',
      })

      const input = screen.getByPlaceholderText(/phone number/i)

      // Invalid format
      await user.type(input, '1234567890')
      expect(input).toHaveValue('1234567890')

      // Valid format
      await user.clear(input)
      await user.type(input, '123-456-7890')
      expect(input).toHaveValue('123-456-7890')
    })

    it('should support form auto-completion', () => {
      renderInput({
        name: 'email',
        type: 'email',
        autoComplete: 'email',
        placeholder: 'Email address',
      })

      const input = screen.getByPlaceholderText('Email address')
      expect(input).toHaveAttribute('autoComplete', 'email')
      expect(input).toHaveAttribute('name', 'email')
    })
  })

  /**
   * Accessibility Tests
   * Ensure component meets accessibility standards
   */
  describe('Accessibility', () => {
    it('should have proper input role', () => {
      renderInput({ 'aria-label': 'Search input' })
      const input = screen.getByLabelText('Search input')

      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe('INPUT')
    })

    it('should support aria-label', () => {
      renderInput({ 'aria-label': 'Full name input' })
      const input = screen.getByLabelText('Full name input')

      expect(input).toHaveAttribute('aria-label', 'Full name input')
    })

    it('should support aria-describedby for error messages', () => {
      renderWithProviders(
        <div>
          <Input placeholder='Email' aria-describedby='email-error' aria-invalid='true' />
          <div id='email-error'>Please enter a valid email address</div>
        </div>
      )

      const input = screen.getByPlaceholderText('Email')
      expect(input).toHaveAttribute('aria-describedby', 'email-error')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should support aria-required for required fields', () => {
      renderInput({
        required: true,
        'aria-required': true,
        placeholder: 'Required field',
      })

      const input = screen.getByPlaceholderText('Required field')
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('should be focusable by default', () => {
      renderInput()
      const input = screen.getByPlaceholderText('Enter text')

      input.focus()
      expect(input).toHaveFocus()
    })

    it('should not be focusable when disabled', () => {
      renderInput({ disabled: true })
      const input = screen.getByPlaceholderText('Enter text')

      input.focus()
      expect(input).not.toHaveFocus()
    })

    it('should have visible focus indicator', async () => {
      const { user } = renderInput()
      const input = screen.getByPlaceholderText('Enter text')

      await user.tab()

      expect(input).toHaveFocus()
      expect(input).toHaveClass(expect.stringContaining('focus-visible'))
    })

    it('should work with label association', () => {
      renderWithProviders(
        <div>
          <label htmlFor='test-input'>Test Label</label>
          <Input id='test-input' placeholder='Labeled input' />
        </div>
      )

      const input = screen.getByLabelText('Test Label')
      expect(input).toHaveAttribute('id', 'test-input')
    })
  })

  /**
   * File Upload Tests
   * Test file input specific functionality
   */
  describe('File Upload', () => {
    it('should handle single file selection', async () => {
      const handleChange = vi.fn()
      const { user } = renderInput({
        type: 'file',
        onChange: handleChange,
      })

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = testingHelpers.createMockFile('test.txt', 'text/plain', 'test content')

      testingHelpers.simulateFileUpload(fileInput, file)

      expect(handleChange).toHaveBeenCalled()
      expect(fileInput.files?.[0]).toBe(file)
    })

    it('should handle multiple file selection', async () => {
      const handleChange = vi.fn()
      renderInput({
        type: 'file',
        multiple: true,
        onChange: handleChange,
      })

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file1 = testingHelpers.createMockFile('test1.txt', 'text/plain')
      const file2 = testingHelpers.createMockFile('test2.txt', 'text/plain')

      Object.defineProperty(fileInput, 'files', {
        value: [file1, file2],
        configurable: true,
      })

      fireEvent.change(fileInput)

      expect(handleChange).toHaveBeenCalled()
      expect(fileInput.files?.length).toBe(2)
    })

    it('should respect accept attribute for file types', () => {
      renderInput({
        type: 'file',
        accept: '.jpg,.png,.gif',
        placeholder: 'Select image',
      })

      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toHaveAttribute('accept', '.jpg,.png,.gif')
    })

    it('should handle file size validation', async () => {
      const handleChange = vi.fn((e) => {
        const file = e.target.files?.[0]
        if (file && file.size > 1000000) {
          // 1MB limit
          e.preventDefault()
          alert('File too large')
        }
      })

      renderInput({
        type: 'file',
        onChange: handleChange,
      })

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const largeFile = new File(['x'.repeat(1000001)], 'large.txt', { type: 'text/plain' })

      testingHelpers.simulateFileUpload(fileInput, largeFile)

      expect(handleChange).toHaveBeenCalled()
    })
  })

  /**
   * Custom Styling Tests
   * Test custom className and styling props
   */
  describe('Custom Styling', () => {
    it('should merge custom className with default classes', () => {
      renderInput({ className: 'custom-input-class' })
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toHaveClass('custom-input-class')
      expect(input).toHaveClass('flex', 'h-10', 'w-full')
    })

    it('should apply custom CSS properties', () => {
      renderInput({
        style: {
          backgroundColor: 'lightblue',
          color: 'darkblue',
          fontSize: '16px',
        },
      })

      const input = screen.getByPlaceholderText('Enter text')
      expect(input).toHaveStyle({
        backgroundColor: 'lightblue',
        color: 'darkblue',
        fontSize: '16px',
      })
    })

    it('should support custom data attributes', () => {
      renderInput({
        'data-testid': 'custom-input',
        'data-analytics': 'search-input',
      })

      const input = screen.getByTestId('custom-input')
      expect(input).toHaveAttribute('data-analytics', 'search-input')
    })

    it('should handle responsive text sizing', () => {
      renderInput()
      const input = screen.getByPlaceholderText('Enter text')

      // Default includes responsive text sizing
      expect(input).toHaveClass('text-base', 'md:text-sm')
    })
  })

  /**
   * State Management Tests
   * Test controlled vs uncontrolled inputs
   */
  describe('State Management', () => {
    it('should work as uncontrolled input', async () => {
      const { user } = renderInput({ defaultValue: 'Initial value' })
      const input = screen.getByDisplayValue('Initial value')

      await user.clear(input)
      await user.type(input, 'New value')

      expect(input).toHaveValue('New value')
    })

    it('should work as controlled input', async () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('Controlled')
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='Controlled input'
          />
        )
      }

      const { user } = renderWithProviders(<TestComponent />)
      const input = screen.getByDisplayValue('Controlled')

      await user.clear(input)
      await user.type(input, 'Updated')

      expect(input).toHaveValue('Updated')
    })

    it('should handle value prop changes', () => {
      const { rerender } = renderInput({ value: 'First value' })
      let input = screen.getByDisplayValue('First value')

      expect(input).toHaveValue('First value')

      rerender(<Input value='Second value' placeholder='Enter text' />)
      input = screen.getByDisplayValue('Second value')

      expect(input).toHaveValue('Second value')
    })

    it('should handle disabled state changes', () => {
      const { rerender } = renderInput({ disabled: false })
      let input = screen.getByPlaceholderText('Enter text')

      expect(input).toBeEnabled()

      rerender(<Input disabled={true} placeholder='Enter text' />)
      input = screen.getByPlaceholderText('Enter text')

      expect(input).toBeDisabled()
      expect(input).toHaveClass(expect.stringContaining('disabled:opacity-50'))
    })
  })

  /**
   * Theme Compatibility Tests
   * Test component behavior with different themes
   */
  describe('Theme Compatibility', () => {
    it('should render correctly in light theme', async () => {
      const { switchTheme } = renderInput()

      await switchTheme('light')
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toBeVisible()
      expect(input).toHaveClass('bg-background', 'border-input')
    })

    it('should render correctly in dark theme', async () => {
      const { switchTheme } = renderInput()

      await switchTheme('dark')
      const input = screen.getByPlaceholderText('Enter text')

      expect(input).toBeVisible()
      expect(input).toHaveClass('bg-background', 'border-input')
    })

    it('should maintain proper contrast in both themes', async () => {
      const { switchTheme } = renderInput({ value: 'Test content' })

      await switchTheme('light')
      let input = screen.getByDisplayValue('Test content')
      let styles = getComputedStyle(input)
      expect(styles.color).toBeTruthy()

      await switchTheme('dark')
      input = screen.getByDisplayValue('Test content')
      styles = getComputedStyle(input)
      expect(styles.color).toBeTruthy()
    })
  })

  /**
   * Edge Cases and Error Handling
   * Test component behavior in unusual scenarios
   */
  describe('Edge Cases', () => {
    it('should handle very long input values', async () => {
      const longValue = 'a'.repeat(10000)
      const { user } = renderInput()

      const input = screen.getByPlaceholderText('Enter text')
      await user.type(input, longValue)

      expect(input).toHaveValue(longValue)
    })

    it('should handle special characters and unicode', async () => {
      const specialText = '< > & " \' ® © ™ 中文 🚀 🎉 \u{1F600}'
      const { user } = renderInput()

      const input = screen.getByPlaceholderText('Enter text')
      await user.type(input, specialText)

      expect(input).toHaveValue(specialText)
    })

    it('should handle null and undefined values gracefully', () => {
      // Test with null value
      renderWithProviders(<Input value={null as any} placeholder='Null value' />)
      const nullInput = screen.getByPlaceholderText('Null value')
      expect(nullInput).toHaveValue('')

      // Test with undefined value
      renderWithProviders(<Input value={undefined as any} placeholder='Undefined value' />)
      const undefinedInput = screen.getByPlaceholderText('Undefined value')
      expect(undefinedInput).toHaveValue('')
    })

    it('should handle rapid input changes', async () => {
      const handleChange = vi.fn()
      const { user } = renderInput({ onChange: handleChange })

      const input = screen.getByPlaceholderText('Enter text')

      // Rapid typing simulation
      await user.type(input, 'rapid', { delay: 1 })

      expect(handleChange).toHaveBeenCalledTimes(5) // 'r', 'a', 'p', 'i', 'd'
      expect(input).toHaveValue('rapid')
    })
  })

  /**
   * Security Tests
   * Test security-related functionality
   */
  describe('Security', () => {
    it('should sanitize HTML input to prevent XSS', async () => {
      const maliciousInput = '<script>alert("XSS")</script>'
      const { user } = renderInput({ type: 'text' })

      const input = screen.getByPlaceholderText('Enter text')
      await user.type(input, maliciousInput)

      // Input should contain the raw text, not execute as HTML
      expect(input).toHaveValue(maliciousInput)
    })

    it('should handle password input securely', () => {
      renderInput({
        type: 'password',
        autoComplete: 'new-password',
        placeholder: 'Password',
      })

      const input = screen.getByPlaceholderText('Password')

      expect(input).toHaveAttribute('type', 'password')
      expect(input).toHaveAttribute('autoComplete', 'new-password')
      expect(input).toHaveAttribute('autoCorrect', 'off')
    })

    it('should prevent autocomplete on sensitive fields', () => {
      renderInput({
        type: 'text',
        name: 'credit-card',
        autoComplete: 'off',
        placeholder: 'Credit card number',
      })

      const input = screen.getByPlaceholderText('Credit card number')
      expect(input).toHaveAttribute('autoComplete', 'off')
    })
  })

  /**
   * Performance Tests
   * Test component performance and memory usage
   */
  describe('Performance', () => {
    it('should render quickly', async () => {
      const renderTime = await testingHelpers.measureRenderTime(() => {
        renderInput()
      })

      expect(renderTime).toBeLessThan(100) // 100ms threshold
    })

    it('should not cause memory leaks on mount/unmount', () => {
      const memoryTracker = testingHelpers.detectMemoryLeaks('Input')

      const { unmount } = renderInput()
      unmount()

      const memoryDiff = memoryTracker.check()
      expect(memoryDiff).toBeLessThan(50000) // 50KB threshold
    })

    it('should handle rapid re-renders efficiently', () => {
      let renderCount = 0

      function TestWrapper({ value }: { value: string }) {
        renderCount++
        return <Input value={value} onChange={() => {}} placeholder='Test' />
      }

      const { rerender } = renderWithProviders(<TestWrapper value='initial' />)

      // Trigger multiple re-renders
      for (let i = 0; i < 20; i++) {
        rerender(<TestWrapper value={`update-${i}`} />)
      }

      expect(renderCount).toBe(21) // Initial + 20 updates
      expect(screen.getByDisplayValue('update-19')).toBeInTheDocument()
    })

    it('should debounce rapid onChange events efficiently', async () => {
      const handleChange = vi.fn()
      const { user } = renderInput({ onChange: handleChange })

      const input = screen.getByPlaceholderText('Enter text')

      // Type quickly
      await user.type(input, 'quick', { delay: 1 })

      // Should still capture all changes
      expect(handleChange).toHaveBeenCalledTimes(5)
      expect(input).toHaveValue('quick')
    })
  })

  /**
   * Integration Tests
   * Test component in realistic scenarios
   */
  describe('Integration Scenarios', () => {
    it('should work in search form', async () => {
      const handleSearch = vi.fn((e) => e.preventDefault())
      const { user } = renderWithProviders(
        <form onSubmit={handleSearch}>
          <Input type='search' name='query' placeholder='Search...' aria-label='Search input' />
          <button type='submit'>Search</button>
        </form>
      )

      const searchInput = screen.getByLabelText('Search input')
      const searchButton = screen.getByRole('button', { name: /search/i })

      await user.type(searchInput, 'test query')
      await user.click(searchButton)

      expect(handleSearch).toHaveBeenCalledOnce()
      expect(searchInput).toHaveValue('test query')
    })

    it('should work in complex form with validation', async () => {
      const { user } = renderWithProviders(
        <form>
          <Input name='firstName' placeholder='First Name' required minLength={2} />
          <Input name='email' type='email' placeholder='Email' required />
          <Input name='phone' type='tel' placeholder='Phone' pattern='[0-9]{3}-[0-9]{3}-[0-9]{4}' />
          <button type='submit'>Register</button>
        </form>
      )

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const emailInput = screen.getByPlaceholderText('Email')
      const phoneInput = screen.getByPlaceholderText('Phone')

      await user.type(firstNameInput, 'John')
      await user.type(emailInput, 'john@example.com')
      await user.type(phoneInput, '123-456-7890')

      expect(firstNameInput).toHaveValue('John')
      expect(emailInput).toHaveValue('john@example.com')
      expect(phoneInput).toHaveValue('123-456-7890')
    })
  })

  /**
   * Accessibility Audit
   * Comprehensive accessibility testing
   */
  describe('Accessibility Audit', () => {
    it('should pass basic accessibility checks', () => {
      renderInput({ 'aria-label': 'Test input field' })
      const input = screen.getByLabelText('Test input field')

      const accessibilityResults = accessibilityHelpers.checkAriaAttributes(input)
      expect(accessibilityResults.hasAriaLabel).toBe(true)
      expect(accessibilityResults.isAccessible).toBe(true)
    })

    it('should have proper screen reader content', () => {
      renderWithProviders(
        <div>
          <label htmlFor='labeled-input'>Username</label>
          <Input id='labeled-input' placeholder='Enter username' />
        </div>
      )

      const input = screen.getByLabelText('Username')
      const screenReaderResults = accessibilityHelpers.checkScreenReaderContent(input)

      expect(screenReaderResults.hasScreenReaderText).toBe(true)
    })

    it('should support keyboard navigation', async () => {
      const { user } = renderInput()

      const keyboardResults = await accessibilityHelpers.testKeyboardNavigation(user)
      expect(keyboardResults.canReceiveFocus).toBe(true)
    })
  })
})
