import { getAllSubjects } from '../storage/subjectStore';
import { getAllFiles, getAllFolders } from '../storage/fileStore';
import { getAllTasks } from '../storage/taskStore';
import { getAllNotes } from '../storage/noteStore';

export async function searchAll(query) {
  if (!query || query.trim().length === 0) {
    return { subjects: [], files: [], folders: [], tasks: [], notes: [] };
  }

  const q = query.toLowerCase().trim();
  
  const [subjects, files, folders, tasks, notes] = await Promise.all([
    getAllSubjects(),
    getAllFiles(),
    getAllFolders(),
    getAllTasks(),
    getAllNotes(),
  ]);

  return {
    subjects: subjects.filter(s => s.name.toLowerCase().includes(q)),
    files: files.filter(f => f.name.toLowerCase().includes(q)),
    folders: folders.filter(f => f.name.toLowerCase().includes(q)),
    tasks: tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q))
    ),
    notes: notes.filter(n => 
      n.title.toLowerCase().includes(q) || 
      (n.content && n.content.toLowerCase().includes(q))
    ),
  };
}
