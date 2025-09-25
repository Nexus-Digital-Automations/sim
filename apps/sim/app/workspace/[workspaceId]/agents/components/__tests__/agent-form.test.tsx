/**
 * Agent Form Component Tests
 *
 * Comprehensive test suite for the multi-step agent creation form.
 * Tests form validation, step navigation, and data persistence.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentForm } from '../agent-form/agent-form'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

// Mock form hook
jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  useForm: jest.fn(() => ({
    control: {},
    handleSubmit: jest.fn((fn) => fn),
    formState: { errors: {}, isValid: true },
    watch: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(() => ({})),
  })),
}))

describe('AgentForm', () => {
  const defaultProps = {
    workspaceId: 'test-workspace',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('renders the agent form with all steps', () => {
      render(<AgentForm {...defaultProps} />)

      // Check if form title is present
      expect(screen.getByText('Create New Agent')).toBeInTheDocument()

      // Check if step indicator is present
      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByText('Model Configuration')).toBeInTheDocument()
      expect(screen.getByText('Guidelines')).toBeInTheDocument()
      expect(screen.getByText('Tools & Integrations')).toBeInTheDocument()
      expect(screen.getByText('Review & Create')).toBeInTheDocument()
    })

    it('starts on the first step', () => {
      render(<AgentForm {...defaultProps} />)

      // Check if first step is active
      expect(screen.getByDisplayValue('Basic Information')).toBeInTheDocument()
    })

    it('renders form fields for the current step', () => {
      render(<AgentForm {...defaultProps} />)

      // Check basic info fields are present
      expect(screen.getByLabelText(/agent name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })
  })

  describe('Step Navigation', () => {
    it('allows navigation to next step', async () => {
      const user = userEvent.setup()
      render(<AgentForm {...defaultProps} />)

      // Fill required fields
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.type(screen.getByLabelText(/description/i), 'Test Description')

      // Click next button
      await user.click(screen.getByText('Next'))

      // Check if we moved to step 2
      await waitFor(() => {
        expect(screen.getByText('Model Configuration')).toBeInTheDocument()
      })
    })

    it('allows navigation to previous step', async () => {
      const user = userEvent.setup()
      render(<AgentForm {...defaultProps} />)

      // Navigate to step 2 first
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.click(screen.getByText('Next'))

      // Navigate back
      await user.click(screen.getByText('Back'))

      // Check if we're back to step 1
      await waitFor(() => {
        expect(screen.getByLabelText(/agent name/i)).toBeInTheDocument()
      })
    })

    it('prevents navigation with invalid data', async () => {
      const user = userEvent.setup()
      render(<AgentForm {...defaultProps} />)

      // Try to navigate without filling required fields
      await user.click(screen.getByText('Next'))

      // Should still be on step 1
      expect(screen.getByLabelText(/agent name/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<AgentForm {...defaultProps} />)

      // Try to submit without required fields
      await user.click(screen.getByText('Next'))

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/agent name is required/i)).toBeInTheDocument()
      })
    })

    it('validates agent name format', async () => {
      const user = userEvent.setup()
      render(<AgentForm {...defaultProps} />)

      // Enter invalid name
      await user.type(screen.getByLabelText(/agent name/i), 'a')
      await user.click(screen.getByText('Next'))

      // Should show format validation error
      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
      })
    })

    it('validates model configuration', async () => {
      const user = userEvent.setup()
      render(<AgentForm {...defaultProps} />)

      // Navigate to model config step
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.type(screen.getByLabelText(/description/i), 'Test Description')
      await user.click(screen.getByText('Next'))

      // Try to proceed without selecting a model
      await user.click(screen.getByText('Next'))

      // Should show model validation error
      await waitFor(() => {
        expect(screen.getByText(/please select a model/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Persistence', () => {
    it('persists form data across steps', async () => {
      const user = userEvent.setup()
      render(<AgentForm {...defaultProps} />)

      // Fill basic info
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.type(screen.getByLabelText(/description/i), 'Test Description')
      await user.click(screen.getByText('Next'))

      // Go back and check data persistence
      await user.click(screen.getByText('Back'))

      expect(screen.getByDisplayValue('Test Agent')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('calls onSuccess when form is submitted successfully', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      render(<AgentForm {...defaultProps} onSuccess={onSuccess} />)

      // Fill all required fields and navigate to final step
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.type(screen.getByLabelText(/description/i), 'Test Description')
      await user.click(screen.getByText('Next'))

      // Skip through other steps (assuming minimal validation for test)
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))

      // Submit form
      await user.click(screen.getByText('Create Agent'))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Agent',
            description: 'Test Description',
          })
        )
      })
    })

    it('calls onCancel when form is cancelled', async () => {
      const user = userEvent.setup()
      const onCancel = jest.fn()
      render(<AgentForm {...defaultProps} onCancel={onCancel} />)

      // Cancel form
      await user.click(screen.getByText('Cancel'))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AgentForm {...defaultProps} />)

      expect(screen.getByLabelText(/agent name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<AgentForm {...defaultProps} />)

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/agent name/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/description/i)).toHaveFocus()
    })
  })

  describe('Error Handling', () => {
    it('displays API errors', async () => {
      const user = userEvent.setup()

      // Mock API error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Agent creation failed' }),
        })
      ) as jest.Mock

      render(<AgentForm {...defaultProps} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.type(screen.getByLabelText(/description/i), 'Test Description')

      // Navigate through steps and submit
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Create Agent'))

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText('Agent creation failed')).toBeInTheDocument()
      })
    })
  })
})
