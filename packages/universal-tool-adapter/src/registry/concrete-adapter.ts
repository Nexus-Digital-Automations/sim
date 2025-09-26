/**
 * Concrete implementation of BaseAdapter for registry instantiation
 * This provides the required abstract methods with basic implementations
 */

import { z } from 'zod'
import { BaseAdapter } from '../core/base-adapter'
import type { ParameterDefinition, ParameterType } from '../types/parlant-interfaces'

export class ConcreteAdapter extends BaseAdapter {
  protected buildParameterDefinitions(): ParameterDefinition[] {
    // Since SimToolDefinition doesn't have parameters property,
    // we return an empty array and let the config provide parameter mappings
    return []
  }

  protected buildInputSchema(): z.ZodSchema<any> {
    // Build a flexible schema that accepts any object
    // The parameter mapper will handle the actual validation
    return z.record(z.any())
  }
}