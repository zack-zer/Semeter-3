import React from 'react';
import { FolderOpen, Pencil, Trash2 } from 'lucide-react';
import './FileList.css';

const FolderItem = ({ folder, itemCount, onOpen, onRename, onDelete }) => {
  const handleAction = (e, action) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="list-item folder-item" onClick={onOpen}>
      <div className="list-item-icon">
        <FolderOpen size={20} className="folder-icon" />
      </div>
      
      <div className="list-item-content">
        <div className="list-item-title">{folder.name}</div>
        <div className="list-item-meta">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </div>
      </div>
      
      <div className="list-item-actions">
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

export default FolderItem;
