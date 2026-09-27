-- ==============================================================================
-- STUDYHUB / SEMESTRE 3 - COMPLETE SUPABASE DATABASE SCHEMA
-- USERNAME-ONLY CLOUD WORKSPACE ARCHITECTURE
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. WORKSPACES TABLE
-- Maps each unique username to a dedicated persistent cloud workspace
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    username_normalized TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_normalized ON public.workspaces(username_normalized);

-- Enable RLS and grant read/write access for workspace operations
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to workspaces"
    ON public.workspaces FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📚',
    color TEXT,
    semester TEXT DEFAULT 'Semester 3',
    module_type TEXT,
    code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_workspace_id ON public.subjects(workspace_id);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to subjects"
    ON public.subjects FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. FOLDERS TABLE
CREATE TABLE IF NOT EXISTS public.folders (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_workspace_id ON public.folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_folders_subject_id ON public.folders(subject_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to folders"
    ON public.folders FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. FILES TABLE (PDFs, documents, images)
CREATE TABLE IF NOT EXISTS public.files (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON public.files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_subject_id ON public.files(subject_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to files"
    ON public.files FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. READING PROGRESS TABLE (Syncs PDF reading position across all devices)
CREATE TABLE IF NOT EXISTS public.reading_progress (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    current_page INT NOT NULL DEFAULT 1,
    total_pages INT NOT NULL DEFAULT 1,
    scroll_top DOUBLE PRECISION DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_workspace_file_progress UNIQUE (workspace_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_workspace ON public.reading_progress(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_file ON public.reading_progress(file_id);
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to reading progress"
    ON public.reading_progress FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
    deadline TEXT,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON public.tasks(subject_id);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to tasks"
    ON public.tasks FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON public.notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON public.notes(subject_id);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to notes"
    ON public.notes FOR ALL
    USING (true)
    WITH CHECK (true);

-- 9. LINKS TABLE
CREATE TABLE IF NOT EXISTS public.links (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_workspace_id ON public.links(workspace_id);
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to links"
    ON public.links FOR ALL
    USING (true)
    WITH CHECK (true);

-- 10. STORAGE BUCKET CONFIGURATION (study-files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-files', 'study-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies allowing upload, read, update, delete for study-files
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public uploads to study-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public reads from study-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public updates in study-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public deletes in study-files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload study files into their folder" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view and download their own study files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own study files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own study files" ON storage.objects;
END $$;

CREATE POLICY "Allow public uploads to study-files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'study-files');

CREATE POLICY "Allow public reads from study-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'study-files');

CREATE POLICY "Allow public updates in study-files"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'study-files');

CREATE POLICY "Allow public deletes in study-files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'study-files');
