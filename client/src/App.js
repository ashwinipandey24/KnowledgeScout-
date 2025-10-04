import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DocsPage from './pages/DocsPage';
import AskPage from './pages/AskPage';
import AdminPage from './pages/AdminPage';
import FloatingActionButton from './components/FloatingActionButton';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              KnowledgeScout
            </Link>
            <div className="nav-menu">
              <Link to="/docs" className="nav-link">
                Documents
              </Link>
              <Link to="/ask" className="nav-link">
                Ask Questions
              </Link>
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<DocsPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/ask" element={<AskPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        
        <FloatingActionButton />
      </div>
    </Router>
  );
}

export default App;

