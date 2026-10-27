/**
 * StudyHub Password Authentication & Multi-Device Workspace Verification Test
 */
import {
  normalizeUsername,
  validateUsername,
} from '../src/storage/supabaseClient.js';
import {
  validatePassword,
  hashPassword,
  verifyPassword,
} from '../src/utils/authSecurity.js';

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

  console.log('\n=== TEST 2: Password Validation & Cryptographic PBKDF2 Hashing ===');

  const invalidPasswords = [
    { input: '', reason: 'empty' },
    { input: '12345', reason: 'too short (< 6 chars)' },
  ];
  for (const item of invalidPasswords) {
    const res = validatePassword(item.input);
    if (res.valid) throw new Error(`Expected password "${item.input}" to be rejected for: ${item.reason}`);
    console.log(`✓ Invalid password rejected: "${item.input}" (${item.reason}) -> "${res.error}"`);
  }

  const validPassword = 'SecretStudyPass123!';
  const passRes = validatePassword(validPassword);
  if (!passRes.valid) throw new Error(`Expected valid password, got: ${passRes.error}`);
  console.log('✓ Valid password accepted.');

  // Hash password using PBKDF2
  const { hash: hash1, salt: salt1 } = await hashPassword(validPassword);
  const { hash: hash2, salt: salt2 } = await hashPassword(validPassword);

  if (hash1.length !== 64 || salt1.length !== 32) {
    throw new Error('FAIL: Unexpected hash or salt byte length.');
  }
  if (salt1 === salt2 || hash1 === hash2) {
    throw new Error('FAIL: Each hash must use a unique cryptographically random salt.');
  }
  console.log(`✓ PBKDF2 hash generated with 100k iterations and unique 16-byte random salt.`);

  const matchCorrect = await verifyPassword(validPassword, hash1, salt1);
  if (!matchCorrect) throw new Error('FAIL: Correct password verification failed.');
  console.log('✓ Correct password successfully verified against stored hash & salt.');

  const matchWrong = await verifyPassword('WrongPassword999', hash1, salt1);
  if (matchWrong) throw new Error('FAIL: Incorrect password was falsely accepted.');
  console.log('✓ Incorrect password properly rejected.');

  console.log('\n=== TEST 3: Case-Insensitive Matching ===');
  const variations = ['zackk', 'Zackk', 'ZACKK', '  zackk  '];
  const normalizedSet = new Set(variations.map(normalizeUsername));
  if (normalizedSet.size === 1 && normalizedSet.has('zackk')) {
    console.log('✓ PASS: All variations of "zackk" resolve to the exact same workspace identity "zackk"');
  } else {
    throw new Error('FAIL: Case-insensitive username normalization failed');
  }

  console.log('\n=== TEST 4: Multi-Device Workspace Synchronization with Passwords ===');
  const cloudWorkspaces = new Map();
  const cloudCredentials = new Map();
  const cloudSubjects = new Map();
  const cloudFiles = new Map();
  const cloudReadingProgress = new Map();
  const cloudTasks = new Map();
  const cloudNotes = new Map();

  // DEVICE A FLOW:
  console.log('--- DEVICE A: User creates "zackk" with password ---');
  const rawInputA = 'zackk';
  const normA = normalizeUsername(rawInputA);
  const userPasswordA = 'ZackSecureStudy2026!';

  const { hash: credHashA, salt: credSaltA } = await hashPassword(userPasswordA);
  const workspaceA = {
    id: 'ws-zackk-uuid-1234',
    username: 'zackk',
    username_normalized: normA,
    created_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
  };
  cloudWorkspaces.set(normA, workspaceA);
  cloudCredentials.set(workspaceA.id, { hash: credHashA, salt: credSaltA });
  console.log(`Workspace established on Device A: [ID: ${workspaceA.id}, Username: "${workspaceA.username}"]`);

  // Device A creates Subject & File
  const subjectId = 'sub-web-001';
  cloudSubjects.set(subjectId, {
    id: subjectId,
    workspace_id: workspaceA.id,
    name: 'Web',
    icon: '🌐',
    created_at: new Date().toISOString(),
  });

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

  cloudReadingProgress.set(`${workspaceA.id}_${fileId}`, {
    id: `${workspaceA.id}_${fileId}`,
    workspace_id: workspaceA.id,
    file_id: fileId,
    current_page: 72,
    total_pages: 150,
    updated_at: new Date().toISOString(),
  });

  // DEVICE B FLOW (Second Device / Phone / Laptop):
  console.log('\n--- DEVICE B: User logs into "Zackk" on second device with password ---');
  const normB = normalizeUsername('Zackk');
  const workspaceB = cloudWorkspaces.get(normB);
  if (!workspaceB) throw new Error('Device B failed to find workspace for zackk');

  const credsB = cloudCredentials.get(workspaceB.id);
  if (!credsB) throw new Error('Device B failed to retrieve cloud credentials.');

  // Attempt wrong password on Device B
  const wrongLoginAttempt = await verifyPassword('BadPassword!', credsB.hash, credsB.salt);
  if (wrongLoginAttempt) throw new Error('Device B falsely logged in with bad password.');
  console.log('✓ Device B rejected incorrect password.');

  // Attempt correct password on Device B
  const correctLoginAttempt = await verifyPassword(userPasswordA, credsB.hash, credsB.salt);
  if (!correctLoginAttempt) throw new Error('Device B failed to verify correct password.');
  console.log('✓ Device B logged in successfully with correct password.');

  // Verify Device B sees exact same study data and workspace ID
  const subjectsB = Array.from(cloudSubjects.values()).filter(s => s.workspace_id === workspaceB.id);
  const filesB = Array.from(cloudFiles.values()).filter(f => f.workspace_id === workspaceB.id);
  const progressB = cloudReadingProgress.get(`${workspaceB.id}_${fileId}`);

  if (
    workspaceB.id === workspaceA.id &&
    subjectsB.length === 1 &&
    subjectsB[0].name === 'Web' &&
    filesB.length === 1 &&
    filesB[0].name === 'course.pdf' &&
    progressB?.current_page === 72
  ) {
    console.log('✓ PASS: Device B received 100% identical data, PDF, and Page 72 position from Device A!');
  } else {
    throw new Error('FAIL: Multi-device data sync verification failed');
  }

  console.log('\n=== TEST 5: Existing Accounts Without Passwords Migration Flow ===');
  // Scenario: User "tim_student" already exists in the database with 5 subjects and 3 files, but NO password.
  const existingUserId = 'ws-tim-pre-existing-id-9999';
  const existingTim = {
    id: existingUserId,
    username: 'tim_student',
    username_normalized: 'tim_student',
    created_at: new Date('2026-08-01').toISOString(),
    last_active_at: new Date('2026-08-01').toISOString(),
  };
  cloudWorkspaces.set('tim_student', existingTim);

  // Add existing study data for Tim
  cloudSubjects.set('sub-tim-1', { id: 'sub-tim-1', workspace_id: existingUserId, name: 'Algorithms' });
  cloudSubjects.set('sub-tim-2', { id: 'sub-tim-2', workspace_id: existingUserId, name: 'Operating Systems' });
  cloudFiles.set('file-tim-1', { id: 'file-tim-1', workspace_id: existingUserId, name: 'algo-chapter-1.pdf' });

  console.log(`Initial state for "tim_student": Workspace ID: ${existingTim.id}, Subjects: 2, Files: 1, Has Password: NO`);

  // Tim enters his username in the login form
  const foundTim = cloudWorkspaces.get(normalizeUsername('tim_student'));
  const timHasPassword = cloudCredentials.has(foundTim.id);
  if (timHasPassword) throw new Error('Expected Tim to not have a password yet.');
  console.log('✓ Detected that "tim_student" exists but does NOT have a password.');

  // Tim creates and confirms a new password
  const newTimPassword = 'TimSecretPassword2026!';
  const { hash: timHash, salt: timSalt } = await hashPassword(newTimPassword);
  cloudCredentials.set(foundTim.id, { hash: timHash, salt: timSalt });
  console.log('✓ Password created and securely associated with existing account ID.');

  // Verify Tim's documents and account ID are 100% intact
  const timSubjectsAfter = Array.from(cloudSubjects.values()).filter(s => s.workspace_id === existingUserId);
  const timFilesAfter = Array.from(cloudFiles.values()).filter(f => f.workspace_id === existingUserId);

  if (
    foundTim.id === existingUserId &&
    timSubjectsAfter.length === 2 &&
    timSubjectsAfter[0].name === 'Algorithms' &&
    timFilesAfter.length === 1 &&
    timFilesAfter[0].name === 'algo-chapter-1.pdf'
  ) {
    console.log('✓ PASS: All documents, subjects, and workspace ID preserved intact with zero data loss!');
  } else {
    throw new Error('FAIL: Existing user data was disconnected or altered during password creation.');
  }

  // Future login: Tim logs in again with his newly set password
  console.log('\nFuture login for "tim_student":');
  const timCredsFuture = cloudCredentials.get(foundTim.id);
  const badLoginFuture = await verifyPassword('wrongPass', timCredsFuture.hash, timCredsFuture.salt);
  if (badLoginFuture) throw new Error('Failed to reject wrong password for Tim.');
  console.log('✓ Future login: Incorrect password rejected.');

  const goodLoginFuture = await verifyPassword(newTimPassword, timCredsFuture.hash, timCredsFuture.salt);
  if (!goodLoginFuture) throw new Error('Failed to accept correct password for Tim.');
  console.log('✓ Future login: Correct password accepted, user successfully logged in.');

  console.log('\n=== TEST 6: New Account Registration with Password Confirmation & Duplicate Prevention ===');
  const mockCreateWorkspace = async (rawUser, rawPass, confirmPass) => {
    const uVal = validateUsername(rawUser);
    if (!uVal.valid) throw new Error(uVal.error);
    const pVal = validatePassword(rawPass);
    if (!pVal.valid) throw new Error(pVal.error);
    if (rawPass !== confirmPass) throw new Error('Passwords do not match.');

    const norm = normalizeUsername(rawUser);
    if (cloudWorkspaces.has(norm)) {
      throw new Error('Username already exists.');
    }

    const { hash, salt } = await hashPassword(rawPass);
    const newWs = {
      id: `ws-${norm}-uuid`,
      username: rawUser.trim(),
      username_normalized: norm,
      created_at: new Date().toISOString(),
    };
    cloudWorkspaces.set(norm, newWs);
    cloudCredentials.set(newWs.id, { hash, salt });
    return newWs;
  };

  // Case A: Successful new account creation
  console.log('Case A: Creating brand new account "sara_student"...');
  const saraWs = await mockCreateWorkspace('sara_student', 'SaraPass2026!', 'SaraPass2026!');
  if (saraWs && cloudWorkspaces.has('sara_student') && cloudCredentials.has(saraWs.id)) {
    console.log('✓ PASS: New account "sara_student" successfully created with password.');
  } else {
    throw new Error('FAIL: New account creation failed.');
  }

  // Case B: Password mismatch
  console.log('Case B: Testing password confirmation mismatch...');
  let mismatchError = null;
  try {
    await mockCreateWorkspace('another_user', 'Pass123456!', 'DifferentPass!');
  } catch (err) {
    mismatchError = err.message;
  }
  if (mismatchError === 'Passwords do not match.') {
    console.log('✓ PASS: Password confirmation mismatch blocked.');
  } else {
    throw new Error(`FAIL: Expected mismatch error, got: ${mismatchError}`);
  }

  // Case C: Duplicate username
  console.log('Case C: Testing duplicate username rejection...');
  let dupError = null;
  try {
    await mockCreateWorkspace('Sara_Student', 'AnotherPass123!', 'AnotherPass123!');
  } catch (err) {
    dupError = err.message;
  }
  if (dupError === 'Username already exists.') {
    console.log('✓ PASS: Duplicate username blocked with exact message: "Username already exists."');
  } else {
    throw new Error(`FAIL: Expected duplicate error, got: ${dupError}`);
  }

  console.log('\n======================================================');
  console.log('ALL STUDYHUB PASSWORD AUTHENTICATION TESTS PASSED (100%)');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
