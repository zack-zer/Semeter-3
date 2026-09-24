import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { clearProgress } from './progressStore';

export async function getFilesInFolder(subjectId, folderId = null) {
  const db = await getDB();
  if (folderId) {
    return await db.getAllFromIndex('files', 'byFolder', [subjectId, folderId]);
  } else {
    const all = await db.getAllFromIndex('files', 'bySubject', subjectId);
    return all.filter(f => !f.folderId);
  }
}

export async function getFoldersInFolder(subjectId, parentId = null) {
  const db = await getDB();
  if (parentId) {
    return await db.getAllFromIndex('folders', 'byParent', [subjectId, parentId]);
  } else {
    const all = await db.getAllFromIndex('folders', 'bySubject', subjectId);
    return all.filter(f => !f.parentId);
  }
}

export async function addFile(fileData, subjectId, folderId = null) {
  const db = await getDB();
  const file = {
    id: uuidv4(),
    ...fileData,
    subjectId,
    folderId,
    createdAt: new Date().toISOString()
  };
  await db.add('files', file);
  const { data, ...fileWithoutData } = file;
  return fileWithoutData;
}

export async function addFolder(name, subjectId, parentId = null) {
  const db = await getDB();
  const folder = {
    id: uuidv4(),
    name,
    subjectId,
    parentId,
    createdAt: new Date().toISOString()
  };
  await db.add('folders', folder);
  return folder;
}

export async function renameFile(id, newName) {
  const db = await getDB();
  const file = await db.get('files', id);
  if (file) {
    file.name = newName;
    await db.put('files', file);
    return file;
  }
}

export async function renameFolder(id, newName) {
  const db = await getDB();
  const folder = await db.get('folders', id);
  if (folder) {
    folder.name = newName;
    await db.put('folders', folder);
    return folder;
  }
}

export async function deleteFile(id) {
  const db = await getDB();
  await db.delete('files', id);
  await clearProgress(id);
}

export async function deleteFolder(id) {
  const db = await getDB();
  const folder = await db.get('folders', id);
  if (!folder) return;
  
  const subFolders = await db.getAllFromIndex('folders', 'byParent', [folder.subjectId, id]);
  for (const sf of subFolders) {
    await deleteFolder(sf.id);
  }
  
  const files = await db.getAllFromIndex('files', 'byFolder', [folder.subjectId, id]);
  for (const f of files) {
    await deleteFile(f.id);
  }
  
  await db.delete('folders', id);
}

export async function moveFile(id, newFolderId) {
  const db = await getDB();
  const file = await db.get('files', id);
  if (file) {
    file.folderId = newFolderId;
    await db.put('files', file);
    return file;
  }
}

export async function moveFolder(id, newParentId) {
  const db = await getDB();
  const folder = await db.get('folders', id);
  if (folder) {
    folder.parentId = newParentId;
    await db.put('folders', folder);
    return folder;
  }
}

export async function getFileById(id) {
  const db = await getDB();
  return await db.get('files', id);
}

export async function getFileCountForSubject(subjectId) {
  const db = await getDB();
  return await db.countFromIndex('files', 'bySubject', subjectId);
}

export async function getFolderPath(folderId) {
  if (!folderId) return [];
  const db = await getDB();
  let current = await db.get('folders', folderId);
  const path = [];
  while (current) {
    path.unshift({ id: current.id, name: current.name });
    if (current.parentId) {
      current = await db.get('folders', current.parentId);
    } else {
      break;
    }
  }
  return path;
}

export async function getAllFiles() {
  const db = await getDB();
  const files = await db.getAll('files');
  return files.map(f => {
    const { data, ...rest } = f;
    return rest;
  });
}

export async function getAllFolders() {
  const db = await getDB();
  return await db.getAll('folders');
}
