import React from 'react';
import { Pencil, Trash2, Clock } from 'lucide-react';

const NoteCard = ({ note, subjectName, onEdit, onDelete }) => {
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="card note-card" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>{note.title}</h3>
        {subjectName && (
          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: '999px', fontWeight: 600, flexShrink: 0 }}>
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
