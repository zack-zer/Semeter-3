import { openDB } from 'idb';

const DB_NAME = 'StudyHubDB';
const DB_VERSION = 2;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Subjects store
      if (!db.objectStoreNames.contains('subjects')) {
        db.createObjectStore('subjects', { keyPath: 'id' });
      }
      // Folders store
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('bySubject', 'subjectId');
        folderStore.createIndex('byParent', ['subjectId', 'parentId']);
      }
      // Files store
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('bySubject', 'subjectId');
        fileStore.createIndex('byFolder', ['subjectId', 'folderId']);
      }
      // Tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('bySubject', 'subjectId');
      }
      // Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('bySubject', 'subjectId');
      }
      // Progress store - tracks reading position per file
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'fileId' });
      }
      // Links store
      if (!db.objectStoreNames.contains('links')) {
        db.createObjectStore('links', { keyPath: 'id' });
      }
    },
  });
}
