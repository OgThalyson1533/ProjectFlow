-- ══════════════════════════════════════════════════════════════
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

CREATE POLICY "p_profi_all" ON public.profiles FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_clien_all" ON public.clients FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_works_all" ON public.workspaces FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_works_all2" ON public.workspace_members FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_proje_all" ON public.projects FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_proje_all2" ON public.project_members FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_swiml_all" ON public.swimlanes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_kanba_all" ON public.kanban_boards FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_kanba_all2" ON public.kanban_columns FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_tasks_all" ON public.tasks FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_subta_all" ON public.subtasks FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_task__all" ON public.task_attachments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_comme_all" ON public.comments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_task__all2" ON public.task_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_pipel_all" ON public.pipeline_stages FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_leads_all" ON public.leads FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_lead__all" ON public.lead_interactions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_proje_all3" ON public.project_diagrams FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_exec__all" ON public.exec_documents FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_ai_do_all" ON public.ai_doc_snapshots FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_knowl_all" ON public.knowledge_blocks FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "p_confi_all" ON public.configuracao_recorrencia FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
