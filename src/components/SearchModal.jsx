import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, File as FileIcon, FolderOpen, CheckSquare, StickyNote, Book, Link2, ExternalLink } from 'lucide-react';
import { searchAll } from '../utils/searchUtils';
import './SearchModal.css';

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ subjects: [], files: [], folders: [], tasks: [], notes: [], links: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    } else {
      setQuery('');
      setResults({ subjects: [], files: [], folders: [], tasks: [], notes: [], links: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ subjects: [], files: [], folders: [], tasks: [], notes: [], links: [] });
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const searchResults = await searchAll(query);
        setResults(searchResults);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!isOpen) return null;

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleOpenLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const hasResults = Object.values(results).some(arr => arr.length > 0);

  return (
    <div className="search-backdrop fade-in" onClick={onClose}>
      <div className="search-modal scale-in" onClick={e => e.stopPropagation()}>
        <div className="search-header">
          <Search className="search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search subjects, files, tasks, notes, links..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        <div className="search-body">
          {!query.trim() ? (
            <div className="search-empty-state">
              <p>Type to search...</p>
            </div>
          ) : isSearching ? (
            <div className="search-empty-state">
              <p>Searching...</p>
            </div>
          ) : !hasResults ? (
            <div className="search-empty-state">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="search-results">
              {results.subjects?.length > 0 && (
                <div className="search-section">
                  <h4 className="search-section-title">Subjects</h4>
                  {results.subjects.map(item => (
                    <div key={item.id} className="search-item" onClick={() => handleNavigate(`/subject/${item.id}`)}>
                      <Book size={18} className="search-item-icon" />
                      <span className="search-item-text">{item.icon} {item.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {results.files?.length > 0 && (
                <div className="search-section">
                  <h4 className="search-section-title">Files</h4>
                  {results.files.map(item => (
                    <div key={item.id} className="search-item" onClick={() => handleNavigate(`/viewer/${item.id}`)}>
                      <FileIcon size={18} className="search-item-icon" />
                      <span className="search-item-text">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {results.folders?.length > 0 && (
                <div className="search-section">
                  <h4 className="search-section-title">Folders</h4>
                  {results.folders.map(item => (
                    <div key={item.id} className="search-item" onClick={() => handleNavigate(`/subject/${item.subjectId}/folder/${item.id}`)}>
                      <FolderOpen size={18} className="search-item-icon" />
                      <span className="search-item-text">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {results.tasks?.length > 0 && (
                <div className="search-section">
                  <h4 className="search-section-title">Tasks</h4>
                  {results.tasks.map(item => (
                    <div key={item.id} className="search-item" onClick={() => handleNavigate('/tasks')}>
                      <CheckSquare size={18} className="search-item-icon" />
                      <span className="search-item-text">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.notes?.length > 0 && (
                <div className="search-section">
                  <h4 className="search-section-title">Notes</h4>
                  {results.notes.map(item => (
                    <div key={item.id} className="search-item" onClick={() => handleNavigate('/notes')}>
                      <StickyNote size={18} className="search-item-icon" />
                      <span className="search-item-text">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.links?.length > 0 && (
                <div className="search-section">
                  <h4 className="search-section-title">Links</h4>
                  {results.links.map(item => (
                    <div key={item.id} className="search-item" onClick={() => handleOpenLink(item.url)}>
                      <Link2 size={18} className="search-item-icon" />
                      <span className="search-item-text">{item.title}</span>
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', opacity: 0.6 }}>
                        <span>Open</span>
                        <ExternalLink size={12} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
