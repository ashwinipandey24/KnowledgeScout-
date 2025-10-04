const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000/api';

class KnowledgeScoutTester {
  constructor() {
    this.testResults = [];
    this.testDocumentId = null;
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running test: ${testName}`);
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      this.testResults.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async testServerHealth() {
    const response = await axios.get(`${API_BASE_URL}/docs?limit=1`);
    if (response.status !== 200) {
      throw new Error('Server not responding');
    }
  }

  async testDocumentUpload() {
    // Create a test text file
    const testContent = `This is a test document for KnowledgeScout.
    
It contains multiple paragraphs to test the document processing and chunking functionality.

The document should be split into chunks for embedding and indexing.

This is the final paragraph of the test document.`;

    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, testContent);

    const formData = new FormData();
    formData.append('document', fs.createReadStream(testFilePath));
    formData.append('isPrivate', 'false');

    const response = await axios.post(`${API_BASE_URL}/docs`, formData, {
      headers: formData.getHeaders(),
    });

    if (!response.data.id) {
      throw new Error('Document upload failed - no ID returned');
    }

    this.testDocumentId = response.data.id;
    console.log(`   Document uploaded with ID: ${this.testDocumentId}`);

    // Clean up test file
    fs.unlinkSync(testFilePath);
  }

  async testDocumentListing() {
    const response = await axios.get(`${API_BASE_URL}/docs?limit=10&offset=0`);
    
    if (!response.data.documents || !Array.isArray(response.data.documents)) {
      throw new Error('Invalid document listing response');
    }

    if (!response.data.pagination) {
      throw new Error('Missing pagination information');
    }

    console.log(`   Found ${response.data.documents.length} documents`);
    console.log(`   Total documents: ${response.data.pagination.total}`);
  }

  async testDocumentRetrieval() {
    if (!this.testDocumentId) {
      throw new Error('No test document ID available');
    }

    const response = await axios.get(`${API_BASE_URL}/docs/${this.testDocumentId}`);
    
    if (!response.data.id || response.data.id !== this.testDocumentId) {
      throw new Error('Document retrieval failed');
    }

    if (!response.data.content) {
      throw new Error('Document content missing');
    }

    console.log(`   Retrieved document: ${response.data.original_name}`);
  }

  async testIndexStats() {
    const response = await axios.get(`${API_BASE_URL}/index/stats`);
    
    if (typeof response.data.totalDocuments !== 'number') {
      throw new Error('Invalid stats response');
    }

    console.log(`   Total documents: ${response.data.totalDocuments}`);
    console.log(`   Total chunks: ${response.data.totalChunks}`);
  }

  async testIndexRebuild() {
    const response = await axios.post(`${API_BASE_URL}/index/rebuild`);
    
    if (!response.data.message) {
      throw new Error('Index rebuild failed');
    }

    console.log(`   ${response.data.message}`);
    console.log(`   Processed: ${response.data.processed}/${response.data.total}`);
  }

  async testQuerySystem() {
    const testQueries = [
      'What is this document about?',
      'Tell me about the test content',
      'What does the document contain?'
    ];

    for (const query of testQueries) {
      const response = await axios.post(`${API_BASE_URL}/ask`, {
        query: query,
        k: 3
      });

      if (!response.data.query || !response.data.answer) {
        throw new Error(`Query failed for: "${query}"`);
      }

      if (!response.data.sources || !Array.isArray(response.data.sources)) {
        throw new Error(`No sources returned for query: "${query}"`);
      }

      console.log(`   Query: "${query}"`);
      console.log(`   Sources found: ${response.data.sources.length}`);
      console.log(`   Cached: ${response.data.cached ? 'Yes' : 'No'}`);
    }
  }

  async testQueryCaching() {
    const query = 'What is the test document about?';
    
    // First query (should not be cached)
    const response1 = await axios.post(`${API_BASE_URL}/ask`, { query, k: 2 });
    if (response1.data.cached !== false) {
      throw new Error('First query should not be cached');
    }

    // Second query (should be cached)
    const response2 = await axios.post(`${API_BASE_URL}/ask`, { query, k: 2 });
    if (response2.data.cached !== true) {
      throw new Error('Second query should be cached');
    }

    console.log(`   Query caching working correctly`);
  }

  async testPagination() {
    const response1 = await axios.get(`${API_BASE_URL}/docs?limit=1&offset=0`);
    const response2 = await axios.get(`${API_BASE_URL}/docs?limit=1&offset=1`);

    if (!response1.data.pagination || !response2.data.pagination) {
      throw new Error('Pagination not working');
    }

    console.log(`   Pagination working: offset 0 -> ${response1.data.documents.length} docs`);
    console.log(`   Pagination working: offset 1 -> ${response2.data.documents.length} docs`);
  }

  async testPrivateDocument() {
    // Create a private test document
    const testContent = 'This is a private test document.';
    const testFilePath = path.join(__dirname, 'private-test.txt');
    fs.writeFileSync(testFilePath, testContent);

    const formData = new FormData();
    formData.append('document', fs.createReadStream(testFilePath));
    formData.append('isPrivate', 'true');
    formData.append('ownerId', 'test-owner-123');

    const uploadResponse = await axios.post(`${API_BASE_URL}/docs`, formData, {
      headers: formData.getHeaders(),
    });

    const privateDocId = uploadResponse.data.id;
    const shareToken = uploadResponse.data.shareToken;

    // Test that private document is not visible without owner
    const publicListResponse = await axios.get(`${API_BASE_URL}/docs`);
    const isVisiblePublicly = publicListResponse.data.documents.some(doc => doc.id === privateDocId);
    
    if (isVisiblePublicly) {
      throw new Error('Private document is visible publicly');
    }

    // Test that private document is visible with owner
    const ownerListResponse = await axios.get(`${API_BASE_URL}/docs?ownerId=test-owner-123`);
    const isVisibleToOwner = ownerListResponse.data.documents.some(doc => doc.id === privateDocId);
    
    if (!isVisibleToOwner) {
      throw new Error('Private document not visible to owner');
    }

    // Test that private document is visible with share token
    const tokenListResponse = await axios.get(`${API_BASE_URL}/docs?shareToken=${shareToken}`);
    const isVisibleWithToken = tokenListResponse.data.documents.some(doc => doc.id === privateDocId);
    
    if (!isVisibleWithToken) {
      throw new Error('Private document not visible with share token');
    }

    console.log(`   Private document privacy controls working correctly`);
    console.log(`   Share token: ${shareToken}`);

    // Clean up
    fs.unlinkSync(testFilePath);
  }

  async runAllTests() {
    console.log('🚀 Starting KnowledgeScout Test Suite\n');

    await this.runTest('Server Health Check', () => this.testServerHealth());
    await this.runTest('Document Upload', () => this.testDocumentUpload());
    await this.runTest('Document Listing', () => this.testDocumentListing());
    await this.runTest('Document Retrieval', () => this.testDocumentRetrieval());
    await this.runTest('Index Statistics', () => this.testIndexStats());
    await this.runTest('Index Rebuild', () => this.testIndexRebuild());
    await this.runTest('Query System', () => this.testQuerySystem());
    await this.runTest('Query Caching', () => this.testQueryCaching());
    await this.runTest('Pagination', () => this.testPagination());
    await this.runTest('Private Document Controls', () => this.testPrivateDocument());

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    }
    
    if (passed === this.testResults.length) {
      console.log('\n🎉 All tests passed! KnowledgeScout is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new KnowledgeScoutTester();
  tester.runAllTests().catch(console.error);
}

module.exports = KnowledgeScoutTester;



