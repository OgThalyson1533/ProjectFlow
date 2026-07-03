-- ============================================================
--  ProjectFlow V10 — SEED DE TESTE
--  4 projetos × 20 tarefas = 80 tarefas no total
--
--  COMO USAR:
--  1. Faça login no app para criar seu perfil e workspace
--  2. Copie seu user UUID em: Supabase → Authentication → Users
--  3. Substitua 'SEU-USER-UUID-AQUI' pelo UUID real
--  4. Cole no SQL Editor e clique em Run All
-- ============================================================

DO $$
DECLARE
  v_uid   UUID := 'SEU-USER-UUID-AQUI';  -- ← SUBSTITUIR pelo seu UUID real

  -- IDs dos projetos (gerados aqui para reuso)
  p1 UUID := gen_random_uuid();
  p2 UUID := gen_random_uuid();
  p3 UUID := gen_random_uuid();
  p4 UUID := gen_random_uuid();

  -- IDs dos boards (criados pelo trigger handle_new_project,
  -- mas precisamos buscá-los após o INSERT)
  b1 UUID; b2 UUID; b3 UUID; b4 UUID;

  -- IDs das colunas de cada board
  c1_todo UUID; c1_plan UUID; c1_exec UUID; c1_rev UUID; c1_done UUID;
  c2_todo UUID; c2_plan UUID; c2_exec UUID; c2_rev UUID; c2_done UUID;
  c3_todo UUID; c3_plan UUID; c3_exec UUID; c3_rev UUID; c3_done UUID;
  c4_todo UUID; c4_plan UUID; c4_exec UUID; c4_rev UUID; c4_done UUID;

BEGIN

  -- ── Garante que o perfil existe (caso execute antes do login) ──
  INSERT INTO public.profiles (id, full_name, avatar_color)
  VALUES (v_uid, 'Usuário Teste', '#e07050')
  ON CONFLICT (id) DO NOTHING;

  -- ══════════════════════════════════════════════════════════
  --  PROJETOS
  -- ══════════════════════════════════════════════════════════
  INSERT INTO public.projects (id, name, color, owner_id, status, description, objective)
  VALUES
    (p1, 'Website Rebrand',     '#d97757', v_uid, 'active',
     'Redesign completo do site institucional com nova identidade visual.',
     'Aumentar conversão em 30% e melhorar experiência mobile'),
    (p2, 'App Mobile v2',       '#7c5cbf', v_uid, 'active',
     'Segunda versão do aplicativo com novas funcionalidades e UX aprimorada.',
     'Lançar na App Store e Play Store até Q3'),
    (p3, 'Campanha Marketing Q2','#4a7cf6', v_uid, 'active',
     'Campanha integrada de marketing digital para o segundo trimestre.',
     'Gerar 500 leads qualificados até junho'),
    (p4, 'Infraestrutura BD',   '#1a9e5f', v_uid, 'active',
     'Migração e otimização do banco de dados para nova arquitetura.',
     'Reduzir latência média de queries em 60%');
  -- O trigger handle_new_project cria boards + colunas automaticamente

  -- ── Busca boards criados pelo trigger ──────────────────────
  SELECT id INTO b1 FROM public.kanban_boards WHERE project_id=p1 AND is_default=TRUE LIMIT 1;
  SELECT id INTO b2 FROM public.kanban_boards WHERE project_id=p2 AND is_default=TRUE LIMIT 1;
  SELECT id INTO b3 FROM public.kanban_boards WHERE project_id=p3 AND is_default=TRUE LIMIT 1;
  SELECT id INTO b4 FROM public.kanban_boards WHERE project_id=p4 AND is_default=TRUE LIMIT 1;

  -- ── Busca colunas de cada board (posições 1–5) ─────────────
  SELECT id INTO c1_todo FROM public.kanban_columns WHERE board_id=b1 AND position=1 LIMIT 1;
  SELECT id INTO c1_plan FROM public.kanban_columns WHERE board_id=b1 AND position=2 LIMIT 1;
  SELECT id INTO c1_exec FROM public.kanban_columns WHERE board_id=b1 AND position=3 LIMIT 1;
  SELECT id INTO c1_rev  FROM public.kanban_columns WHERE board_id=b1 AND position=4 LIMIT 1;
  SELECT id INTO c1_done FROM public.kanban_columns WHERE board_id=b1 AND position=5 LIMIT 1;

  SELECT id INTO c2_todo FROM public.kanban_columns WHERE board_id=b2 AND position=1 LIMIT 1;
  SELECT id INTO c2_plan FROM public.kanban_columns WHERE board_id=b2 AND position=2 LIMIT 1;
  SELECT id INTO c2_exec FROM public.kanban_columns WHERE board_id=b2 AND position=3 LIMIT 1;
  SELECT id INTO c2_rev  FROM public.kanban_columns WHERE board_id=b2 AND position=4 LIMIT 1;
  SELECT id INTO c2_done FROM public.kanban_columns WHERE board_id=b2 AND position=5 LIMIT 1;

  SELECT id INTO c3_todo FROM public.kanban_columns WHERE board_id=b3 AND position=1 LIMIT 1;
  SELECT id INTO c3_plan FROM public.kanban_columns WHERE board_id=b3 AND position=2 LIMIT 1;
  SELECT id INTO c3_exec FROM public.kanban_columns WHERE board_id=b3 AND position=3 LIMIT 1;
  SELECT id INTO c3_rev  FROM public.kanban_columns WHERE board_id=b3 AND position=4 LIMIT 1;
  SELECT id INTO c3_done FROM public.kanban_columns WHERE board_id=b3 AND position=5 LIMIT 1;

  SELECT id INTO c4_todo FROM public.kanban_columns WHERE board_id=b4 AND position=1 LIMIT 1;
  SELECT id INTO c4_plan FROM public.kanban_columns WHERE board_id=b4 AND position=2 LIMIT 1;
  SELECT id INTO c4_exec FROM public.kanban_columns WHERE board_id=b4 AND position=3 LIMIT 1;
  SELECT id INTO c4_rev  FROM public.kanban_columns WHERE board_id=b4 AND position=4 LIMIT 1;
  SELECT id INTO c4_done FROM public.kanban_columns WHERE board_id=b4 AND position=5 LIMIT 1;

  -- ══════════════════════════════════════════════════════════
  --  PROJETO 1 — Website Rebrand (20 tarefas)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO public.tasks
    (project_id, board_id, column_id, created_by, title, bpmn_status, priority,
     estimated_hours, due_date, description, tags, position)
  VALUES
    -- Planejado (6)
    (p1,b1,c1_todo,v_uid,'Levantamento de requisitos visuais',        'esbocar',   'high',    8, NOW()::DATE+7,  'Mapear identidade visual atual e benchmarks do setor',         '{discovery,brand}',    1),
    (p1,b1,c1_todo,v_uid,'Definir paleta de cores e tipografia',      'esbocar',   'high',    4, NOW()::DATE+10, 'Criar moodboard e validar com stakeholders',                   '{design,brand}',       2),
    (p1,b1,c1_todo,v_uid,'Auditoria de conteúdo existente',           'viabilizar','medium',  6, NOW()::DATE+12, 'Catalogar todas as páginas e identificar gaps de conteúdo',    '{content,audit}',      3),
    (p1,b1,c1_todo,v_uid,'Definir arquitetura da informação',         'viabilizar','medium',  5, NOW()::DATE+14, 'Criar mapa do site e fluxos de navegação principais',          '{ia,ux}',              4),
    (p1,b1,c1_todo,v_uid,'Setup do ambiente de desenvolvimento',      'esbocar',   'low',     3, NOW()::DATE+5,  'Configurar repo, CI/CD e ambiente de staging',                 '{dev,infra}',          5),
    (p1,b1,c1_todo,v_uid,'Pesquisa com usuários (5 entrevistas)',     'esbocar',   'high',   10, NOW()::DATE+15, 'Entrevistar clientes atuais para mapear dores e expectativas', '{ux,research}',        6),
    -- Prioridade (3)
    (p1,b1,c1_plan,v_uid,'Criar wireframes das páginas principais',   'atribuir',  'high',   12, NOW()::DATE+8,  'Home, Sobre, Serviços, Contato — low fidelity primeiro',       '{ux,wireframe}',       1),
    (p1,b1,c1_plan,v_uid,'Protótipo interativo mobile-first',         'atribuir',  'high',   16, NOW()::DATE+18, 'Figma prototype com fluxos de conversão principais',           '{ux,prototype}',       2),
    (p1,b1,c1_plan,v_uid,'Definir estratégia de SEO',                 'atribuir',  'medium',  6, NOW()::DATE+20, 'Keywords, meta tags, estrutura de URLs e sitemap',             '{seo,strategy}',       3),
    -- Em Execução (4)
    (p1,b1,c1_exec,v_uid,'Desenvolvimento da homepage',               'executar',  'critical',20,NOW()::DATE+20, 'HTML/CSS/JS responsivo com animações de entrada',              '{dev,frontend}',       1),
    (p1,b1,c1_exec,v_uid,'Integração do CMS headless',                'executar',  'high',   18, NOW()::DATE+22, 'Configurar Contentful e criar modelos de conteúdo',            '{dev,cms}',            2),
    (p1,b1,c1_exec,v_uid,'Otimização de imagens e assets',            'executar',  'medium',  6, NOW()::DATE+18, 'WebP, lazy loading, CDN e compressão automática',              '{dev,performance}',    3),
    (p1,b1,c1_exec,v_uid,'Implementar analytics e heatmaps',          'executar',  'medium',  4, NOW()::DATE+19, 'GA4, Hotjar e configuração de eventos de conversão',           '{analytics}',          4),
    -- Em Revisão (4)
    (p1,b1,c1_rev, v_uid,'Revisão de acessibilidade (WCAG 2.1)',      'avaliar',   'high',    8, NOW()::DATE+25, 'Testes com leitores de tela e contraste de cores',             '{a11y,qa}',            1),
    (p1,b1,c1_rev, v_uid,'Testes cross-browser e cross-device',       'avaliar',   'high',   10, NOW()::DATE+26, 'Chrome, Firefox, Safari, Edge — mobile e desktop',             '{qa,testing}',         2),
    (p1,b1,c1_rev, v_uid,'Revisão de copy com cliente',               'validar_cliente','medium',4,NOW()::DATE+23,'Ajustes finais em textos e CTAs após feedback',                '{content,review}',     3),
    (p1,b1,c1_rev, v_uid,'Performance audit (Core Web Vitals)',        'corrigir',  'high',    6, NOW()::DATE+27, 'LCP < 2.5s, FID < 100ms, CLS < 0.1',                          '{performance,seo}',    4),
    -- Concluído (3)
    (p1,b1,c1_done,v_uid,'Briefing do projeto aprovado',              'concluido', 'medium',  2, NOW()::DATE-5,  'Documento de escopo e cronograma validado por todos',          '{planning}',           1),
    (p1,b1,c1_done,v_uid,'Contrato assinado e NDA firmado',           'concluido', 'low',     1, NOW()::DATE-7,  'Documentos legais arquivados no Drive',                        '{legal,admin}',        2),
    (p1,b1,c1_done,v_uid,'Kickoff meeting realizado',                 'concluido', 'medium',  2, NOW()::DATE-3,  'Apresentação do time, metodologia e expectativas alinhadas',   '{planning,meeting}',   3);

  -- ══════════════════════════════════════════════════════════
  --  PROJETO 2 — App Mobile v2 (20 tarefas)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO public.tasks
    (project_id, board_id, column_id, created_by, title, bpmn_status, priority,
     estimated_hours, due_date, description, tags, position)
  VALUES
    -- Planejado (5)
    (p2,b2,c2_todo,v_uid,'Definir MVP da v2',                         'esbocar',   'critical',8, NOW()::DATE+5,  'Lista de features obrigatórias vs nice-to-have',               '{planning,product}',   1),
    (p2,b2,c2_todo,v_uid,'User story mapping',                        'viabilizar','high',    6, NOW()::DATE+7,  'Mapear jornadas completas dos 3 personas principais',          '{ux,product}',         2),
    (p2,b2,c2_todo,v_uid,'Análise de reviews da v1 no store',         'esbocar',   'medium',  4, NOW()::DATE+6,  'Categorizar feedbacks negativos e priorizar correções',         '{research,product}',   3),
    (p2,b2,c2_todo,v_uid,'Definir stack tecnológica',                 'viabilizar','high',    3, NOW()::DATE+4,  'React Native vs Flutter — análise de trade-offs',              '{dev,architecture}',   4),
    (p2,b2,c2_todo,v_uid,'Setup do projeto e repositório',            'esbocar',   'medium',  2, NOW()::DATE+3,  'Monorepo, linting, Husky, GitFlow',                            '{dev,setup}',          5),
    -- Prioridade (4)
    (p2,b2,c2_plan,v_uid,'Design do sistema de notificações push',    'atribuir',  'high',   10, NOW()::DATE+12, 'Fluxos de opt-in, segmentação e templates',                   '{ux,notifications}',   1),
    (p2,b2,c2_plan,v_uid,'Redesign da tela de onboarding',            'atribuir',  'high',   14, NOW()::DATE+15, 'Reduzir abandono no onboarding de 60% para 20%',              '{ux,onboarding}',      2),
    (p2,b2,c2_plan,v_uid,'Arquitetura do módulo offline-first',       'atribuir',  'critical',16,NOW()::DATE+18, 'Sync strategy, conflict resolution e queue de ações',          '{dev,architecture}',   3),
    (p2,b2,c2_plan,v_uid,'Planejamento de testes A/B',                'atribuir',  'medium',  4, NOW()::DATE+10, 'Definir hipóteses e métricas de sucesso para cada teste',      '{analytics,product}',  4),
    -- Em Execução (5)
    (p2,b2,c2_exec,v_uid,'Implementar autenticação biométrica',       'executar',  'high',   12, NOW()::DATE+20, 'Face ID, Touch ID e fallback para PIN',                        '{dev,security}',       1),
    (p2,b2,c2_exec,v_uid,'Desenvolver feed principal com paginação',  'executar',  'high',   20, NOW()::DATE+22, 'Infinite scroll, skeleton loading e pull-to-refresh',          '{dev,frontend}',       2),
    (p2,b2,c2_exec,v_uid,'Módulo de pagamentos in-app',               'executar',  'critical',24,NOW()::DATE+25, 'Stripe SDK, Apple Pay, Google Pay',                            '{dev,payments}',       3),
    (p2,b2,c2_exec,v_uid,'Sistema de cache inteligente',              'executar',  'medium', 10, NOW()::DATE+20, 'Redis local + estratégia de invalidação',                      '{dev,performance}',    4),
    (p2,b2,c2_exec,v_uid,'Integração com APIs de terceiros',          'executar',  'medium', 14, NOW()::DATE+23, 'Google Maps, Twilio SMS, SendGrid',                            '{dev,integration}',    5),
    -- Em Revisão (3)
    (p2,b2,c2_rev, v_uid,'Code review do módulo de pagamentos',       'avaliar',   'critical',6, NOW()::DATE+27, 'Revisão de segurança, PCI compliance e edge cases',            '{qa,security}',        1),
    (p2,b2,c2_rev, v_uid,'Testes de usabilidade com 8 usuários',      'avaliar',   'high',    8, NOW()::DATE+28, 'Teste moderado com gravação de sessão',                        '{ux,testing}',         2),
    (p2,b2,c2_rev, v_uid,'Performance profiling no Android',          'corrigir',  'high',    6, NOW()::DATE+26, 'Framerate, uso de memória e tempo de inicialização',           '{qa,performance}',     3),
    -- Concluído (3)
    (p2,b2,c2_done,v_uid,'Documento de requisitos aprovado',          'concluido', 'medium',  3, NOW()::DATE-10, 'PRD validado pelo product owner e tech lead',                  '{planning}',           1),
    (p2,b2,c2_done,v_uid,'Design system atualizado',                  'concluido', 'high',   16, NOW()::DATE-4,  'Componentes Figma exportados e documentados no Storybook',     '{design,dev}',         2),
    (p2,b2,c2_done,v_uid,'Ambiente de staging configurado',           'concluido', 'medium',  4, NOW()::DATE-2,  'CI/CD no GitHub Actions com deploy automático',                '{dev,infra}',          3);

  -- ══════════════════════════════════════════════════════════
  --  PROJETO 3 — Campanha Marketing Q2 (20 tarefas)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO public.tasks
    (project_id, board_id, column_id, created_by, title, bpmn_status, priority,
     estimated_hours, due_date, description, tags, position)
  VALUES
    -- Planejado (5)
    (p3,b3,c3_todo,v_uid,'Definir buyer personas do Q2',              'esbocar',   'high',    5, NOW()::DATE+4,  'Atualizar personas com dados de CRM e pesquisa de mercado',    '{strategy,research}',  1),
    (p3,b3,c3_todo,v_uid,'Planejamento de conteúdo mensal',           'viabilizar','high',    6, NOW()::DATE+6,  'Calendário editorial para Abril, Maio e Junho',                '{content,planning}',   2),
    (p3,b3,c3_todo,v_uid,'Definir budget por canal',                  'esbocar',   'critical',3, NOW()::DATE+3,  'Distribuição entre Google Ads, Meta, LinkedIn e Email',        '{budget,strategy}',    3),
    (p3,b3,c3_todo,v_uid,'Benchmark de concorrentes Q1',              'viabilizar','medium',  4, NOW()::DATE+5,  'Análise de campanhas, mensagens e canais usados',              '{research,strategy}',  4),
    (p3,b3,c3_todo,v_uid,'Setup de automação de email marketing',     'esbocar',   'medium',  6, NOW()::DATE+8,  'Fluxos de nutrição no HubSpot para cada etapa do funil',       '{email,automation}',   5),
    -- Prioridade (4)
    (p3,b3,c3_plan,v_uid,'Criar assets para Google Ads',              'atribuir',  'high',    8, NOW()::DATE+10, 'Anúncios responsivos, extensões e páginas de destino',         '{ads,design}',         1),
    (p3,b3,c3_plan,v_uid,'Produção de vídeo para redes sociais',      'atribuir',  'high',   20, NOW()::DATE+14, '3 vídeos curtos (15s, 30s, 60s) para Stories e Reels',         '{video,social}',       2),
    (p3,b3,c3_plan,v_uid,'Webinar: "Tendências do setor 2025"',       'atribuir',  'medium', 12, NOW()::DATE+20, 'Landing page, divulgação, roteiro e pós-produção',             '{event,content}',      3),
    (p3,b3,c3_plan,v_uid,'Campanha de indicação (referral)',          'atribuir',  'medium',  8, NOW()::DATE+15, 'Mecânica, landing page e integração com CRM',                  '{growth,referral}',    4),
    -- Em Execução (5)
    (p3,b3,c3_exec,v_uid,'Gerenciar campanhas no Google Ads',         'executar',  'critical',4, NOW()::DATE+90, 'Otimização diária de lances, palavras-chave e quality score',  '{ads,ppc}',            1),
    (p3,b3,c3_exec,v_uid,'Gerenciar campanhas no Meta Ads',           'executar',  'high',    4, NOW()::DATE+90, 'A/B de criativos, públicos e objetivos de campanha',           '{ads,social}',         2),
    (p3,b3,c3_exec,v_uid,'Publicar conteúdo orgânico diário',         'executar',  'medium',  2, NOW()::DATE+90, 'Posts, stories e engajamento nas redes sociais',               '{social,content}',     3),
    (p3,b3,c3_exec,v_uid,'Disparos de email marketing semanais',      'executar',  'medium',  3, NOW()::DATE+90, 'Newsletter e sequências de nutrição para leads',               '{email}',              4),
    (p3,b3,c3_exec,v_uid,'Monitoramento de menções e SAC 2.0',        'executar',  'medium',  2, NOW()::DATE+90, 'Resposta a comentários, DMs e menções em até 2h',              '{social,support}',     5),
    -- Em Revisão (3)
    (p3,b3,c3_rev, v_uid,'Análise de performance das campanhas',      'avaliar',   'high',    4, NOW()::DATE+30, 'CPL, CPC, CTR e ROAS — comparativo com Q1',                    '{analytics,report}',   1),
    (p3,b3,c3_rev, v_uid,'Revisão dos materiais pelo jurídico',       'validar_cliente','medium',3,NOW()::DATE+7,'Claims de produto e regulatório de publicidade',               '{legal,compliance}',   2),
    (p3,b3,c3_rev, v_uid,'Relatório mensal de marketing',             'avaliar',   'medium',  3, NOW()::DATE+30, 'Dashboard executivo com KPIs e próximos passos',               '{report,analytics}',   3),
    -- Concluído (3)
    (p3,b3,c3_done,v_uid,'Planejamento estratégico Q2 aprovado',      'concluido', 'high',    4, NOW()::DATE-8,  'OKRs definidos e validados pela diretoria',                    '{strategy,planning}',  1),
    (p3,b3,c3_done,v_uid,'Contas de ads configuradas e verificadas',  'concluido', 'medium',  2, NOW()::DATE-5,  'Google Ads, Meta Business e LinkedIn Campaign Manager',        '{ads,setup}',          2),
    (p3,b3,c3_done,v_uid,'Brief criativo enviado para agência',       'concluido', 'medium',  2, NOW()::DATE-3,  'Conceito, tom de voz, referências e prazos de entrega',        '{creative,agency}',    3);

  -- ══════════════════════════════════════════════════════════
  --  PROJETO 4 — Infraestrutura BD (20 tarefas)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO public.tasks
    (project_id, board_id, column_id, created_by, title, bpmn_status, priority,
     estimated_hours, due_date, description, tags, position)
  VALUES
    -- Planejado (5)
    (p4,b4,c4_todo,v_uid,'Diagnóstico completo do banco atual',       'esbocar',   'critical',16,NOW()::DATE+7,  'Mapeamento de queries lentas, locks e gargalos de I/O',        '{db,audit}',           1),
    (p4,b4,c4_todo,v_uid,'Definir nova arquitetura de dados',         'viabilizar','critical',12,NOW()::DATE+10, 'Escolha entre PostgreSQL puro, Citus ou particionamento nativo','{db,architecture}',    2),
    (p4,b4,c4_todo,v_uid,'Plano de rollback e contingência',          'esbocar',   'high',     6,NOW()::DATE+8,  'Procedimentos de recovery com RTO < 1h e RPO < 15min',         '{db,disaster-recovery}',3),
    (p4,b4,c4_todo,v_uid,'Inventário de dependências externas',       'viabilizar','medium',   4,NOW()::DATE+6,  'APIs, microsserviços e sistemas que consomem o banco',          '{audit,dependencies}', 4),
    (p4,b4,c4_todo,v_uid,'Definir estratégia de backup incremental',  'esbocar',   'high',     4,NOW()::DATE+9,  'pgBackRest ou WAL-G com retenção de 30 dias',                  '{db,backup}',          5),
    -- Prioridade (4)
    (p4,b4,c4_plan,v_uid,'Criar índices compostos nas tabelas críticas','atribuir','high',     8,NOW()::DATE+12, 'tasks, projects, kanban_columns — EXPLAIN ANALYZE para cada',  '{db,performance}',     1),
    (p4,b4,c4_plan,v_uid,'Implementar connection pooling (PgBouncer)','atribuir',  'high',    10,NOW()::DATE+14, 'Transaction mode, pool_size e monitoramento de conexões',       '{db,performance}',     2),
    (p4,b4,c4_plan,v_uid,'Planejar particionamento de tabela tasks',  'atribuir',  'medium',   8,NOW()::DATE+16, 'Partition by range (created_at) — annual partitions',           '{db,partitioning}',    3),
    (p4,b4,c4_plan,v_uid,'Configurar replicação read replica',        'atribuir',  'high',    12,NOW()::DATE+18, 'Streaming replication com lag monitoring e auto-failover',     '{db,replication}',     4),
    -- Em Execução (5)
    (p4,b4,c4_exec,v_uid,'Migração das tabelas legadas',              'executar',  'critical',24,NOW()::DATE+20, 'Script de migração com validação de integridade e zero downtime','{db,migration}',      1),
    (p4,b4,c4_exec,v_uid,'Otimizar queries do dashboard principal',   'executar',  'high',    12,NOW()::DATE+18, 'Reduzir tempo médio de 800ms para <100ms com CTEs e índices',   '{db,performance}',     2),
    (p4,b4,c4_exec,v_uid,'Implementar Row Level Security avançado',   'executar',  'high',    10,NOW()::DATE+22, 'Políticas granulares por workspace e projeto',                  '{db,security}',        3),
    (p4,b4,c4_exec,v_uid,'Setup de monitoramento com pg_stat',        'executar',  'medium',   6,NOW()::DATE+16, 'Grafana + pg_stat_statements + alertas de threshold',           '{db,monitoring}',      4),
    (p4,b4,c4_exec,v_uid,'Vacuum e reindex programados',              'executar',  'medium',   4,NOW()::DATE+14, 'pg_cron jobs para manutenção automática semanal',               '{db,maintenance}',     5),
    -- Em Revisão (3)
    (p4,b4,c4_rev, v_uid,'Validação de performance pós-migração',     'avaliar',   'critical', 8,NOW()::DATE+25, 'Comparativo de métricas antes/depois em carga real',            '{qa,performance}',     1),
    (p4,b4,c4_rev, v_uid,'Audit de segurança do novo schema',         'avaliar',   'high',     6,NOW()::DATE+26, 'Revisão de privilégios, RLS e exposição de dados sensíveis',    '{qa,security}',        2),
    (p4,b4,c4_rev, v_uid,'Teste de carga com 10x o tráfego atual',    'corrigir',  'high',    10,NOW()::DATE+28, 'k6 ou Artillery — simular picos de Black Friday',              '{qa,load-testing}',    3),
    -- Concluído (3)
    (p4,b4,c4_done,v_uid,'Análise de custo de cloud aprovada',        'concluido', 'medium',   2,NOW()::DATE-12, 'Comparativo AWS RDS vs Supabase vs self-hosted',               '{planning,budget}',    1),
    (p4,b4,c4_done,v_uid,'Time de DBA alocado e onboardado',          'concluido', 'medium',   2,NOW()::DATE-6,  'Dois DBAs sênior com acesso e contexto do projeto',             '{team,planning}',      2),
    (p4,b4,c4_done,v_uid,'Ambiente de homologação configurado',       'concluido', 'high',     6,NOW()::DATE-2,  'Clone do prod com dados anonimizados para testes seguros',     '{dev,infra}',          3);

  -- ══════════════════════════════════════════════════════════
  --  RELATÓRIO FINAL
  -- ══════════════════════════════════════════════════════════
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '  ProjectFlow — Seed de Teste';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '  Projeto 1 (Website Rebrand):      ID = %', p1;
  RAISE NOTICE '  Projeto 2 (App Mobile v2):        ID = %', p2;
  RAISE NOTICE '  Projeto 3 (Campanha Q2):          ID = %', p3;
  RAISE NOTICE '  Projeto 4 (Infraestrutura BD):    ID = %', p4;
  RAISE NOTICE '────────────────────────────────────────────────────';
  RAISE NOTICE '  Total de tarefas inseridas: 80 (20 por projeto)';
  RAISE NOTICE '  Distribuição por coluna:';
  RAISE NOTICE '    Planejado:  24 tarefas (6+5+5+5 = 21 esbocar/viabilizar)';
  RAISE NOTICE '    Prioridade: 15 tarefas (3+4+4+4 = atribuir)';
  RAISE NOTICE '    Execução:   19 tarefas (4+5+5+5 = executar)';
  RAISE NOTICE '    Revisão:    16 tarefas (4+3+3+3 = avaliar/corrigir/validar)';
  RAISE NOTICE '    Concluído:  12 tarefas (3+3+3+3 = concluido)';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ Seed concluído com sucesso!';

END $$;
