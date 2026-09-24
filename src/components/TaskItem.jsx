import React from 'react';
import { Pencil, Trash2, Calendar, Check } from 'lucide-react';
import './TaskItem.css';

const TaskItem = ({ task, subjectName, onToggle, onEdit, onDelete }) => {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.done;
  
  return (
    <div className={`task-item ${task.done ? 'task-done' : ''}`}>
      <button 
        className={`task-checkbox ${task.done ? 'checked' : ''}`} 
        onClick={() => onToggle(task.id)}
      >
        {task.done && <Check size={14} strokeWidth={3} />}
      </button>
      
      <div className="task-content">
        <div className="task-header">
          <h4 className="task-title">{task.title}</h4>
          {subjectName && <span className="task-badge">{subjectName}</span>}
        </div>
        
        {task.description && (
          <p className="task-description">{task.description}</p>
        )}
        
        {task.deadline && (
          <div className={`task-deadline ${isOverdue ? 'overdue' : ''}`}>
            <Calendar size={14} />
            <span>{new Date(task.deadline).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      
      <div className="task-actions">
        <button className="btn-icon" onClick={() => onEdit(task)}>
          <Pencil size={18} />
        </button>
        <button className="btn-icon text-danger" onClick={() => onDelete(task.id)}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default TaskItem;
