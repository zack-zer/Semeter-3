import React from 'react';
import { Pencil, Trash2, Clock, StickyNote } from 'lucide-react';

const NoteCard = ({ note, subjectName, onEdit, onDelete }) => {
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="card note-card">
      <div className="note-card-header">
        <div className="note-icon-wrap">
          <StickyNote size={16} />
        </div>
        <h3 className="note-card-title">{note.title}</h3>
        {subjectName && (
          <span className="note-subject-badge">
            {subjectName}
          </span>
        )}
      </div>
      
      <p className="note-card-content">
        {note.content}
      </p>
      
      <div className="note-card-footer">
        <div className="note-card-date">
          <Clock size={13} />
          <span>{formatDate(note.updatedAt || note.createdAt)}</span>
        </div>
        
        <div className="note-card-actions">
          <button className="btn-icon" onClick={() => onEdit(note)} title="Edit Note">
            <Pencil size={15} />
          </button>
          <button className="btn-icon text-danger" onClick={() => onDelete(note.id)} title="Delete Note">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
