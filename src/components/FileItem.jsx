import React from 'react';
import { File, FileText, Image, Film, Music, Archive, Eye, Pencil, Trash2 } from 'lucide-react';
import ProgressBar from './ProgressBar';
import './FileList.css';

// Simple mock format size function since utils aren't provided in the prompt
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type) => {
  if (type.startsWith('image/')) return <Image size={20} className="file-icon image" />;
  if (type.startsWith('video/')) return <Film size={20} className="file-icon video" />;
  if (type.startsWith('audio/')) return <Music size={20} className="file-icon audio" />;
  if (type === 'application/pdf') return <FileText size={20} className="file-icon pdf" />;
  if (type.includes('zip') || type.includes('archive')) return <Archive size={20} className="file-icon archive" />;
  return <File size={20} className="file-icon default" />;
};

const FileItem = ({ file, progress, onOpen, onRename, onDelete }) => {
  const handleAction = (e, action) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="list-item" onClick={onOpen}>
      <div className="list-item-icon">
        {getFileIcon(file.type || '')}
      </div>
      
      <div className="list-item-content">
        <div className="list-item-title">{file.name}</div>
        <div className="list-item-meta">
          {formatFileSize(file.size || 0)}
          {progress && (
            <div className="file-progress-inline">
              <span className="dot">&middot;</span>
              <span className="progress-text">
                {Math.round((progress.currentPage / progress.totalPages) * 100)}%
              </span>
              <div className="progress-bar-mini">
                <ProgressBar 
                  value={(progress.currentPage / progress.totalPages) * 100} 
                  showLabel={false} 
                  size="sm" 
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="list-item-actions">
        <button className="btn-icon" onClick={(e) => handleAction(e, onOpen)} title="Open">
          <Eye size={18} />
        </button>
        <button className="btn-icon" onClick={(e) => handleAction(e, onRename)} title="Rename">
          <Pencil size={18} />
        </button>
        <button className="btn-icon text-danger" onClick={(e) => handleAction(e, onDelete)} title="Delete">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default FileItem;
