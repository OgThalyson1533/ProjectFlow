const fs = require('fs');
const path = require('path');

// ════════════════════════════════════════════════════════════
//  MYTHOS: OBSIDIAN SECOND BRAIN EXPORTER
//  Este script conecta-se ao Supabase (via REST ou SDK) ou 
//  processa um dump JSON para gerar o cofre (vault) do Obsidian.
// ════════════════════════════════════════════════════════════

const OUTPUT_DIR = path.join(__dirname, '../Cerebro_ProjectFlow');
const DIRS = [
  '01_Projetos',
  '02_Kanban_Tarefas',
  '03_Arquitetura_Diagramas',
  '04_Knowledge_Base',
  '05_Relatorios_Executivos',
  '99_Templates'
];

// Configurar cliente Supabase (requer @supabase/supabase-js)
// const { createClient } = require('@supabase/supabase-js');
// const supabase = createClient('URL', 'KEY');

function initVault() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  DIRS.forEach(d => {
    const p = path.join(OUTPUT_DIR, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p);
  });
  console.log('[MYTHOS] Vault estrutural criado em:', OUTPUT_DIR);
}

function generateProjectNote(project) {
  const content = `---
id: ${project.id}
type: project
status: ${project.status || 'active'}
client: ${project.client_name || ''}
---
# ${project.name}

**Objetivo:** ${project.objective || ''}
**Lógica de Negócio:** ${project.business_logic || ''}

## Tarefas Relacionadas
\`\`\`dataview
TABLE bpmn_status, priority, due_date
FROM "02_Kanban_Tarefas"
WHERE project_id = "${project.id}"
\`\`\`
`;
  const filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}.md`;
  fs.writeFileSync(path.join(OUTPUT_DIR, '01_Projetos', filename), content);
}

function generateTaskNote(task) {
  const content = `---
id: ${task.id}
project_id: ${task.project_id}
type: task
bpmn_status: ${task.bpmn_status || 'esbocar'}
priority: ${task.priority || 'medium'}
due_date: ${task.due_date || ''}
---
# ${task.title}

## Especificações
- **Descrição:** ${task.description || ''}
- **Critérios de Aceite:** ${task.acceptance_criteria || ''}

## Documentação Técnica
- **Decisão:** ${task.doc_decision || ''}
- **Artefato:** ${task.doc_artifact || ''}
- **Riscos:** ${task.doc_risk || ''}
`;
  const filename = `${task.title.replace(/[^a-z0-9]/gi, '_')}_${task.id.slice(0,4)}.md`;
  fs.writeFileSync(path.join(OUTPUT_DIR, '02_Kanban_Tarefas', filename), content);
}

function generateDiagramCanvas(diagram, nodes, edges) {
  const canvas = {
    nodes: nodes.map(n => ({
      id: n.id,
      type: "text",
      text: `**${n.label}**\n*${n.node_type}*`,
      x: n.x || 0,
      y: n.y || 0,
      width: n.width || 200,
      height: n.height || 100
    })),
    edges: edges.map(e => ({
      id: e.id,
      fromNode: e.source_id,
      fromSide: "right",
      toNode: e.target_id,
      toSide: "left"
    }))
  };
  
  const filename = `${diagram.name.replace(/[^a-z0-9]/gi, '_')}.canvas`;
  fs.writeFileSync(path.join(OUTPUT_DIR, '03_Arquitetura_Diagramas', filename), JSON.stringify(canvas, null, 2));
}

// ─── EXECUÇÃO MOCK PARA DEMONSTRAÇÃO ──────────────────────────
async function run() {
  initVault();
  
  // Exemplo de geração (Substituir por chamadas supabase.from().select())
  const sampleProject = { id: 'uuid-1', name: 'Projeto Alpha v10', status: 'active' };
  const sampleTask = { id: 'task-1', project_id: 'uuid-1', title: 'Refatorar Database', bpmn_status: 'executar' };
  
  generateProjectNote(sampleProject);
  generateTaskNote(sampleTask);
  generateDiagramCanvas(
    { name: 'Arquitetura Core' },
    [{ id: 'n1', label: 'API', node_type: 'service', x: 0, y: 0 }],
    []
  );

  console.log('[MYTHOS] Exportação do Segundo Cérebro concluída com sucesso.');
}

run();
