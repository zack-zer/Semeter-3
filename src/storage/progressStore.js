import { getDB } from './db';

export async function getProgress(fileId) {
  const db = await getDB();
  return (await db.get('progress', fileId)) || null;
}

export async function saveProgress(fileId, currentPage, totalPages) {
  const db = await getDB();
  const record = {
    fileId,
    currentPage,
    totalPages,
    lastOpened: new Date().toISOString()
  };
  await db.put('progress', record);
  return record;
}

export async function getRecentFiles(limit = 4) {
  const db = await getDB();
  const all = await db.getAll('progress');
  return all.sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened)).slice(0, limit);
}

export async function clearProgress(fileId) {
  const db = await getDB();
  await db.delete('progress', fileId);
}
