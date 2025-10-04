const mammoth = require('mammoth');
const fs = require('fs');

class DocxProcessor {
  async process(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      // Estimate pages based on content length (rough approximation)
      const pages = Math.max(1, Math.ceil(result.value.length / 2000));
      
      return {
        content: result.value,
        pages: pages
      };
    } catch (error) {
      console.error('DOCX processing error:', error);
      throw new Error('Failed to process DOCX file');
    }
  }
}

module.exports = new DocxProcessor();



