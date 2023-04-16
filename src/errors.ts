/**
 * @module Errors
 */

/**
 * Base class for all errors thrown by the library
 */
export class WormError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WormError'
  }
}

/**
 * Error thrown when a connection to the database fails or is not available
 */
export class ConnectionError extends WormError {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectionError'
  }
}

/**
 * Error thrown when the constraints of a model are not met
 */
export class ModelError extends WormError {
  constructor(message: string) {
    super(message)
    this.name = 'ModelError'
  }
}
