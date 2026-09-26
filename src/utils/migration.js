import { getDB } from '../storage/db';
import { supabase, isSupabaseConfigured } from '../storage/supabaseClient';

/**
 * Checks if there is any legacy data in local IndexedDB to migrate
 */
export async function checkLocalDataExists() {
  try {
    const db = await getDB();
    const subjects = await db.getAll('subjects');
    const files = await db.getAll('files');
    const tasks = await db.getAll('tasks');
    const notes = await db.getAll('notes');

    const totalCount = subjects.length + files.length + tasks.length + notes.length;
    return {
      hasData: totalCount > 0,
      counts: {
        subjects: subjects.length,
        files: files.length,
        tasks: tasks.length,
        notes: notes.length,
      },
      data: {
        subjects,
        files,
        tasks,
        notes,
      },
    };
  } catch (err) {
    console.warn('[StudyHub] Error checking local data:', err);
    return { hasData: false, counts: {}, data: {} };
  }
}

/**
 * Migrates local IndexedDB records to the logged-in user's Supabase cloud account
 * @param {object} user - Supabase user object with id
 * @param {function} onProgress - Optional callback for progress updates
 */
export async function migrateLocalDataToCloud(user, onProgress) {
  if (!user?.id || !isSupabaseConfigured) {
    throw new Error('Supabase not configured or user unauthenticated.');
  }

  const { data } = await checkLocalDataExists();
  const db = await getDB();
  const folders = await db.getAll('folders');

  let migratedCounts = {
    subjects: 0,
    folders: 0,
    files: 0,
    tasks: 0,
    notes: 0,
  };

  // 1. Migrate Subjects
  if (data.subjects?.length) {
    onProgress?.(`Migrating ${data.subjects.length} subjects to cloud...`);
    for (const sub of data.subjects) {
      await supabase.from('subjects').upsert({
        id: sub.id,
        user_id: user.id,
        name: sub.name,
        icon: sub.icon || '📚',
        color: sub.color || null,
        semester: sub.semester || 'Semester 3',
        module_type: sub.moduleType || null,
        code: sub.code || null,
        created_at: sub.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      migratedCounts.subjects++;
    }
  }

  // 2. Migrate Folders
  if (folders?.length) {
    onProgress?.(`Migrating ${folders.length} folders to cloud...`);
    for (const fld of folders) {
      await supabase.from('folders').upsert({
        id: fld.id,
        user_id: user.id,
        subject_id: fld.subjectId,
        parent_id: fld.parentId || null,
        name: fld.name,
        created_at: fld.createdAt || new Date().toISOString(),
      });
      migratedCounts.folders++;
    }
  }

  // 3. Migrate Files & Upload Binaries to Storage
  if (data.files?.length) {
    onProgress?.(`Uploading ${data.files.length} files to cloud storage...`);
    for (const file of data.files) {
      const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${file.id}_${safeName}`;

      if (file.data) {
        await supabase.storage.from('study-files').upload(storagePath, file.data, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });
      }

      await supabase.from('files').upsert({
        id: file.id,
        user_id: user.id,
        subject_id: file.subjectId,
        folder_id: file.folderId || null,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
        storage_path: storagePath,
        created_at: file.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      migratedCounts.files++;
    }
  }

  // 4. Migrate Tasks
  if (data.tasks?.length) {
    onProgress?.(`Migrating ${data.tasks.length} tasks...`);
    for (const task of data.tasks) {
      await supabase.from('tasks').upsert({
        id: task.id,
        user_id: user.id,
        title: task.title,
        description: task.description || '',
        subject_id: task.subjectId || null,
        deadline: task.deadline || null,
        done: Boolean(task.done),
        created_at: task.createdAt || new Date().toISOString(),
      });
      migratedCounts.tasks++;
    }
  }

  // 5. Migrate Notes
  if (data.notes?.length) {
    onProgress?.(`Migrating ${data.notes.length} notes...`);
    for (const note of data.notes) {
      await supabase.from('notes').upsert({
        id: note.id,
        user_id: user.id,
        title: note.title,
        content: note.content || '',
        subject_id: note.subjectId || null,
        created_at: note.createdAt || new Date().toISOString(),
        updated_at: note.updatedAt || new Date().toISOString(),
      });
      migratedCounts.notes++;
    }
  }

  // Mark as migrated for this user
  localStorage.setItem(`studyhub_migrated_${user.id}`, 'true');

  return migratedCounts;
}
