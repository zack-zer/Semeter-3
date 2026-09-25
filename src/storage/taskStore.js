import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function getAllTasks() {
  const db = await getDB();
  const tasks = await db.getAll('tasks');
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getTasksBySubject(subjectId) {
  const db = await getDB();
  const tasks = await db.getAllFromIndex('tasks', 'bySubject', subjectId);
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function addTask({ title, description, subjectId, deadline }) {
  const db = await getDB();
  const task = {
    id: uuidv4(),
    title,
    description,
    subjectId,
    deadline,
    done: false,
    createdAt: new Date().toISOString()
  };
  await db.add('tasks', task);
  return task;
}

export async function updateTask(id, updates) {
  const db = await getDB();
  const task = await db.get('tasks', id);
  if (task) {
    const updated = { ...task, ...updates };
    await db.put('tasks', updated);
    return updated;
  }
}

export async function deleteTask(id) {
  const db = await getDB();
  await db.delete('tasks', id);
}

export async function toggleTaskDone(id) {
  const db = await getDB();
  const task = await db.get('tasks', id);
  if (task) {
    task.done = !task.done;
    await db.put('tasks', task);
    return task;
  }
}

export async function getTaskStats() {
  const tasks = await getAllTasks();
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  return { total, done, pending: total - done };
}
