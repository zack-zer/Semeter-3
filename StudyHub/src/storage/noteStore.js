import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function getAllNotes() {
  const db = await getDB();
  const notes = await db.getAll('notes');
  return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getNotesBySubject(subjectId) {
  const db = await getDB();
  const notes = await db.getAllFromIndex('notes', 'bySubject', subjectId);
  return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function addNote({ title, content, subjectId }) {
  const db = await getDB();
  const now = new Date().toISOString();
  const note = {
    id: uuidv4(),
    title,
    content,
    subjectId,
    createdAt: now,
    updatedAt: now
  };
  await db.add('notes', note);
  return note;
}

export async function updateNote(id, updates) {
  const db = await getDB();
  const note = await db.get('notes', id);
  if (note) {
    const updated = { ...note, ...updates, updatedAt: new Date().toISOString() };
    await db.put('notes', updated);
    return updated;
  }
}

export async function deleteNote(id) {
  const db = await getDB();
  await db.delete('notes', id);
}
