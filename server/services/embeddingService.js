const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class EmbeddingService {
  constructor() {
    this.db = new sqlite3.Database('./database.sqlite');
    this.chunkSize = 400; // Optimal size for comprehensive answers
    this.chunkOverlap = 100; // Better overlap for context
  }

  // Enhanced text embedding with query-specific scoring
  generateEmbedding(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Create a weighted vector representation
    const embedding = {};
    const totalWords = words.length;
    
    Object.keys(wordCounts).forEach(word => {
      // Use TF-IDF-like weighting
      const tf = wordCounts[word] / totalWords;
      embedding[word] = tf;
    });

    return embedding;
  }

  // Advanced query processing with intent analysis
  processQuery(query) {
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Enhanced synonym expansion with context
    const expandedQuery = [...words];
    
    const synonyms = {
      'ai': ['artificial', 'intelligence', 'machine', 'smart', 'automated'],
      'machine': ['learning', 'algorithm', 'model', 'system', 'automation'],
      'neural': ['network', 'deep', 'learning', 'brain', 'cognitive'],
      'deep': ['learning', 'neural', 'network', 'advanced', 'sophisticated'],
      'nlp': ['natural', 'language', 'processing', 'text', 'linguistic'],
      'computer': ['vision', 'image', 'recognition', 'visual', 'optical'],
      'algorithm': ['method', 'technique', 'approach', 'procedure', 'process'],
      'data': ['dataset', 'information', 'training', 'sample', 'example'],
      'model': ['algorithm', 'system', 'network', 'framework', 'architecture'],
      'training': ['learning', 'optimization', 'fitting', 'education', 'development'],
      'intelligence': ['smart', 'cognitive', 'mental', 'brain', 'mind'],
      'learning': ['education', 'training', 'development', 'improvement', 'adaptation'],
      'vision': ['sight', 'visual', 'image', 'optical', 'perception'],
      'language': ['speech', 'text', 'communication', 'linguistic', 'verbal'],
      'processing': ['analysis', 'computation', 'handling', 'manipulation', 'treatment']
    };

    words.forEach(word => {
      if (synonyms[word]) {
        expandedQuery.push(...synonyms[word]);
      }
    });

    return [...new Set(expandedQuery)]; // Remove duplicates
  }

  // Analyze query intent for better answer generation
  analyzeQueryIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    const intentPatterns = {
      definition: ['what is', 'define', 'definition', 'meaning', 'explain'],
      types: ['types', 'kinds', 'categories', 'varieties', 'different'],
      examples: ['examples', 'instance', 'case', 'sample', 'illustration'],
      how: ['how', 'process', 'method', 'way', 'procedure'],
      when: ['when', 'history', 'timeline', 'evolution', 'development'],
      where: ['where', 'applications', 'uses', 'implementations', 'deployments'],
      why: ['why', 'benefits', 'advantages', 'importance', 'significance'],
      comparison: ['vs', 'versus', 'compare', 'difference', 'contrast']
    };

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => lowerQuery.includes(pattern))) {
        return intent;
      }
    }
    
    return 'general';
  }

  // Enhanced similarity calculation with intent-aware scoring
  calculateRelevanceScore(queryWords, chunkText, chunkEmbedding, queryIntent) {
    const chunkWords = chunkText.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    let score = 0;
    let matchedWords = 0;
    
    // Calculate word-level matching with weights
    queryWords.forEach(queryWord => {
      const wordMatches = chunkWords.filter(chunkWord => 
        chunkWord.includes(queryWord) || queryWord.includes(chunkWord)
      ).length;
      
      if (wordMatches > 0) {
        matchedWords++;
        // Higher weight for exact matches
        const exactMatches = chunkWords.filter(chunkWord => chunkWord === queryWord).length;
        score += exactMatches * 4 + (wordMatches - exactMatches) * 2;
      }
    });
    
    // Intent-based scoring bonuses
    const lowerChunk = chunkText.toLowerCase();
    switch(queryIntent) {
      case 'definition':
        if (lowerChunk.includes('is a') || lowerChunk.includes('refers to') || 
            lowerChunk.includes('means') || lowerChunk.includes('defined as')) {
          score *= 2.0;
        }
        break;
      case 'types':
        if (lowerChunk.includes('types') || lowerChunk.includes('categories') || 
            lowerChunk.includes('kinds') || lowerChunk.includes('varieties')) {
          score *= 1.8;
        }
        break;
      case 'examples':
        if (lowerChunk.includes('examples') || lowerChunk.includes('instance') || 
            lowerChunk.includes('such as') || lowerChunk.includes('including')) {
          score *= 1.6;
        }
        break;
      case 'how':
        if (lowerChunk.includes('how') || lowerChunk.includes('process') || 
            lowerChunk.includes('method') || lowerChunk.includes('way')) {
          score *= 1.5;
        }
        break;
      case 'applications':
        if (lowerChunk.includes('applications') || lowerChunk.includes('uses') || 
            lowerChunk.includes('implementations') || lowerChunk.includes('deployments')) {
          score *= 1.7;
        }
        break;
    }
    
    // Bonus for having multiple query words in the chunk
    const coverageRatio = matchedWords / queryWords.length;
    score *= (1 + coverageRatio * 2);
    
    // Length penalty - prefer concise but complete answers
    const lengthPenalty = Math.max(0.2, 1 - (chunkText.length - 100) / 1000);
    score *= lengthPenalty;
    
    return score;
  }

  // Enhanced chunking strategy for better Q&A results
  splitIntoChunks(text, pages) {
    const chunks = [];
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    let currentChunk = '';
    let chunkIndex = 0;
    let currentPage = 1;
    const charsPerPage = Math.ceil(text.length / pages);

    paragraphs.forEach(paragraph => {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) return;

      // If adding this paragraph would exceed chunk size, finalize current chunk
      if (currentChunk.length + trimmedParagraph.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          page: currentPage,
          index: chunkIndex++
        });
        
        // Start new chunk with overlap
        const overlap = currentChunk.slice(-this.chunkOverlap);
        currentChunk = overlap + '\n\n' + trimmedParagraph;
        
        // Estimate page number based on character position
        currentPage = Math.min(pages, Math.ceil((chunkIndex * this.chunkSize) / charsPerPage));
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }

      // If current chunk is getting too long, split it by sentences
      if (currentChunk.length > this.chunkSize * 1.5) {
        const sentences = currentChunk.split(/[.!?]+/).filter(s => s.trim().length > 10);
        let sentenceChunk = '';
        
        sentences.forEach(sentence => {
          if (sentenceChunk.length + sentence.length > this.chunkSize && sentenceChunk.length > 0) {
            chunks.push({
              text: sentenceChunk.trim(),
              page: currentPage,
              index: chunkIndex++
            });
            sentenceChunk = sentence;
            currentPage = Math.min(pages, Math.ceil((chunkIndex * this.chunkSize) / charsPerPage));
          } else {
            sentenceChunk += sentence;
          }
        });
        
        currentChunk = sentenceChunk;
      }
    });

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        page: currentPage,
        index: chunkIndex
      });
    }

    return chunks;
  }

  // Process document and create chunks with embeddings
  async processDocument(documentId, content, pages) {
    return new Promise((resolve, reject) => {
      // Delete existing chunks for this document
      this.db.run('DELETE FROM document_chunks WHERE document_id = ?', [documentId], (err) => {
        if (err) {
          console.error('Error deleting existing chunks:', err);
          return reject(err);
        }

        // Split content into chunks
        const chunks = this.splitIntoChunks(content, pages);
        
        let processed = 0;
        const total = chunks.length;

        if (total === 0) {
          return resolve();
        }

        chunks.forEach(chunk => {
          const embedding = this.generateEmbedding(chunk.text);
          const embeddingJson = JSON.stringify(embedding);

          this.db.run(
            `INSERT INTO document_chunks (id, document_id, page_number, chunk_text, embedding, chunk_index)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [require('uuid').v4(), documentId, chunk.page, chunk.text, embeddingJson, chunk.index],
            function(err) {
              if (err) {
                console.error('Error inserting chunk:', err);
                return reject(err);
              }

              processed++;
              if (processed === total) {
                resolve();
              }
            }
          );
        });
      });
    });
  }

  // Find similar chunks based on query with enhanced relevance scoring
  async findSimilarChunks(queryEmbedding, k = 5, originalQuery = '') {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM document_chunks', [], (err, chunks) => {
        if (err) {
          console.error('Error fetching chunks:', err);
          return reject(err);
        }

        // Process the query to get expanded terms and intent
        const queryText = Object.keys(queryEmbedding).join(' ');
        const queryWords = this.processQuery(queryText);
        const queryIntent = this.analyzeQueryIntent(originalQuery);

        // Calculate relevance scores for each chunk
        const scoredChunks = chunks.map(chunk => {
          const relevanceScore = this.calculateRelevanceScore(queryWords, chunk.chunk_text, JSON.parse(chunk.embedding), queryIntent);
          
          return {
            ...chunk,
            relevanceScore: relevanceScore,
            queryIntent: queryIntent
          };
        });

        // Sort by relevance score and return top k
        const topChunks = scoredChunks
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, k)
          .filter(chunk => chunk.relevanceScore > 0.5); // Balanced filtering

        resolve(topChunks);
      });
    });
  }
}

module.exports = new EmbeddingService();

