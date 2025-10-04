import React, { useState, useEffect } from 'react';
import ApiService from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getIndexStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load statistics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRebuildIndex = async () => {
    try {
      setRebuilding(true);
      setError(null);
      setSuccess(null);

      const result = await ApiService.rebuildIndex();
      setSuccess(`Index rebuild completed! Processed ${result.processed} out of ${result.total} documents.`);
      
      // Reload stats after rebuild
      await loadStats();
    } catch (err) {
      setError('Failed to rebuild index: ' + err.message);
    } finally {
      setRebuilding(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="page-container">
      <h1 className="page-title">⚙️ Admin Panel</h1>
      <p className="page-subtitle">Manage document indexing and view system statistics.</p>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="admin-actions">
        <button 
          className="btn btn-success"
          onClick={handleRebuildIndex}
          disabled={rebuilding}
        >
          {rebuilding ? 'Rebuilding Index...' : 'Rebuild Index'}
        </button>
        <button 
          className="btn btn-secondary"
          onClick={loadStats}
          disabled={loading}
        >
          Refresh Stats
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading statistics..." />
      ) : stats ? (
        <div className="stats-section">
          <h3>Index Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalDocuments}</div>
              <div className="stat-label">Total Documents</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalChunks}</div>
              <div className="stat-label">Total Chunks</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{formatDate(stats.lastRebuild)}</div>
              <div className="stat-label">Last Rebuild</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="loading">No statistics available</div>
      )}

      <div className="admin-info">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Query Cache:</strong> 60 seconds TTL
          </div>
          <div className="info-item">
            <strong>Supported Formats:</strong> PDF, DOCX, TXT
          </div>
          <div className="info-item">
            <strong>Max File Size:</strong> 10MB
          </div>
          <div className="info-item">
            <strong>Chunk Size:</strong> 1000 characters
          </div>
          <div className="info-item">
            <strong>Chunk Overlap:</strong> 200 characters
          </div>
          <div className="info-item">
            <strong>Max Sources:</strong> 10 per query
          </div>
        </div>
      </div>

      <div className="admin-notes">
        <h3>Notes</h3>
        <ul>
          <li>Rebuilding the index will reprocess all documents and create new embeddings</li>
          <li>Private documents are only visible to their owners or via share tokens</li>
          <li>Query results are cached for 60 seconds to improve performance</li>
          <li>Document chunks are created with overlap to ensure context continuity</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPage;

