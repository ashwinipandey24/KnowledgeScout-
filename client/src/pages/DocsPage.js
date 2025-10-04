import React, { useState, useEffect } from 'react';
import ApiService from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

const DocsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false
  });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    isPrivate: false,
    ownerId: ''
  });

  useEffect(() => {
    loadDocuments();
  }, [pagination.offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getDocuments(pagination.limit, pagination.offset);
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load documents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const result = await ApiService.uploadDocument(
        uploadForm.file,
        uploadForm.isPrivate,
        uploadForm.ownerId || null
      );

      setUploadSuccess(`Document "${result.filename}" uploaded successfully!`);
      setUploadForm({ file: null, isPrivate: false, ownerId: '' });
      setShowUploadForm(false);
      
      // Reload documents
      await loadDocuments();
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit)
      }));
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📚 Document Management</h1>

      {error && <div className="error">{error}</div>}
      {uploadSuccess && <div className="success">{uploadSuccess}</div>}

      <div className="document-actions">
        <button 
          className="btn btn-success"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? 'Cancel Upload' : 'Upload Document'}
        </button>
      </div>

      {showUploadForm && (
        <form onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label className="form-label">Select Document</label>
            <input
              type="file"
              className="form-file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              required
            />
            <small>Supported formats: PDF, DOCX, TXT (Max 10MB)</small>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="isPrivate"
                checked={uploadForm.isPrivate}
                onChange={(e) => setUploadForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
              />
              <label htmlFor="isPrivate">Make this document private</label>
            </div>
          </div>

          {uploadForm.isPrivate && (
            <div className="form-group">
              <label className="form-label">Owner ID (optional)</label>
              <input
                type="text"
                className="form-input"
                value={uploadForm.ownerId}
                onChange={(e) => setUploadForm(prev => ({ ...prev, ownerId: e.target.value }))}
                placeholder="Enter owner ID for private access"
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn"
            disabled={uploading || !uploadForm.file}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
      )}

      {loading ? (
        <LoadingSpinner message="Loading documents..." />
      ) : (
        <>
          <div className="document-list">
            {documents.length === 0 ? (
              <div className="loading">No documents found. Upload your first document!</div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="document-item">
                  <div className="document-header">
                    <h3 className="document-title">{doc.original_name}</h3>
                    {doc.is_private && (
                      <span className="badge badge-private">Private</span>
                    )}
                  </div>
                  <div className="document-meta">
                    <p>📄 <strong>Type:</strong> {doc.file_type}</p>
                    <p>💾 <strong>Size:</strong> {formatFileSize(doc.file_size)}</p>
                    <p>📖 <strong>Pages:</strong> {doc.pages}</p>
                    <p>📅 <strong>Uploaded:</strong> {formatDate(doc.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {pagination.total > pagination.limit && (
            <div className="pagination">
              <button 
                onClick={handlePreviousPage}
                disabled={pagination.offset === 0}
              >
                Previous
              </button>
              <div className="pagination-info">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} documents
              </div>
              <button 
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocsPage;

