# KnowledgeScout

A document Q&A system that allows users to upload documents, embed them for search, and answer queries with snippet sources and page references.

## Features

- Document upload and management
- Document embedding and indexing
- Q&A system with source references
- Private document controls
- Query caching
- Pagination support

## Tech Stack

- **Frontend:** React, HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** SQLite
- **APIs:** REST with JSON

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:3000`

## API Endpoints

- `POST /api/docs` - Upload documents (multipart)
- `GET /api/docs` - List documents with pagination
- `GET /api/docs/:id` - Get specific document
- `POST /api/index/rebuild` - Rebuild document index
- `GET /api/index/stats` - Get indexing statistics
- `POST /api/ask` - Ask questions about documents

## Pages

- `/docs` - Document management
- `/ask` - Q&A interface
- `/admin` - Admin panel



