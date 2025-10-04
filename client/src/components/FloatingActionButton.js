import React from 'react';
import { Link } from 'react-router-dom';

const FloatingActionButton = () => {
  return (
    <div className="fab-container">
      <Link to="/docs" className="fab fab-primary" title="Upload Document">
        📄
      </Link>
      <Link to="/ask" className="fab fab-secondary" title="Ask Question">
        ❓
      </Link>
      <Link to="/admin" className="fab fab-tertiary" title="Admin Panel">
        ⚙️
      </Link>
    </div>
  );
};

export default FloatingActionButton;


