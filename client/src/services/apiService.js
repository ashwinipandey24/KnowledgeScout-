import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });
  }

  // Document upload
  async uploadDocument(file, isPrivate = false, ownerId = null) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('isPrivate', isPrivate.toString());
    if (ownerId) {
      formData.append('ownerId', ownerId);
    }

    const response = await this.client.post('/docs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Get documents with pagination
  async getDocuments(limit = 10, offset = 0, ownerId = null, shareToken = null) {
    const params = { limit, offset };
    if (ownerId) params.ownerId = ownerId;
    if (shareToken) params.shareToken = shareToken;

    const response = await this.client.get('/docs', { params });
    return response.data;
  }

  // Get specific document
  async getDocument(id, ownerId = null, shareToken = null) {
    const params = {};
    if (ownerId) params.ownerId = ownerId;
    if (shareToken) params.shareToken = shareToken;

    const response = await this.client.get(`/docs/${id}`, { params });
    return response.data;
  }

  // Rebuild index
  async rebuildIndex() {
    const response = await this.client.post('/index/rebuild');
    return response.data;
  }

  // Get index stats
  async getIndexStats() {
    const response = await this.client.get('/index/stats');
    return response.data;
  }

  // Ask questions
  async askQuestion(query, k = 5) {
    const response = await this.client.post('/ask', { query, k });
    return response.data;
  }
}

const apiService = new ApiService();
export default apiService;

