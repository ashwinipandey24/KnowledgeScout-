const fs = require('fs');

class TextProcessor {
  async process(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Estimate pages based on content length (rough approximation)
      const pages = Math.max(1, Math.ceil(content.length / 2000));
      
      return {
        content: content,
        pages: pages
      };
    } catch (error) {
      console.error('Text processing error:', error);
      throw new Error('Failed to process text file');
    }
  }
}

module.exports = new TextProcessor();



