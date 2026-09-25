import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { deleteFile, deleteFolder } from './fileStore';
import { deleteTask } from './taskStore';
import { deleteNote } from './noteStore';

export async function getAllSubjects() {
  const db = await getDB();
  const subjects = await db.getAll('subjects');
  return subjects.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function getSubjectById(id) {
  const db = await getDB();
  return await db.get('subjects', id);
}

export async function addSubject(name, icon) {
  const db = await getDB();
  const subject = {
    id: uuidv4(),
    name,
    icon,
    createdAt: new Date().toISOString()
  };
  await db.add('subjects', subject);
  return subject;
}

export async function updateSubject(id, updates) {
  const db = await getDB();
  const subject = await db.get('subjects', id);
  if (!subject) return null;
  const updated = { ...subject, ...updates };
  await db.put('subjects', updated);
  return updated;
}

export async function deleteSubject(id) {
  const db = await getDB();
  
  // Get all entities first
  const fileIndex = db.transaction('files').store.index('bySubject');
  const files = await fileIndex.getAll(id);
  
  const folderIndex = db.transaction('folders').store.index('bySubject');
  const folders = await folderIndex.getAll(id);
  
  const taskIndex = db.transaction('tasks').store.index('bySubject');
  const tasks = await taskIndex.getAll(id);
  
  const noteIndex = db.transaction('notes').store.index('bySubject');
  const notes = await noteIndex.getAll(id);
  
  // Delete all related entities
  await Promise.all([
    ...files.map(f => deleteFile(f.id)),
    ...folders.map(f => deleteFolder(f.id)),
    ...tasks.map(t => deleteTask(t.id)),
    ...notes.map(n => deleteNote(n.id))
  ]);
  
  await db.delete('subjects', id);
}
