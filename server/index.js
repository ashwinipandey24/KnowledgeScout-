const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Import document processing modules
const pdfProcessor = require('./processors/pdfProcessor');
const docxProcessor = require('./processors/docxProcessor');
const textProcessor = require('./processors/textProcessor');
const embeddingService = require('./services/embeddingService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize cache with 60s TTL
const queryCache = new NodeCache({ stdTTL: 60 });

// Initialize database
const db = new sqlite3.Database('./database.sqlite');

// Create tables
db.serialize(() => {
  // Documents table
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content TEXT NOT NULL,
      pages INTEGER DEFAULT 1,
      is_private BOOLEAN DEFAULT 0,
      owner_id TEXT,
      share_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Document chunks for embedding
  db.run(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding TEXT,
      chunk_index INTEGER NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents (id)
    )
  `);

  // Query cache table
  db.run(`
    CREATE TABLE IF NOT EXISTS query_cache (
      id TEXT PRIMARY KEY,
      query_hash TEXT UNIQUE NOT NULL,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Index stats table
  db.run(`
    CREATE TABLE IF NOT EXISTS index_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_documents INTEGER DEFAULT 0,
      total_chunks INTEGER DEFAULT 0,
      last_rebuild DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

// Routes

// Upload documents
app.post('/api/docs', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const documentId = uuidv4();
    const { isPrivate = false, ownerId } = req.body;
    const shareToken = isPrivate ? crypto.randomBytes(16).toString('hex') : null;

    // Process document based on type
    let content = '';
    let pages = 1;

    if (req.file.mimetype === 'application/pdf') {
      const result = await pdfProcessor.process(req.file.path);
      content = result.content;
      pages = result.pages;
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await docxProcessor.process(req.file.path);
      content = result.content;
      pages = result.pages;
    } else if (req.file.mimetype === 'text/plain') {
      const result = await textProcessor.process(req.file.path);
      content = result.content;
      pages = result.pages;
    }

    // Save document to database
    db.run(
      `INSERT INTO documents (id, filename, original_name, file_type, file_size, content, pages, is_private, owner_id, share_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [documentId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, 
       content, pages, isPrivate ? 1 : 0, ownerId, shareToken],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save document' });
        }

        // Process document for embedding
        embeddingService.processDocument(documentId, content, pages)
          .then(() => {
            res.json({
              id: documentId,
              filename: req.file.originalname,
              pages: pages,
              isPrivate: isPrivate,
              shareToken: shareToken
            });
          })
          .catch(err => {
            console.error('Embedding error:', err);
            res.status(500).json({ error: 'Document uploaded but embedding failed' });
          });
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// Get documents with pagination
app.get('/api/docs', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const { ownerId, shareToken } = req.query;

  let query = `SELECT id, original_name, file_type, file_size, pages, is_private, created_at 
               FROM documents WHERE 1=1`;
  let params = [];

  // Apply privacy filters
  if (ownerId) {
    query += ` AND (owner_id = ? OR is_private = 0)`;
    params.push(ownerId);
  } else if (shareToken) {
    query += ` AND share_token = ?`;
    params.push(shareToken);
  } else {
    query += ` AND is_private = 0`;
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM documents WHERE 1=1`;
    let countParams = [];

    if (ownerId) {
      countQuery += ` AND (owner_id = ? OR is_private = 0)`;
      countParams.push(ownerId);
    } else if (shareToken) {
      countQuery += ` AND share_token = ?`;
      countParams.push(shareToken);
    } else {
      countQuery += ` AND is_private = 0`;
    }

    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        console.error('Count error:', err);
        return res.status(500).json({ error: 'Failed to get document count' });
      }

      res.json({
        documents: rows,
        pagination: {
          total: countRow.total,
          limit: limit,
          offset: offset,
          hasMore: offset + limit < countRow.total
        }
      });
    });
  });
});

// Get specific document
app.get('/api/docs/:id', (req, res) => {
  const { id } = req.params;
  const { ownerId, shareToken } = req.query;

  let query = `SELECT * FROM documents WHERE id = ?`;
  let params = [id];

  // Apply privacy check
  if (ownerId) {
    query += ` AND (owner_id = ? OR is_private = 0)`;
    params.push(ownerId);
  } else if (shareToken) {
    query += ` AND share_token = ?`;
    params.push(shareToken);
  } else {
    query += ` AND is_private = 0`;
  }

  db.get(query, params, (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch document' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(row);
  });
});

// Rebuild index
app.post('/api/index/rebuild', (req, res) => {
  db.all('SELECT id, content, pages FROM documents', [], (err, documents) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch documents for rebuild' });
    }

    let processed = 0;
    const total = documents.length;

    if (total === 0) {
      return res.json({ message: 'No documents to rebuild', processed: 0, total: 0 });
    }

    documents.forEach(doc => {
      embeddingService.processDocument(doc.id, doc.content, doc.pages)
        .then(() => {
          processed++;
          if (processed === total) {
            // Update stats
            db.run(
              `INSERT OR REPLACE INTO index_stats (id, total_documents, total_chunks, last_rebuild)
               VALUES (1, ?, (SELECT COUNT(*) FROM document_chunks), CURRENT_TIMESTAMP)`,
              [total],
              (err) => {
                if (err) console.error('Stats update error:', err);
              }
            );
            res.json({ message: 'Index rebuild completed', processed, total });
          }
        })
        .catch(err => {
          console.error('Rebuild error for document:', doc.id, err);
          processed++;
          if (processed === total) {
            res.json({ message: 'Index rebuild completed with errors', processed, total });
          }
        });
    });
  });
});

// Get index stats
app.get('/api/index/stats', (req, res) => {
  db.get('SELECT * FROM index_stats WHERE id = 1', [], (err, stats) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    if (!stats) {
      return res.json({
        totalDocuments: 0,
        totalChunks: 0,
        lastRebuild: null
      });
    }

    res.json({
      totalDocuments: stats.total_documents,
      totalChunks: stats.total_chunks,
      lastRebuild: stats.last_rebuild
    });
  });
});

// Ask questions
app.post('/api/ask', async (req, res) => {
  try {
    const { query, k = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Check cache first
    const queryHash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
    const cachedResult = queryCache.get(queryHash);
    
    if (cachedResult) {
      return res.json({
        ...cachedResult,
        cached: true
      });
    }

    // Generate embedding for query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Find similar chunks
    const similarChunks = await embeddingService.findSimilarChunks(queryEmbedding, k, query);

    // Generate intelligent answer based on query intent
    const queryIntent = similarChunks.length > 0 ? similarChunks[0].queryIntent : 'general';
    let answer = 'No relevant information found in the documents.';

    if (similarChunks.length > 0) {
      const bestChunk = similarChunks[0];
      
      // Generate comprehensive answer based on intent
      switch(queryIntent) {
        case 'definition':
          answer = bestChunk.chunk_text;
          // Add related context if available
          if (similarChunks.length > 1) {
            const contextChunk = similarChunks.find(chunk => 
              chunk.chunk_text !== bestChunk.chunk_text && 
              chunk.relevanceScore > bestChunk.relevanceScore * 0.7
            );
            if (contextChunk) {
              answer += ' ' + contextChunk.chunk_text.substring(0, 200) + '...';
            }
          }
          break;
          
        case 'types':
          answer = bestChunk.chunk_text;
          // Add additional types if available
          const typeChunks = similarChunks.filter(chunk => 
            chunk.chunk_text !== bestChunk.chunk_text &&
            chunk.relevanceScore > bestChunk.relevanceScore * 0.6
          ).slice(0, 2);
          
          typeChunks.forEach(chunk => {
            answer += ' ' + chunk.chunk_text.substring(0, 150) + '...';
          });
          break;
          
        case 'examples':
          answer = bestChunk.chunk_text;
          // Add more examples
          const exampleChunks = similarChunks.filter(chunk => 
            chunk.chunk_text !== bestChunk.chunk_text &&
            chunk.relevanceScore > bestChunk.relevanceScore * 0.5
          ).slice(0, 2);
          
          exampleChunks.forEach(chunk => {
            answer += ' ' + chunk.chunk_text.substring(0, 100) + '...';
          });
          break;
          
        default:
          answer = bestChunk.chunk_text;
          // Add one additional relevant chunk for context
          if (similarChunks.length > 1 && similarChunks[1].relevanceScore > bestChunk.relevanceScore * 0.6) {
            answer += ' ' + similarChunks[1].chunk_text.substring(0, 200) + '...';
          }
      }
      
      // Limit answer length for readability
      if (answer.length > 800) {
        answer = answer.substring(0, 800) + '...';
      }
    }

    const response = {
      query: query,
      answer: answer,
      sources: similarChunks.slice(0, 3).map(chunk => ({
        documentId: chunk.document_id,
        pageNumber: chunk.page_number,
        chunkIndex: chunk.chunk_index,
        snippet: chunk.chunk_text.substring(0, 150) + '...',
        relevanceScore: chunk.relevanceScore.toFixed(2),
        intent: chunk.queryIntent
      })),
      cached: false,
      queryIntent: queryIntent
    };

    // Cache the result
    queryCache.set(queryHash, response);

    res.json(response);

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

