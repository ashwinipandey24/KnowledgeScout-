import React, { useState } from 'react';
import ApiService from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

const AskPage = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [k, setK] = useState(5);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a question');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await ApiService.askQuestion(query.trim(), k);
      setResult(response);
    } catch (err) {
      setError('Failed to process query: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">❓ Ask Questions</h1>
      <p className="page-subtitle">Ask questions about your uploaded documents and get answers with source references.</p>

      <form onSubmit={handleSubmit} className="query-form">
        <div className="form-group">
          <label className="form-label">Your Question</label>
          <textarea
            className="form-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your question about the uploaded documents..."
            rows="4"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Number of Sources (k)</label>
          <input
            type="number"
            className="form-input"
            value={k}
            onChange={(e) => setK(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
            min="1"
            max="10"
          />
          <small>Number of document chunks to use for answering (1-10)</small>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Ask Question'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="query-result">
          {result.cached && (
            <div className="cached-indicator">
              ⚡ This query result was served from cache (cached for 60 seconds)
            </div>
          )}
          
          <h3>Answer:</h3>
          <div className="query-answer">
            {result.answer || 'No relevant information found in the documents.'}
          </div>

          {result.sources && result.sources.length > 0 && (
            <div className="query-sources">
              <h4>Sources:</h4>
              {result.sources.map((source, index) => (
                <div key={index} className="source-item">
                  <div className="source-header">
                    Document ID: {source.documentId} | Page: {source.pageNumber} | Chunk: {source.chunkIndex}
                  </div>
                  <div className="source-snippet">
                    {source.snippet}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <LoadingSpinner message="Searching through documents..." />
      )}
    </div>
  );
};

export default AskPage;

