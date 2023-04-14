/**
 * @module Errors
 */

export class WormError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WormError'
  }
}

export class ConnectionError extends WormError {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectionError'
  }
}

export class ModelError extends WormError {
  constructor(message: string) {
    super(message)
    this.name = 'ModelError'
  }
}
