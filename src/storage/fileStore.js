import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { clearProgress } from './progressStore';
import { supabase, isSupabaseConfigured, getCurrentUser } from './supabaseClient';

const BUCKET_NAME = 'study-files';
// Ephemeral in-memory blob cache to prevent redundant remote re-downloads
const fileBlobCache = new Map();

/**
 * Sanitizes a filename for storage path
 */
function sanitizeFileName(name) {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function getFilesInFolder(subjectId, folderId = null) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    let query = supabase
      .from('files')
      .select('id, name, type, size, subject_id, folder_id, storage_path, created_at, updated_at')
      .eq('subject_id', subjectId);

    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else {
      query = query.is('folder_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) {
      console.error('[StudyHub] Error fetching files in folder:', error);
      throw error;
    }

    return (data || []).map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
      subjectId: f.subject_id,
      folderId: f.folder_id,
      storagePath: f.storage_path,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  if (folderId) {
    return await db.getAllFromIndex('files', 'byFolder', [subjectId, folderId]);
  } else {
    const all = await db.getAllFromIndex('files', 'bySubject', subjectId);
    return all.filter((f) => !f.folderId);
  }
}

export async function getFoldersInFolder(subjectId, parentId = null) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    let query = supabase
      .from('folders')
      .select('id, name, subject_id, parent_id, created_at')
      .eq('subject_id', subjectId);

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) {
      console.error('[StudyHub] Error fetching folders:', error);
      throw error;
    }

    return (data || []).map((f) => ({
      id: f.id,
      name: f.name,
      subjectId: f.subject_id,
      parentId: f.parent_id,
      createdAt: f.created_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  if (parentId) {
    return await db.getAllFromIndex('folders', 'byParent', [subjectId, parentId]);
  } else {
    const all = await db.getAllFromIndex('folders', 'bySubject', subjectId);
    return all.filter((f) => !f.parentId);
  }
}

export async function addFile(fileData, subjectId, folderId = null) {
  const user = await getCurrentUser();
  const id = uuidv4();
  const now = new Date().toISOString();

  if (user && isSupabaseConfigured) {
    const safeName = sanitizeFileName(fileData.name);
    const storagePath = `${user.id}/${id}_${safeName}`;

    // 1. Upload binary payload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileData.data, {
        contentType: fileData.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('[StudyHub] Supabase file upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Cache uploaded blob in memory
    if (fileData.data instanceof Blob) {
      fileBlobCache.set(id, fileData.data);
    }

    // 2. Insert metadata record in public.files table
    const record = {
      id,
      user_id: user.id,
      subject_id: subjectId,
      folder_id: folderId || null,
      name: fileData.name,
      type: fileData.type || 'application/octet-stream',
      size: fileData.size || 0,
      storage_path: storagePath,
      created_at: now,
      updated_at: now,
    };

    const { data, error: dbError } = await supabase
      .from('files')
      .insert(record)
      .select()
      .single();

    if (dbError) {
      console.error('[StudyHub] Error saving file metadata:', dbError);
      // Clean up uploaded file if metadata insertion fails
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      throw dbError;
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      size: data.size,
      subjectId: data.subject_id,
      folderId: data.folder_id,
      storagePath: data.storage_path,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const file = {
    id,
    ...fileData,
    subjectId,
    folderId,
    createdAt: now,
  };
  await db.add('files', file);
  const { data, ...fileWithoutData } = file;
  return fileWithoutData;
}

export async function addFolder(name, subjectId, parentId = null) {
  const user = await getCurrentUser();
  const id = uuidv4();
  const now = new Date().toISOString();

  if (user && isSupabaseConfigured) {
    const record = {
      id,
      user_id: user.id,
      subject_id: subjectId,
      parent_id: parentId || null,
      name,
      created_at: now,
    };

    const { data, error } = await supabase
      .from('folders')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error inserting folder:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      subjectId: data.subject_id,
      parentId: data.parent_id,
      createdAt: data.created_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const folder = {
    id,
    name,
    subjectId,
    parentId,
    createdAt: now,
  };
  await db.add('folders', folder);
  return folder;
}

export async function renameFile(id, newName) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('files')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error renaming file:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      size: data.size,
      subjectId: data.subject_id,
      folderId: data.folder_id,
      storagePath: data.storage_path,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const file = await db.get('files', id);
  if (file) {
    file.name = newName;
    await db.put('files', file);
    return file;
  }
}

export async function renameFolder(id, newName) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('folders')
      .update({ name: newName })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error renaming folder:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      subjectId: data.subject_id,
      parentId: data.parent_id,
      createdAt: data.created_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const folder = await db.get('folders', id);
  if (folder) {
    folder.name = newName;
    await db.put('folders', folder);
    return folder;
  }
}

export async function deleteFile(id) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    fileBlobCache.delete(id);

    // Get file to know storage path
    const { data: file } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();

    if (file?.storage_path) {
      await supabase.storage.from(BUCKET_NAME).remove([file.storage_path]);
    }

    await supabase.from('files').delete().eq('id', id);
    await clearProgress(id);
    return;
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  await db.delete('files', id);
  await clearProgress(id);
}

export async function deleteFolder(id) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    // 1. Find all child folders recursively
    const { data: subFolders } = await supabase
      .from('folders')
      .select('id')
      .eq('parent_id', id);

    if (subFolders && subFolders.length > 0) {
      for (const sf of subFolders) {
        await deleteFolder(sf.id);
      }
    }

    // 2. Find and delete all files in this folder
    const { data: files } = await supabase
      .from('files')
      .select('id')
      .eq('folder_id', id);

    if (files && files.length > 0) {
      for (const f of files) {
        await deleteFile(f.id);
      }
    }

    // 3. Delete folder row
    await supabase.from('folders').delete().eq('id', id);
    return;
  }

  // Fallback to local IndexedDB
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
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('files')
      .update({ folder_id: newFolderId || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error moving file:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      size: data.size,
      subjectId: data.subject_id,
      folderId: data.folder_id,
      storagePath: data.storage_path,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const file = await db.get('files', id);
  if (file) {
    file.folderId = newFolderId;
    await db.put('files', file);
    return file;
  }
}

export async function moveFolder(id, newParentId) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('folders')
      .update({ parent_id: newParentId || null })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudyHub] Error moving folder:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      subjectId: data.subject_id,
      parentId: data.parent_id,
      createdAt: data.created_at,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const folder = await db.get('folders', id);
  if (folder) {
    folder.parentId = newParentId;
    await db.put('folders', folder);
    return folder;
  }
}

export async function getFileById(id) {
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    const { data: fileRow, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[StudyHub] Error getting file by id:', error);
      throw error;
    }
    if (!fileRow) return null;

    // Check blob cache first
    let blob = fileBlobCache.get(id);
    if (!blob) {
      // Download binary from Supabase Storage
      const { data: downloadedBlob, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(fileRow.storage_path);

      if (downloadError) {
        console.error('[StudyHub] Error downloading file blob:', downloadError);
        throw new Error(`Failed to load file from storage: ${downloadError.message}`);
      }
      blob = downloadedBlob;
      fileBlobCache.set(id, blob);
    }

    return {
      id: fileRow.id,
      name: fileRow.name,
      type: fileRow.type,
      size: fileRow.size,
      subjectId: fileRow.subject_id,
      folderId: fileRow.folder_id,
      storagePath: fileRow.storage_path,
      createdAt: fileRow.created_at,
      updatedAt: fileRow.updated_at,
      data: blob,
    };
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  return await db.get('files', id);
}

export async function getFileCountForSubject(subjectId) {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { count, error } = await supabase
      .from('files')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', subjectId);

    if (error) {
      console.error('[StudyHub] Error counting files for subject:', error);
      return 0;
    }
    return count || 0;
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  return await db.countFromIndex('files', 'bySubject', subjectId);
}

export async function getFolderPath(folderId) {
  if (!folderId) return [];
  const user = await getCurrentUser();

  if (user && isSupabaseConfigured) {
    const path = [];
    let currentId = folderId;

    while (currentId) {
      const { data: folder } = await supabase
        .from('folders')
        .select('id, name, parent_id')
        .eq('id', currentId)
        .maybeSingle();

      if (!folder) break;
      path.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parent_id;
    }
    return path;
  }

  // Fallback to local IndexedDB
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
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('files')
      .select('id, name, type, size, subject_id, folder_id, storage_path, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[StudyHub] Error getting all files:', error);
      throw error;
    }

    return (data || []).map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
      subjectId: f.subject_id,
      folderId: f.folder_id,
      storagePath: f.storage_path,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  const files = await db.getAll('files');
  return files.map((f) => {
    const { data, ...rest } = f;
    return rest;
  });
}

export async function getAllFolders() {
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('folders')
      .select('id, name, subject_id, parent_id, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[StudyHub] Error getting all folders:', error);
      throw error;
    }

    return (data || []).map((f) => ({
      id: f.id,
      name: f.name,
      subjectId: f.subject_id,
      parentId: f.parent_id,
      createdAt: f.created_at,
    }));
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  return await db.getAll('folders');
}
