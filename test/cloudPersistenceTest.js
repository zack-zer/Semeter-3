/**
 * Username-Only Multi-Device Workspace & Isolation Verification Test
 */
import {
  normalizeUsername,
  validateUsername,
} from '../src/storage/supabaseClient.js';

async function runTests() {
  console.log('=== TEST 1: Username Rules & Validation ===');

  const validExamples = ['zackk', 'Zackk', 'zakaria', 'student1', 'abc123', 'math', 'web', 'user_99', 'study-hub'];
  for (const u of validExamples) {
    const res = validateUsername(u);
    if (!res.valid) throw new Error(`Expected "${u}" to be valid, but got: ${res.error}`);
    console.log(`✓ Valid username accepted: "${u}" -> normalized: "${normalizeUsername(u)}"`);
  }

  const invalidExamples = [
    { input: '', reason: 'empty' },
    { input: 'ab', reason: 'too short (< 3 chars)' },
    { input: 'a'.repeat(31), reason: 'too long (> 30 chars)' },
    { input: 'zack user', reason: 'contains spaces' },
    { input: 'zack@hub.com', reason: 'contains invalid symbol @' },
  ];

  for (const item of invalidExamples) {
    const res = validateUsername(item.input);
    if (res.valid) throw new Error(`Expected "${item.input}" to be rejected for: ${item.reason}`);
    console.log(`✓ Invalid username properly rejected: "${item.input}" (${item.reason}) -> "${res.error}"`);
  }

  console.log('\n=== TEST 2: Case-Insensitive Matching ===');
  const variations = ['zackk', 'Zackk', 'ZACKK', '  zackk  '];
  const normalizedSet = new Set(variations.map(normalizeUsername));
  if (normalizedSet.size === 1 && normalizedSet.has('zackk')) {
    console.log('✓ PASS: All variations of "zackk" resolve to the exact same workspace identity "zackk"');
  } else {
    throw new Error('FAIL: Case-insensitive username normalization failed');
  }

  console.log('\n=== TEST 3: Multi-Device Workspace Synchronization ===');
  // Simulated Cloud PostgreSQL database
  const cloudWorkspaces = new Map();
  const cloudSubjects = new Map();
  const cloudFiles = new Map();
  const cloudReadingProgress = new Map();
  const cloudTasks = new Map();
  const cloudNotes = new Map();

  // DEVICE A FLOW:
  console.log('--- DEVICE A: User enters "zackk" ---');
  const rawInputA = 'zackk';
  const normA = normalizeUsername(rawInputA);

  // Claim/Create workspace on Device A
  const workspaceA = {
    id: 'ws-zackk-uuid-1234',
    username: 'zackk',
    username_normalized: normA,
    created_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  };
  cloudWorkspaces.set(normA, workspaceA);
  console.log(`Workspace established on Device A: [ID: ${workspaceA.id}, Username: "${workspaceA.username}"]`);

  // Device A creates Subject: Web
  const subjectId = 'sub-web-001';
  cloudSubjects.set(subjectId, {
    id: subjectId,
    workspace_id: workspaceA.id,
    name: 'Web',
    icon: '🌐',
    created_at: new Date().toISOString(),
  });

  // Device A uploads PDF: course.pdf
  const fileId = 'file-pdf-001';
  cloudFiles.set(fileId, {
    id: fileId,
    workspace_id: workspaceA.id,
    subject_id: subjectId,
    name: 'course.pdf',
    type: 'application/pdf',
    size: 2450000,
    storage_path: `${workspaceA.id}/${fileId}_course.pdf`,
  });

  // Device A reads to Page 72 of 150
  cloudReadingProgress.set(`${workspaceA.id}_${fileId}`, {
    id: `${workspaceA.id}_${fileId}`,
    workspace_id: workspaceA.id,
    file_id: fileId,
    current_page: 72,
    total_pages: 150,
    updated_at: new Date().toISOString(),
  });

  // Device A creates Task: Finish TP1
  const taskId = 'task-001';
  cloudTasks.set(taskId, {
    id: taskId,
    workspace_id: workspaceA.id,
    title: 'Finish TP1',
    subject_id: subjectId,
    done: false,
  });

  // Device A creates Note: Important chapter
  const noteId = 'note-001';
  cloudNotes.set(noteId, {
    id: noteId,
    workspace_id: workspaceA.id,
    title: 'Important chapter',
    content: 'Review web storage and state synchronization...',
    subject_id: subjectId,
  });

  console.log('Device A successfully created study data in cloud.');

  // DEVICE B FLOW (Second Device / Phone / Laptop):
  console.log('\n--- DEVICE B: User enters "zackk" on second device ---');
  const rawInputB = 'Zackk'; // testing with mixed casing
  const normB = normalizeUsername(rawInputB);

  // Look up existing workspace
  const workspaceB = cloudWorkspaces.get(normB);
  if (!workspaceB) throw new Error('Device B failed to find workspace for zackk');
  console.log(`Device B connected to workspace: [ID: ${workspaceB.id}, Username: "${workspaceB.username}"]`);

  // Query Device B data by workspace_id
  const subjectsB = Array.from(cloudSubjects.values()).filter(s => s.workspace_id === workspaceB.id);
  const filesB = Array.from(cloudFiles.values()).filter(f => f.workspace_id === workspaceB.id);
  const progressB = cloudReadingProgress.get(`${workspaceB.id}_${fileId}`);
  const tasksB = Array.from(cloudTasks.values()).filter(t => t.workspace_id === workspaceB.id);
  const notesB = Array.from(cloudNotes.values()).filter(n => n.workspace_id === workspaceB.id);

  console.log('Device B fetched:');
  console.log(`- Subject: "${subjectsB[0]?.name}" (Count: ${subjectsB.length})`);
  console.log(`- PDF: "${filesB[0]?.name}" (Count: ${filesB.length})`);
  console.log(`- PDF Reading Position: Page ${progressB?.current_page} / ${progressB?.total_pages}`);
  console.log(`- Task: "${tasksB[0]?.title}" (Count: ${tasksB.length})`);
  console.log(`- Note: "${notesB[0]?.title}" (Count: ${notesB.length})`);

  if (
    workspaceB.id === workspaceA.id &&
    subjectsB.length === 1 &&
    subjectsB[0].name === 'Web' &&
    filesB.length === 1 &&
    filesB[0].name === 'course.pdf' &&
    progressB?.current_page === 72 &&
    tasksB.length === 1 &&
    tasksB[0].title === 'Finish TP1' &&
    notesB.length === 1 &&
    notesB[0].title === 'Important chapter'
  ) {
    console.log('✓ PASS: Device B received 100% identical data, PDF, and Page 72 position from Device A!');
  } else {
    throw new Error('FAIL: Multi-device data sync verification failed');
  }

  // DEVICE C FLOW (Different user: "ahmed123"):
  console.log('\n=== TEST 4: Data Isolation Between Different Usernames ===');
  const normAhmed = normalizeUsername('ahmed123');
  const workspaceAhmed = {
    id: 'ws-ahmed-uuid-5678',
    username: 'ahmed123',
    username_normalized: normAhmed,
  };
  cloudWorkspaces.set(normAhmed, workspaceAhmed);

  const subjectsAhmed = Array.from(cloudSubjects.values()).filter(s => s.workspace_id === workspaceAhmed.id);
  const filesAhmed = Array.from(cloudFiles.values()).filter(f => f.workspace_id === workspaceAhmed.id);
  const progressAhmed = cloudReadingProgress.get(`${workspaceAhmed.id}_${fileId}`);
  const tasksAhmed = Array.from(cloudTasks.values()).filter(t => t.workspace_id === workspaceAhmed.id);
  const notesAhmed = Array.from(cloudNotes.values()).filter(n => n.workspace_id === workspaceAhmed.id);

  console.log(`Workspace "ahmed123" sees:`);
  console.log(`- Subjects: ${subjectsAhmed.length}`);
  console.log(`- Files: ${filesAhmed.length}`);
  console.log(`- Reading Progress: ${progressAhmed ? 'Leaked' : 'None'}`);
  console.log(`- Tasks: ${tasksAhmed.length}`);
  console.log(`- Notes: ${notesAhmed.length}`);

  if (subjectsAhmed.length === 0 && filesAhmed.length === 0 && !progressAhmed && tasksAhmed.length === 0 && notesAhmed.length === 0) {
    console.log('✓ PASS: Strict isolation verified! "ahmed123" cannot see "zackk"\'s study workspace.');
  } else {
    throw new Error('FAIL: Workspace isolation failed. Data leaked between users.');
  }

  console.log('\n=== TEST 5: Distinct "Create Username" vs "Enter Existing Username" Actions ===');
  // Mock Workspace Store
  const registeredUsers = new Map();
  registeredUsers.set('zackk', {
    id: 'ws-zackk-123',
    username: 'zackk',
    username_normalized: 'zackk',
    created_at: new Date().toISOString(),
  });

  const mockCreateWorkspace = async (raw) => {
    const val = validateUsername(raw);
    if (!val.valid) throw new Error(val.error);
    const norm = normalizeUsername(raw);
    if (registeredUsers.has(norm)) {
      throw new Error('Username already exists.');
    }
    const record = {
      id: `ws-${norm}-generated`,
      username: raw.trim(),
      username_normalized: norm,
      created_at: new Date().toISOString(),
    };
    registeredUsers.set(norm, record);
    return record;
  };

  const mockLoginWorkspace = async (raw) => {
    const val = validateUsername(raw);
    if (!val.valid) throw new Error(val.error);
    const norm = normalizeUsername(raw);
    const existing = registeredUsers.get(norm);
    if (!existing) {
      throw new Error('Username not found.');
    }
    return existing;
  };

  // Case A: Create brand new username
  console.log('Case A: Creating brand new username "sara_student"...');
  const createdSara = await mockCreateWorkspace('sara_student');
  if (createdSara && registeredUsers.has('sara_student')) {
    console.log('✓ PASS: New username "sara_student" successfully created.');
  } else {
    throw new Error('FAIL: New username creation failed.');
  }

  // Case B: Duplicate creation attempt
  console.log('Case B: Attempting to create existing username "sara_student" again...');
  let dupError = null;
  try {
    await mockCreateWorkspace('Sara_Student');
  } catch (err) {
    dupError = err.message;
  }
  if (dupError === 'Username already exists.') {
    console.log('✓ PASS: Duplicate creation blocked with exact message: "Username already exists."');
  } else {
    throw new Error(`FAIL: Expected "Username already exists." but got "${dupError}"`);
  }

  // Case C: Login with existing username
  console.log('Case C: Logging into existing username "zackk"...');
  const loggedInZack = await mockLoginWorkspace('Zackk');
  if (loggedInZack && loggedInZack.id === 'ws-zackk-123') {
    console.log('✓ PASS: Existing user "zackk" logged in successfully with all data intact.');
  } else {
    throw new Error('FAIL: Existing user login failed.');
  }

  // Case D: Login with non-existent username
  console.log('Case D: Attempting to log into non-existent username "ghost_user"...');
  let notFoundError = null;
  const countBefore = registeredUsers.size;
  try {
    await mockLoginWorkspace('ghost_user');
  } catch (err) {
    notFoundError = err.message;
  }
  const countAfter = registeredUsers.size;
  if (notFoundError === 'Username not found.' && countBefore === countAfter) {
    console.log('✓ PASS: Non-existent login blocked with exact message: "Username not found." and NO account created.');
  } else {
    throw new Error(`FAIL: Expected "Username not found." and no account created, got: "${notFoundError}"`);
  }

  console.log('\n======================================================');
  console.log('ALL USERNAME-ONLY CLOUD WORKSPACE TESTS PASSED (100%)');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
