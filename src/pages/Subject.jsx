import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderPlus, Upload, FileText, CheckSquare, Edit3 } from 'lucide-react';
import { getSubjectById } from '../storage/subjectStore';
import { getFilesInFolder, getFoldersInFolder, addFile, addFolder, renameFile, renameFolder, deleteFile, deleteFolder, getFolderPath } from '../storage/fileStore';
import { getTasksBySubject, addTask, updateTask, deleteTask, toggleTaskDone } from '../storage/taskStore';
import { getNotesBySubject, addNote, updateNote, deleteNote } from '../storage/noteStore';
import { getProgress } from '../storage/progressStore';
import Breadcrumbs from '../components/Breadcrumbs';
import FolderItem from '../components/FolderItem';
import FileItem from '../components/FileItem';
import TaskItem from '../components/TaskItem';
import NoteCard from '../components/NoteCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import './Subject.css';

const Subject = () => {
  const { subjectId, folderId } = useParams();
  const navigate = useNavigate();
  const currentFolderId = folderId || null;
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('files');
  const [subject, setSubject] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalState, setModalState] = useState({ type: null, item: null }); // type: 'addFolder', 'rename', 'delete', 'task', 'note'
  const [formData, setFormData] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const sub = await getSubjectById(subjectId);
      if (!sub) {
        navigate('/semester');
        return;
      }
      setSubject(sub);

      // Breadcrumbs
      const path = await getFolderPath(currentFolderId);
      const crumbs = [
        { label: 'Semester 3', path: '/semester' },
        { label: sub.name, path: `/subject/${subjectId}` }
      ];
      path.forEach(p => crumbs.push({ label: p.name, path: `/subject/${subjectId}/folder/${p.id}` }));
      setBreadcrumbs(crumbs);

      if (activeTab === 'files') {
        const flds = await getFoldersInFolder(subjectId, currentFolderId);
        const fls = await getFilesInFolder(subjectId, currentFolderId);
        
        // Enrich folders with count
        const enrichedFlds = await Promise.all(flds.map(async f => {
          const innerFiles = await getFilesInFolder(subjectId, f.id);
          const innerFolders = await getFoldersInFolder(subjectId, f.id);
          return { ...f, itemCount: innerFiles.length + innerFolders.length };
        }));

        // Enrich files with progress
        const enrichedFls = await Promise.all(fls.map(async f => {
          const prog = await getProgress(f.id);
          return { ...f, progress: prog };
        }));

        setFolders(enrichedFlds);
        setFiles(enrichedFls);
      } else if (activeTab === 'tasks') {
        const ts = await getTasksBySubject(subjectId);
        setTasks(ts);
      } else if (activeTab === 'notes') {
        const ns = await getNotesBySubject(subjectId);
        setNotes(ns);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subjectId, currentFolderId, activeTab]);

  const handleFileUpload = async (eventOrFiles) => {
    let uploadedFiles;
    if (eventOrFiles.target) {
      uploadedFiles = Array.from(eventOrFiles.target.files);
    } else {
      uploadedFiles = Array.from(eventOrFiles);
    }
    
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    
    setLoading(true);
    try {
      for (const file of uploadedFiles) {
        await addFile({
          name: file.name,
          type: file.type,
          size: file.size,
          data: file
        }, subjectId, currentFolderId);
      }
      loadData();
    } catch (err) {
      console.error('Upload failed', err);
      setLoading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (activeTab === 'files') {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const closeModals = () => {
    setModalState({ type: null, item: null });
    setFormData({});
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const { type, item } = modalState;
    try {
      if (type === 'addFolder') {
        if (formData.name) await addFolder(formData.name, subjectId, currentFolderId);
      } else if (type === 'rename') {
        if (formData.name) {
          if (item.type) await renameFile(item.id, formData.name); // is file
          else await renameFolder(item.id, formData.name); // is folder
        }
      } else if (type === 'delete') {
        if (item.type) await deleteFile(item.id);
        else await deleteFolder(item.id);
      } else if (type === 'task') {
        if (item) await updateTask(item.id, formData);
        else await addTask({ ...formData, subjectId });
      } else if (type === 'note') {
        if (item) await updateNote(item.id, formData);
        else await addNote({ ...formData, subjectId });
      }
      closeModals();
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskAction = async (action, task) => {
    if (action === 'toggle') {
      await toggleTaskDone(task.id);
      loadData();
    } else if (action === 'edit') {
      setFormData({ title: task.title, description: task.description, deadline: task.deadline });
      setModalState({ type: 'task', item: task });
    } else if (action === 'delete') {
      await deleteTask(task.id);
      loadData();
    }
  };

  const handleNoteAction = async (action, note) => {
    if (action === 'edit') {
      setFormData({ title: note.title, content: note.content });
      setModalState({ type: 'note', item: note });
    } else if (action === 'delete') {
      await deleteNote(note.id);
      loadData();
    }
  };

  if (!subject) return <div className="p-8">Loading...</div>;

  return (
    <div className="subject-container fade-in">
      <header className="page-header">
        <Breadcrumbs items={breadcrumbs} />
        <div className="flex justify-between items-end mt-4">
          <h1 className="page-title mb-0 flex items-center gap-2">
            <span>{subject.icon}</span> {subject.name}
          </h1>
          <div className="toolbar flex gap-2">
            {activeTab === 'files' && (
              <>
                <button className="btn btn-secondary flex items-center gap-2" onClick={() => setModalState({ type: 'addFolder' })}>
                  <FolderPlus size={16} /> New Folder
                </button>
                <button className="btn btn-primary flex items-center gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} /> Add Files
                </button>
                <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileUpload} />
              </>
            )}
            {activeTab === 'tasks' && (
              <button className="btn btn-primary" onClick={() => { setFormData({title:'', description:'', deadline:''}); setModalState({type: 'task'}); }}>+ Add Task</button>
            )}
            {activeTab === 'notes' && (
              <button className="btn btn-primary" onClick={() => { setFormData({title:'', content:''}); setModalState({type: 'note'}); }}>+ Add Note</button>
            )}
          </div>
        </div>
      </header>

      <div className="tabs mb-6">
        <button className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}><FileText size={18}/> Files</button>
        <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}><CheckSquare size={18}/> Tasks</button>
        <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}><Edit3 size={18}/> Notes</button>
      </div>

      <div className="tab-content">
        {loading && <div className="py-8 text-center text-muted">Loading data...</div>}
        
        {!loading && activeTab === 'files' && (
          <div 
            className={`file-area ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {folders.length === 0 && files.length === 0 ? (
              <div className="empty-folder text-center py-12">
                <Upload size={48} className="mx-auto text-muted mb-4" />
                <h3 className="text-lg font-medium mb-2">This folder is empty</h3>
                <p className="text-secondary">Upload files or create a folder to get started.</p>
                <p className="text-xs text-muted mt-4">You can also drag and drop files here</p>
              </div>
            ) : (
              <div className="grid-list">
                {folders.map(f => (
                  <FolderItem 
                    key={f.id} 
                    folder={f} 
                    itemCount={f.itemCount}
                    onOpen={() => navigate(`/subject/${subjectId}/folder/${f.id}`)}
                    onRename={() => { setFormData({name: f.name}); setModalState({type: 'rename', item: f}); }}
                    onDelete={() => setModalState({type: 'delete', item: f})}
                  />
                ))}
                {files.map(f => (
                  <FileItem 
                    key={f.id} 
                    file={f}
                    progress={f.progress}
                    onOpen={() => navigate(`/viewer/${f.id}`)}
                    onRename={() => { setFormData({name: f.name}); setModalState({type: 'rename', item: f}); }}
                    onDelete={() => setModalState({type: 'delete', item: f})}
                  />
                ))}
              </div>
            )}
            {isDragging && <div className="drop-overlay">Drop files to upload</div>}
          </div>
        )}

        {!loading && activeTab === 'tasks' && (
          <div className="tasks-area">
            {tasks.length === 0 ? (
              <p className="text-center text-secondary py-8">No tasks for this subject yet.</p>
            ) : (
              <div className="task-list">
                {tasks.map(t => (
                  <TaskItem 
                    key={t.id} 
                    task={t} 
                    subjectName={subject.name}
                    onToggle={() => handleTaskAction('toggle', t)}
                    onEdit={() => handleTaskAction('edit', t)}
                    onDelete={() => handleTaskAction('delete', t)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'notes' && (
          <div className="notes-area grid-3">
            {notes.length === 0 ? (
              <div className="col-span-full text-center text-secondary py-8">No notes for this subject yet.</div>
            ) : (
              notes.map(n => (
                <NoteCard 
                  key={n.id} 
                  note={n} 
                  subjectName={subject.name}
                  onEdit={() => handleNoteAction('edit', n)}
                  onDelete={() => handleNoteAction('delete', n)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={['addFolder', 'rename', 'task', 'note'].includes(modalState.type)} 
        title={
          modalState.type === 'addFolder' ? 'New Folder' : 
          modalState.type === 'rename' ? 'Rename' : 
          modalState.type === 'task' ? (modalState.item ? 'Edit Task' : 'Add Task') : 
          (modalState.item ? 'Edit Note' : 'Add Note')
        }
        onClose={closeModals}
      >
        <form onSubmit={handleModalSubmit}>
          {(modalState.type === 'addFolder' || modalState.type === 'rename') && (
            <div className="form-group mb-4">
              <label className="block text-sm font-medium mb-2">Name</label>
              <input type="text" className="input w-full" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus required />
            </div>
          )}
          {modalState.type === 'task' && (
            <>
              <div className="form-group mb-4">
                <label className="block text-sm font-medium mb-2">Title</label>
                <input type="text" className="input w-full" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus required />
              </div>
              <div className="form-group mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea className="textarea w-full" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="block text-sm font-medium mb-2">Deadline (Optional)</label>
                <input type="date" className="input w-full" value={formData.deadline || ''} onChange={e => setFormData({...formData, deadline: e.target.value})} />
              </div>
            </>
          )}
          {modalState.type === 'note' && (
            <>
              <div className="form-group mb-4">
                <label className="block text-sm font-medium mb-2">Title</label>
                <input type="text" className="input w-full" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus required />
              </div>
              <div className="form-group mb-4">
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea className="textarea w-full" rows={6} value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} required />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-ghost" onClick={closeModals}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={modalState.type === 'delete'}
        title={`Delete ${modalState.item?.type ? 'File' : 'Folder'}`}
        message={`Are you sure you want to delete "${modalState.item?.name}"? ${!modalState.item?.type ? 'All contents inside this folder will also be deleted.' : ''} This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleModalSubmit}
        onCancel={closeModals}
      />
    </div>
  );
};

export default Subject;
