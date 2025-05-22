const strategies = require('../strategy/index');

class PdfProcessor {
  constructor(strategy = 'default', updateTask = () => {}) {
    if (!strategies[strategy]) {
      throw new Error(`Invalid strategy: ${strategy}`);
    }
    this.strategy = new strategies[strategy]();
    this.updateTask = updateTask;
  }

  async process(projectId, fileName, options = {}, taskId) {
    try {
      if (!fileName.endsWith('.pdf')) {
        throw new Error('Input must be a PDF file');
      }

      const result = await this.strategy.process(projectId, fileName, options);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  setStrategy(strategy) {
    if (!strategies[strategy]) {
      throw new Error(`Invalid strategy: ${strategy}`);
    }
    this.strategy = new strategies[strategy]();
  }
}

module.exports = PdfProcessor;
