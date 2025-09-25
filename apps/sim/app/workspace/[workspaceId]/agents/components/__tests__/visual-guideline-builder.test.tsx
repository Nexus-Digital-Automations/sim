/**
 * Visual Guideline Builder Component Tests
 *
 * Comprehensive test suite for the visual guideline builder with drag-and-drop,
 * template management, and real-time validation.
 */

import type React from 'react'
import { DndProvider } from '@hello-pangea/dnd'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VisualGuidelineBuilder } from '../guideline-builder/visual-guideline-builder'

// Mock React Hook Form
jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  useForm: jest.fn(() => ({
    control: {},
    handleSubmit: jest.fn((fn) => fn),
    formState: { errors: {}, isValid: true },
    watch: jest.fn(() => []),
    setValue: jest.fn(),
    getValues: jest.fn(() => ({ guidelines: [] })),
  })),
  useFieldArray: jest.fn(() => ({
    fields: [],
    append: jest.fn(),
    remove: jest.fn(),
    move: jest.fn(),
    update: jest.fn(),
  })),
}))

// Mock drag and drop
const mockDndProvider = ({ children }: { children: React.ReactNode }) => (
  <DndProvider>{children}</DndProvider>
)

describe('VisualGuidelineBuilder', () => {
  const defaultProps = {
    agentId: 'test-agent',
    workspaceId: 'test-workspace',
    guidelines: [],
    onGuidelinesChange: jest.fn(),
  }

  const sampleGuidelines = [
    {
      id: '1',
      condition: 'user says hello',
      action: 'respond with greeting',
      priority: 5,
      isActive: true,
      category: 'conversation',
    },
    {
      id: '2',
      condition: 'user asks for help',
      action: 'provide assistance',
      priority: 8,
      isActive: true,
      category: 'support',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderWithDnd = (component: React.ReactElement) => {
    return render(component, { wrapper: mockDndProvider })
  }

  describe('Component Rendering', () => {
    it('renders the guideline builder interface', () => {
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} />)

      expect(screen.getByText('Visual Guideline Builder')).toBeInTheDocument()
      expect(screen.getByText('Create rules for your agent')).toBeInTheDocument()
      expect(screen.getByText('Add Guideline')).toBeInTheDocument()
    })

    it('renders existing guidelines', () => {
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} guidelines={sampleGuidelines} />)

      expect(screen.getByText('user says hello')).toBeInTheDocument()
      expect(screen.getByText('user asks for help')).toBeInTheDocument()
    })

    it('shows empty state when no guidelines exist', () => {
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} />)

      expect(screen.getByText('No guidelines yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first guideline to get started')).toBeInTheDocument()
    })
  })

  describe('Guideline Creation', () => {
    it('opens create dialog when Add Guideline is clicked', async () => {
      const user = userEvent.setup()
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} />)

      await user.click(screen.getByText('Add Guideline'))

      expect(screen.getByText('Create Guideline')).toBeInTheDocument()
      expect(screen.getByLabelText(/condition/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/action/i)).toBeInTheDocument()
    })

    it('creates a new guideline with valid data', async () => {
      const user = userEvent.setup()
      const onGuidelinesChange = jest.fn()
      renderWithDnd(
        <VisualGuidelineBuilder {...defaultProps} onGuidelinesChange={onGuidelinesChange} />
      )

      // Open create dialog
      await user.click(screen.getByText('Add Guideline'))

      // Fill form
      await user.type(screen.getByLabelText(/condition/i), 'user says goodbye')
      await user.type(screen.getByLabelText(/action/i), 'say farewell')

      // Submit
      await user.click(screen.getByText('Create Guideline'))

      await waitFor(() => {
        expect(onGuidelinesChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              condition: 'user says goodbye',
              action: 'say farewell',
            }),
          ])
        )
      })
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} />)

      await user.click(screen.getByText('Add Guideline'))
      await user.click(screen.getByText('Create Guideline'))

      await waitFor(() => {
        expect(screen.getByText(/condition is required/i)).toBeInTheDocument()
        expect(screen.getByText(/action is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Guideline Templates', () => {
    it('shows template suggestions', async () => {
      const user = userEvent.setup()
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} />)

      await user.click(screen.getByText('Add Guideline'))
      await user.click(screen.getByText('Templates'))

      expect(screen.getByText('Greeting')).toBeInTheDocument()
      expect(screen.getByText('Help Request')).toBeInTheDocument()
      expect(screen.getByText('Goodbye')).toBeInTheDocument()
    })

    it('applies template when selected', async () => {
      const user = userEvent.setup()
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} />)

      await user.click(screen.getByText('Add Guideline'))
      await user.click(screen.getByText('Templates'))
      await user.click(screen.getByText('Greeting'))

      // Should populate form with template data
      expect(screen.getByDisplayValue(/greeting/i)).toBeInTheDocument()
    })
  })

  describe('Guideline Editing', () => {
    it('opens edit dialog when guideline is clicked', async () => {
      const user = userEvent.setup()
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} guidelines={sampleGuidelines} />)

      // Find and click edit button on first guideline
      const firstGuideline = screen.getByText('user says hello').closest('.guideline-card')
      const editButton = within(firstGuideline!).getByRole('button', { name: /edit/i })
      await user.click(editButton)

      expect(screen.getByText('Edit Guideline')).toBeInTheDocument()
      expect(screen.getByDisplayValue('user says hello')).toBeInTheDocument()
    })

    it('updates guideline with new data', async () => {
      const user = userEvent.setup()
      const onGuidelinesChange = jest.fn()
      renderWithDnd(
        <VisualGuidelineBuilder
          {...defaultProps}
          guidelines={sampleGuidelines}
          onGuidelinesChange={onGuidelinesChange}
        />
      )

      // Edit first guideline
      const firstGuideline = screen.getByText('user says hello').closest('.guideline-card')
      const editButton = within(firstGuideline!).getByRole('button', { name: /edit/i })
      await user.click(editButton)

      // Modify condition
      const conditionInput = screen.getByDisplayValue('user says hello')
      await user.clear(conditionInput)
      await user.type(conditionInput, 'user says hi')

      await user.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(onGuidelinesChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              condition: 'user says hi',
              action: 'respond with greeting',
            }),
          ])
        )
      })
    })
  })

  describe('Guideline Deletion', () => {
    it('deletes guideline when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onGuidelinesChange = jest.fn()
      renderWithDnd(
        <VisualGuidelineBuilder
          {...defaultProps}
          guidelines={sampleGuidelines}
          onGuidelinesChange={onGuidelinesChange}
        />
      )

      // Find and click delete button
      const firstGuideline = screen.getByText('user says hello').closest('.guideline-card')
      const deleteButton = within(firstGuideline!).getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      // Confirm deletion
      await user.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(onGuidelinesChange).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ id: '2' })])
        )
      })
    })
  })

  describe('Drag and Drop', () => {
    it('allows reordering guidelines via drag and drop', async () => {
      const onGuidelinesChange = jest.fn()
      renderWithDnd(
        <VisualGuidelineBuilder
          {...defaultProps}
          guidelines={sampleGuidelines}
          onGuidelinesChange={onGuidelinesChange}
        />
      )

      // Simulate drag and drop (simplified due to testing complexity)
      const firstGuideline = screen.getByText('user says hello')
      const secondGuideline = screen.getByText('user asks for help')

      // Mock drag event
      fireEvent.dragStart(firstGuideline)
      fireEvent.dragOver(secondGuideline)
      fireEvent.drop(secondGuideline)

      // Should trigger reorder
      expect(onGuidelinesChange).toHaveBeenCalled()
    })
  })

  describe('Priority Management', () => {
    it('displays priority indicators', () => {
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} guidelines={sampleGuidelines} />)

      expect(screen.getByText('Priority: 5')).toBeInTheDocument()
      expect(screen.getByText('Priority: 8')).toBeInTheDocument()
    })

    it('allows priority editing', async () => {
      const user = userEvent.setup()
      const onGuidelinesChange = jest.fn()
      renderWithDnd(
        <VisualGuidelineBuilder
          {...defaultProps}
          guidelines={sampleGuidelines}
          onGuidelinesChange={onGuidelinesChange}
        />
      )

      // Edit high priority guideline
      const highPriorityGuideline = screen
        .getByText('user asks for help')
        .closest('.guideline-card')
      const editButton = within(highPriorityGuideline!).getByRole('button', { name: /edit/i })
      await user.click(editButton)

      // Change priority
      const prioritySlider = screen.getByRole('slider')
      fireEvent.change(prioritySlider, { target: { value: '3' } })

      await user.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(onGuidelinesChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: '2',
              priority: 3,
            }),
          ])
        )
      })
    })
  })

  describe('Category Management', () => {
    it('displays category badges', () => {
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} guidelines={sampleGuidelines} />)

      expect(screen.getByText('conversation')).toBeInTheDocument()
      expect(screen.getByText('support')).toBeInTheDocument()
    })

    it('allows filtering by category', async () => {
      const user = userEvent.setup()
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} guidelines={sampleGuidelines} />)

      // Apply category filter
      await user.click(screen.getByText('Filter'))
      await user.click(screen.getByText('conversation'))

      // Should only show conversation guidelines
      expect(screen.getByText('user says hello')).toBeInTheDocument()
      expect(screen.queryByText('user asks for help')).not.toBeInTheDocument()
    })
  })

  describe('Validation and Analysis', () => {
    it('shows guideline analysis', async () => {
      const user = userEvent.setup()
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} guidelines={sampleGuidelines} />)

      await user.click(screen.getByText('Analysis'))

      expect(screen.getByText('Guideline Coverage')).toBeInTheDocument()
      expect(screen.getByText('Potential Conflicts')).toBeInTheDocument()
    })

    it('detects conflicting guidelines', async () => {
      const conflictingGuidelines = [
        ...sampleGuidelines,
        {
          id: '3',
          condition: 'user says hello',
          action: 'ignore user',
          priority: 5,
          isActive: true,
          category: 'conversation',
        },
      ]

      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} guidelines={conflictingGuidelines} />)

      // Should show conflict warning
      expect(screen.getByText(/conflict detected/i)).toBeInTheDocument()
    })
  })

  describe('Readonly Mode', () => {
    it('disables editing in readonly mode', () => {
      renderWithDnd(
        <VisualGuidelineBuilder {...defaultProps} guidelines={sampleGuidelines} readonly={true} />
      )

      expect(screen.queryByText('Add Guideline')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} />)

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Guideline Builder')
      expect(screen.getByRole('button', { name: /add guideline/i })).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithDnd(<VisualGuidelineBuilder {...defaultProps} guidelines={sampleGuidelines} />)

      // Tab through interactive elements
      await user.tab()
      expect(screen.getByRole('button', { name: /add guideline/i })).toHaveFocus()
    })
  })
})
