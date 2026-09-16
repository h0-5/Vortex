'use strict';

class UpdateError extends Error {
  /**
   * @param {string} message
   * @param {object} [context]
   * @param {string} [context.step]
   * @param {Error} [context.cause]
   * @param {boolean} [context.rolledBack]
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'UpdateError';
    this.step = context.step;
    this.cause = context.cause;
    this.rolledBack = context.rolledBack ?? false;
  }
}

module.exports = { UpdateError };
