-- Patch para adicionar a coluna doc_links na tabela tasks
-- E recarregar o cache do schema do Supabase

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS doc_links TEXT;

-- Força o PostgREST (API do Supabase) a recarregar o schema cache
NOTIFY pgrst, 'reload schema';
