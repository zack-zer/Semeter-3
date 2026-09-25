import React from 'react';
import { Pencil, Trash2, Clock } from 'lucide-react';

const NoteCard = ({ note, subjectName, onEdit, onDelete }) => {
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="card note-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{note.title}</h3>
        {subjectName && (
          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderRadius: '999px' }}>
            {subjectName}
          </span>
        )}
      </div>
      
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {note.content}
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Clock size={14} />
          <span>{formatDate(note.updatedAt || note.createdAt)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn-icon" onClick={() => onEdit(note)}>
            <Pencil size={16} />
          </button>
          <button className="btn-icon text-danger" onClick={() => onDelete(note.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
