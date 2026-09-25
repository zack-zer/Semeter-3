// Maps file extensions to categories and icon names (Lucide icons)

const FILE_TYPES = {
  pdf: { category: 'pdf', icon: 'FileText', color: '#ef4444' },
  txt: { category: 'text', icon: 'FileText', color: '#8b8fa3' },
  md: { category: 'text', icon: 'FileText', color: '#8b8fa3' },
  doc: { category: 'document', icon: 'FileText', color: '#3b82f6' },
  docx: { category: 'document', icon: 'FileText', color: '#3b82f6' },
  ppt: { category: 'presentation', icon: 'Presentation', color: '#f59e0b' },
  pptx: { category: 'presentation', icon: 'Presentation', color: '#f59e0b' },
  xls: { category: 'spreadsheet', icon: 'Sheet', color: '#22c55e' },
  xlsx: { category: 'spreadsheet', icon: 'Sheet', color: '#22c55e' },
  jpg: { category: 'image', icon: 'Image', color: '#a855f7' },
  jpeg: { category: 'image', icon: 'Image', color: '#a855f7' },
  png: { category: 'image', icon: 'Image', color: '#a855f7' },
  gif: { category: 'image', icon: 'Image', color: '#a855f7' },
  svg: { category: 'image', icon: 'Image', color: '#a855f7' },
  zip: { category: 'archive', icon: 'Archive', color: '#f59e0b' },
  rar: { category: 'archive', icon: 'Archive', color: '#f59e0b' },
  '7z': { category: 'archive', icon: 'Archive', color: '#f59e0b' },
  mp4: { category: 'video', icon: 'Video', color: '#ec4899' },
  mp3: { category: 'audio', icon: 'Music', color: '#06b6d4' },
  py: { category: 'code', icon: 'Code', color: '#22c55e' },
  js: { category: 'code', icon: 'Code', color: '#f59e0b' },
  java: { category: 'code', icon: 'Code', color: '#ef4444' },
  c: { category: 'code', icon: 'Code', color: '#3b82f6' },
  cpp: { category: 'code', icon: 'Code', color: '#3b82f6' },
  html: { category: 'code', icon: 'Code', color: '#f59e0b' },
  css: { category: 'code', icon: 'Code', color: '#3b82f6' },
  sql: { category: 'code', icon: 'Database', color: '#4db8a4' },
};

export function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

export function getFileTypeInfo(filename) {
  const ext = getFileExtension(filename);
  return FILE_TYPES[ext] || { category: 'other', icon: 'File', color: '#8b8fa3' };
}

export function canPreview(filename) {
  const { category } = getFileTypeInfo(filename);
  return ['pdf', 'text', 'image', 'code'].includes(category);
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
