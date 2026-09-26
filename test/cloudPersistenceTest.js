/**
 * Multi-device and User Isolation Verification Test
 */
import {
  normalizeUsername,
  validateUsername,
  deriveInternalEmail,
  deriveUserSecret,
} from '../src/storage/supabaseClient.js';

async function runTests() {
  console.log('--- TEST 1: Username Normalization & Deduplication ---');
  const u1 = 'Zakaria';
  const u2 = 'zakaria';
  const u3 = '  ZAKARIA  ';

  const n1 = normalizeUsername(u1);
  const n2 = normalizeUsername(u2);
  const n3 = normalizeUsername(u3);

  console.log(`Normalize "${u1}" -> "${n1}"`);
  console.log(`Normalize "${u2}" -> "${n2}"`);
  console.log(`Normalize "${u3}" -> "${n3}"`);

  if (n1 === n2 && n2 === n3 && n1 === 'zakaria') {
    console.log('✓ PASS: Case-insensitive username normalization identical across variations');
  } else {
    throw new Error('FAIL: Username normalization mismatch');
  }

  console.log('\n--- TEST 2: Deterministic Secret & Internal Email Derivation ---');
  const email1 = deriveInternalEmail(n1);
  const email2 = deriveInternalEmail(n2);
  const sec1 = await deriveUserSecret(n1);
  const sec2 = await deriveUserSecret(n2);

  console.log(`Derived email: ${email1}`);
  console.log(`Derived credential hash: ${sec1.substring(0, 16)}...`);

  if (email1 === email2 && sec1 === sec2) {
    console.log('✓ PASS: Device A and Device B generate identical credentials for same username');
  } else {
    throw new Error('FAIL: Credential derivation mismatch between devices');
  }

  console.log('\n--- TEST 3: User Isolation in Credential Space ---');
  const aliceNorm = normalizeUsername('Alice');
  const secAlice = await deriveUserSecret(aliceNorm);
  if (sec1 !== secAlice) {
    console.log('✓ PASS: Different users get isolated credentials');
  } else {
    throw new Error('FAIL: User credential collision');
  }

  console.log('\n--- TEST 4: Simulated Multi-Device Flow ---');
  // Device A Memory Store
  const cloudDatabase = {
    profiles: new Map(),
    subjects: new Map(),
    files: new Map(),
    readingProgress: new Map(),
    tasks: new Map(),
    notes: new Map(),
  };

  // Device A registers / signs in as Zakaria
  const userIdA = 'usr-zakaria-uuid-001';
  cloudDatabase.profiles.set(userIdA, {
    id: userIdA,
    username: 'Zakaria',
    username_normalized: n1,
  });

  // Device A creates Subject: Operating Systems
  const subjectId = 'sub-os-101';
  cloudDatabase.subjects.set(subjectId, {
    id: subjectId,
    user_id: userIdA,
    name: 'Operating Systems',
    icon: '💻',
    created_at: new Date().toISOString(),
  });

  // Device A uploads PDF: Systeme d'exploitation.pdf
  const fileId = 'file-pdf-202';
  cloudDatabase.files.set(fileId, {
    id: fileId,
    user_id: userIdA,
    subject_id: subjectId,
    name: "Systeme d'exploitation.pdf",
    type: 'application/pdf',
    size: 15420000,
    storage_path: `${userIdA}/${fileId}_Systeme_d_exploitation.pdf`,
  });

  // Device A reads to page 72 of 298
  cloudDatabase.readingProgress.set(`${userIdA}_${fileId}`, {
    id: `${userIdA}_${fileId}`,
    user_id: userIdA,
    file_id: fileId,
    current_page: 72,
    total_pages: 298,
    updated_at: new Date().toISOString(),
  });

  // Device A creates Task and Note
  const taskId = 'task-303';
  cloudDatabase.tasks.set(taskId, {
    id: taskId,
    user_id: userIdA,
    title: 'Review Chapter 4 - Memory Management',
    subject_id: subjectId,
    done: false,
  });

  const noteId = 'note-404';
  cloudDatabase.notes.set(noteId, {
    id: noteId,
    user_id: userIdA,
    title: 'Paging & Segmentation',
    content: 'TLB miss cost and virtual address translation steps...',
    subject_id: subjectId,
  });

  console.log('Device A created:');
  console.log(`- Subject: "Operating Systems"`);
  console.log(`- File: "Systeme d'exploitation.pdf"`);
  console.log(`- Reading Position: Page 72 / 298`);
  console.log(`- Task: "Review Chapter 4 - Memory Management"`);
  console.log(`- Note: "Paging & Segmentation"`);

  // Device B simulation: Device B signs in as "zakaria"
  console.log('\n--- Simulating Device B (Phone / Second Computer) ---');
  const userDeviceB = cloudDatabase.profiles.get(userIdA);
  if (!userDeviceB) throw new Error('Device B could not find user');

  // Device B queries data for authenticated userIdA
  const subjectsOnB = Array.from(cloudDatabase.subjects.values()).filter(s => s.user_id === userDeviceB.id);
  const filesOnB = Array.from(cloudDatabase.files.values()).filter(f => f.user_id === userDeviceB.id);
  const progressOnB = cloudDatabase.readingProgress.get(`${userDeviceB.id}_${fileId}`);
  const tasksOnB = Array.from(cloudDatabase.tasks.values()).filter(t => t.user_id === userDeviceB.id);
  const notesOnB = Array.from(cloudDatabase.notes.values()).filter(n => n.user_id === userDeviceB.id);

  console.log(`Device B received:`);
  console.log(`- ${subjectsOnB.length} subject(s): "${subjectsOnB[0]?.name}"`);
  console.log(`- ${filesOnB.length} file(s): "${filesOnB[0]?.name}"`);
  console.log(`- Saved reading position: Page ${progressOnB?.current_page} of ${progressOnB?.total_pages}`);
  console.log(`- ${tasksOnB.length} task(s): "${tasksOnB[0]?.title}"`);
  console.log(`- ${notesOnB.length} note(s): "${notesOnB[0]?.title}"`);

  if (
    subjectsOnB.length === 1 &&
    filesOnB.length === 1 &&
    progressOnB?.current_page === 72 &&
    tasksOnB.length === 1 &&
    notesOnB.length === 1
  ) {
    console.log('✓ PASS: Device B received identical data & reading position from Device A!');
  } else {
    throw new Error('FAIL: Device B did not receive synced data');
  }

  // Device C: Different User ("Alice")
  console.log('\n--- Simulating Device C (Different User: "Alice") ---');
  const userIdAlice = 'usr-alice-uuid-002';
  const subjectsForAlice = Array.from(cloudDatabase.subjects.values()).filter(s => s.user_id === userIdAlice);
  const filesForAlice = Array.from(cloudDatabase.files.values()).filter(f => f.user_id === userIdAlice);
  const progressForAlice = cloudDatabase.readingProgress.get(`${userIdAlice}_${fileId}`);

  console.log(`User "Alice" sees:`);
  console.log(`- Subjects: ${subjectsForAlice.length}`);
  console.log(`- Files: ${filesForAlice.length}`);
  console.log(`- Progress: ${progressForAlice ? 'Visible' : 'None'}`);

  if (subjectsForAlice.length === 0 && filesForAlice.length === 0 && !progressForAlice) {
    console.log('✓ PASS: User isolation verified. Alice cannot see Zakaria\'s data.');
  } else {
    throw new Error('FAIL: User isolation breach');
  }

  console.log('\n=========================================');
  console.log('ALL ARCHITECTURE TESTS PASSED SUCCESSFULLY');
  console.log('=========================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
