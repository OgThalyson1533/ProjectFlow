-- 1) UPDATE STORAGE POLICIES

DROP POLICY IF EXISTS "storage_anexos_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_anexos_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_anexos_delete" ON storage.objects;

CREATE POLICY "storage_anexos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'anexos_tarefas');

CREATE POLICY "storage_anexos_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'anexos_tarefas');

CREATE POLICY "storage_anexos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'anexos_tarefas' AND owner = auth.uid());

-- ══════════════════════════════════════════════════════════════


-- 2) UPDATE PUBLIC POLICIES

--  BLOCO 8 — RLS (Row Level Security)
-- ══════════════════════════════════════════════════════════════

-- Remove todas as políticas antigas (idempotente)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname='public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swimlanes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_boards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_diagrams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exec_documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_doc_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_blocks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_recorrencia ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "p_profiles_sel" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_profiles_ins" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "p_profiles_upd" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- clients (público para usuários autenticados)
CREATE POLICY "p_clients_all" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- workspaces
CREATE POLICY "p_ws_sel" ON public.workspaces FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_ws_ins" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_ws_upd" ON public.workspaces FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "p_ws_del" ON public.workspaces FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- workspace_members
CREATE POLICY "p_wm_sel" ON public.workspace_members FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_wm_ins" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_wm_del" ON public.workspace_members FOR DELETE TO authenticated USING (TRUE);

-- projects
CREATE POLICY "p_proj_sel" ON public.projects FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_proj_ins" ON public.projects FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_proj_upd" ON public.projects FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "p_proj_del" ON public.projects FOR DELETE TO authenticated USING (TRUE);

-- project_members
CREATE POLICY "p_pm_sel" ON public.project_members FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_pm_ins" ON public.project_members FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_pm_del" ON public.project_members FOR DELETE TO authenticated USING (TRUE);

-- swimlanes
CREATE POLICY "p_sl_all" ON public.swimlanes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- kanban boards
CREATE POLICY "p_board_sel" ON public.kanban_boards FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_board_ins" ON public.kanban_boards FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_board_upd" ON public.kanban_boards FOR UPDATE TO authenticated USING (TRUE);

-- kanban columns
CREATE POLICY "p_col_sel" ON public.kanban_columns FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_col_ins" ON public.kanban_columns FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_col_upd" ON public.kanban_columns FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "p_col_del" ON public.kanban_columns FOR DELETE TO authenticated USING (TRUE);

-- tasks
CREATE POLICY "p_task_sel" ON public.tasks FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_task_ins" ON public.tasks FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_task_upd" ON public.tasks FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "p_task_del" ON public.tasks FOR DELETE TO authenticated USING (TRUE);

-- subtasks
CREATE POLICY "p_sub_all" ON public.subtasks FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- attachments
CREATE POLICY "p_att_sel" ON public.task_attachments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_att_ins" ON public.task_attachments FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_att_del" ON public.task_attachments FOR DELETE TO authenticated USING (TRUE);

-- comments
CREATE POLICY "p_cmt_sel" ON public.comments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_cmt_ins" ON public.comments FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_cmt_upd" ON public.comments FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "p_cmt_del" ON public.comments FOR DELETE TO authenticated USING (TRUE);

-- task_history
CREATE POLICY "p_hist_sel" ON public.task_history FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_hist_ins" ON public.task_history FOR INSERT TO authenticated WITH CHECK (TRUE);

-- pipeline
CREATE POLICY "p_stage_all" ON public.pipeline_stages FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- leads
CREATE POLICY "p_lead_all" ON public.leads FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_lint_all" ON public.lead_interactions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- diagrams
CREATE POLICY "p_diag_sel" ON public.project_diagrams FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_diag_ins" ON public.project_diagrams FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "p_diag_upd" ON public.project_diagrams FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "p_diag_del" ON public.project_diagrams FOR DELETE TO authenticated USING (TRUE);

-- docs & ai
CREATE POLICY "p_edoc_sel" ON public.exec_documents FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_edoc_ins" ON public.exec_documents FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "p_snap_sel" ON public.ai_doc_snapshots FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "p_snap_ins" ON public.ai_doc_snapshots FOR INSERT TO authenticated WITH CHECK (TRUE);

-- knowledge base
CREATE POLICY "p_kb_all" ON public.knowledge_blocks FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- recorrencias
CREATE POLICY "p_rec_all" ON public.configuracao_recorrencia FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ══════════════════════════════════════════════════════════════
