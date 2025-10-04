# KnowledgeScout Server

This is the backend server for KnowledgeScout, a document Q&A system.

## Installation

```bash
cd server
npm install
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Environment Variables

- `PORT`: Server port (default: 5000)

## API Endpoints

- `POST /api/docs` - Upload documents
- `GET /api/docs` - List documents with pagination
- `GET /api/docs/:id` - Get specific document
- `POST /api/index/rebuild` - Rebuild document index
- `GET /api/index/stats` - Get indexing statistics
- `POST /api/ask` - Ask questions about documents

## Database

The application uses SQLite database (`database.sqlite`) with the following tables:
- `documents` - Document metadata and content
- `document_chunks` - Document chunks with embeddings
- `query_cache` - Cached query results
- `index_stats` - Indexing statistics



