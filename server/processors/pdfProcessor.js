const pdfParse = require('pdf-parse');
const fs = require('fs');

class PDFProcessor {
  async process(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        content: data.text,
        pages: data.numpages || 1
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error('Failed to process PDF file');
    }
  }
}

module.exports = new PDFProcessor();



