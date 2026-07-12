// ProjectFlow v6 — board.js — Elevated Kanban
'use strict';

const SyncManager={_ops:new Map(),async execute(id,opt,persist,rollback,msg){const v=Date.now();const prev=this._ops.get(id);if(prev&&prev.v>v)return;this._ops.set(id,{v});opt();renderBoard();try{const{error}=await persist();const cur=this._ops.get(id);if(!cur||cur.v!==v)return;if(error){rollback();renderBoard();showToast('Erro: '+error.message,true);return;}if(msg)showToast(msg);}catch(e){rollback();renderBoard();showToast('Erro de rede',true);}finally{this._ops.delete(id);}}}; 
window.PFBoard={columns:[],cards:[],boardId:null,projectId:null};

function initDefaultColumns(){return[
  {id:'col-todo', name:'Planejado',   position:1,wip_limit:4,   color:'var(--col-todo)',is_done_col:false,is_locked:false,bpmn_mapping:['esbocar','viabilizar']},
  {id:'col-plan', name:'Prioridade',  position:2,wip_limit:2,   color:'var(--col-plan)',is_done_col:false,is_locked:false,bpmn_mapping:['atribuir']},
  {id:'col-exec', name:'Em Execução', position:3,wip_limit:3,   color:'var(--col-exec)',is_done_col:false,is_locked:false,bpmn_mapping:['executar']},
  {id:'col-rev',  name:'Em Revisão',  position:4,wip_limit:3,   color:'var(--col-rev)', is_done_col:false,is_locked:false,bpmn_mapping:['avaliar','corrigir','validar_cliente']},
  {id:'col-done', name:'Concluído',   position:5,wip_limit:null,color:'var(--col-done)',is_done_col:true, is_locked:false,bpmn_mapping:['concluido']},
  {id:'col-recur',name:'Recorrentes', position:6,wip_limit:null,color:'var(--col-recur)',is_done_col:false,is_locked:true, bpmn_mapping:[]},
];}

function _cardInCol(c,col){
  // UUID presente: roteamento exclusivo — evita duplicação entre colunas
  const _isUUID=/^[0-9a-f]{8}-[0-9a-f]{4}/i;
  if(c.column_id&&_isUUID.test(c.column_id)){return c.column_id===col.id;}
  // Fallback bpmn_mapping (modo demo ou coluna sem UUID)
  if(col.bpmn_mapping?.length){const b=c.bpmn||c.bpmn_status||'esbocar';if(col.bpmn_mapping.includes(b))return true;}
  const lm={'col-todo':'todo','col-plan':'plan','col-exec':'exec','col-rev':'rev','col-done':'done'};
  return c.col===lm[col.id];
}
function _e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

const BPMN_C={esbocar:'var(--tx-3)',viabilizar:'var(--tx-3)',atribuir:'var(--purple)',executar:'var(--yellow)',avaliar:'var(--blue)',corrigir:'var(--red)',validar_cliente:'var(--blue)',concluido:'var(--green)'};
const BPMN_LABELS={esbocar:'Esboçar',viabilizar:'Viabilizar',atribuir:'Atribuir',executar:'Executar',avaliar:'Avaliar',corrigir:'Corrigir',validar_cliente:'Validar Cliente',concluido:'Concluído'};
function _bpmnDot(s){return`<svg width="8" height="8" viewBox="0 0 8 8" style="flex-shrink:0"><circle cx="4" cy="4" r="4" fill="${BPMN_C[s]||'var(--tx-3)'}"/></svg>`;}
function _bpmnBadge(s){const col=BPMN_C[s]||'var(--tx-3)';const lbl=BPMN_LABELS[s]||s;return`<span class="kc-bpmn-badge" style="color:${col};border-color:${col}20;background:${col}12">${lbl}</span>`;}
function _bpmnBadgeNode(s){
  const col=BPMN_C[s]||'var(--tx-3)';
  const lbl=BPMN_LABELS[s]||s;
  return h('span.kc-bpmn-badge', { style: { color: col, borderColor: col+'20', background: col+'12' } }, lbl);
}

const COL_W=264;

// ── RENDER BOARD ──────────────────────────────────────────────
window.switchKanbanView = function(view) {
  window.currentKanbanView = view;
  const btnKanban = document.getElementById('toggle-view-kanban');
  const btnTable = document.getElementById('toggle-view-table');
  if (btnKanban && btnTable) {
    if (view === 'kanban') {
      btnKanban.style.background = 'var(--bg-1)';
      btnKanban.style.color = 'var(--tx-1)';
      btnTable.style.background = 'transparent';
      btnTable.style.color = 'var(--tx-3)';
    } else {
      btnTable.style.background = 'var(--bg-1)';
      btnTable.style.color = 'var(--tx-1)';
      btnKanban.style.background = 'transparent';
      btnKanban.style.color = 'var(--tx-3)';
    }
  }
  renderBoard();
};

function renderBoard(){
  const board=document.getElementById('kanban-board');if(!board)return;
  const cols=PFBoard.columns.length?PFBoard.columns:initDefaultColumns();
  let cards=PFBoard.cards.length?PFBoard.cards:(window.mockCards||[]);
  
  if (!window.currentKanbanView) window.currentKanbanView = 'kanban';

  // Aplica Filtros
  const kfAssigneeEl = document.getElementById('kf-assignee');
  const kfRequesterEl = document.getElementById('kf-requester');
  if(kfAssigneeEl && kfAssigneeEl.options.length <= 1) {
    const team = window.mockTeam || window.workspaceUsers || [];
    const options = '<option value="">Todos</option>' + team.map(m => `<option value="${m.id}">${_e(m.name||m.email)}</option>`).join('');
    kfAssigneeEl.innerHTML = options;
    if (kfRequesterEl) kfRequesterEl.innerHTML = options;
  }
  const fAssignee=kfAssigneeEl?.value;
  const fReqStart=document.getElementById('kf-req-start')?.value;
  const fReqEnd=document.getElementById('kf-req-end')?.value;
  const fDueStart=document.getElementById('kf-due-start')?.value;
  const fDueEnd=document.getElementById('kf-due-end')?.value;
  const fCompStart=document.getElementById('kf-comp-start')?.value;
  const fCompEnd=document.getElementById('kf-comp-end')?.value;
  
  if(fAssignee || fReqStart || fReqEnd || fDueStart || fDueEnd || fCompStart || fCompEnd) {
    cards = cards.filter(c => {
      if(fAssignee && (c.assigned_to !== fAssignee && c.assignee?.id !== fAssignee && c.assignee !== fAssignee)) return false;
      const fRequester=document.getElementById('kf-requester')?.value;
      if(fRequester && (c.requester !== fRequester && c.requester_id !== fRequester)) return false;
      
      const reqD = c.request_date || '';
      if(fReqStart && reqD < fReqStart) return false;
      if(fReqEnd && reqD > fReqEnd) return false;
      
      const dueD = c.due_date || c.date || '';
      if(fDueStart && dueD < fDueStart) return false;
      if(fDueEnd && dueD > fDueEnd) return false;
      
      const compD = c.completed_at ? c.completed_at.split('T')[0] : '';
      if(fCompStart && compD < fCompStart) return false;
      if(fCompEnd && compD > fCompEnd) return false;
      
      return true;
    });
  }

  const hdr=document.getElementById('col-headers-dynamic');
  if(hdr){
    if (window.currentKanbanView === 'table') {
      hdr.style.display = 'none';
    } else {
      hdr.style.cssText=`display:flex;gap:8px;padding:10px 20px 0;flex-shrink:0;overflow-x:hidden;background:var(--bg-1);border-bottom:1px solid var(--bd);`;
    }
    hdr.innerHTML='';
    for(const col of cols) {
      const cnt=cards.filter(c=>_cardInCol(c,col)).length;
      const over=col.wip_limit&&cnt>col.wip_limit;
      const color=col.color||'var(--col-todo)';
      
      const khLeft = h('div.kh-left', {},
        h('span.kh-dot', { style: { background: color } }),
        h('span.kh-name', {}, col.name)
      );
      
      const khRight = h('div.kh-right', {},
        h(`span.kh-cnt${over?'.kh-cnt--over':''}`, {}, col.wip_limit ? `${cnt}/${col.wip_limit}` : String(cnt))
      );
      
      if(col.is_locked) {
        khRight.appendChild(h('span.kh-lock', {}, '🔒'));
      } else {
        khRight.appendChild(h('button.kh-opts', { title: 'Opções', onclick: e => openColOptions(e, col.id) }, '⋯'));
      }
      
      hdr.appendChild(h('div.kh', { style: { minWidth: COL_W+'px', maxWidth: COL_W+'px', borderBottom: `2px solid ${color}` } }, khLeft, khRight));
    }
  }

  // Board body
  board.style.cssText='flex:1;display:flex;overflow-x:auto;overflow-y:hidden;padding:8px 20px 16px;gap:8px;';
  board.innerHTML=''; // Fast clear
  
  if (window.currentKanbanView === 'table') {
    const priorityIcon = { low:'Baixa', medium:'Média', high:'Alta', critical:'Crítica' };
    const team = window.mockTeam || window.workspaceUsers || [];
    
    // Add inlineUpdateCard function if not exists
    if (!window.inlineUpdateCard) {
      window.inlineUpdateCard = async function(cardId, field, value) {
        const cards = window.PFBoard.cards.length ? window.PFBoard.cards : (window.mockCards || []);
        const card = cards.find(c => c.id === cardId);
        if (!card) return;
        const updates = { [field]: value };
        const prev = { ...card };
        await window.SyncManager.execute(cardId,
          () => { Object.assign(card, updates); },
          async () => {
            if(!window.PF.supabase || window.PF.demoMode) return { error: null };
            return window.PF.supabase.from('tasks').update({...updates, updated_at: new Date().toISOString()}).eq('id', cardId);
          },
          () => { Object.assign(card, prev); window.renderBoard(); },
          null
        );
        window.renderBoard();
      };
      
      window.inlineAddCard = async function() {
        const titleEl = document.getElementById('inline-new-title');
        const title = titleEl.value.trim();
        if (!title) return;
        const projectId = window.DocsUI?.activeProjectId || window.PF?.activeProjectId || 'uuid-1';
        const cols = window.PFBoard.columns.length ? window.PFBoard.columns : (window.mockCols || []);
        if(!cols.length) return;
        const defaultCol = cols[0].id;
        
        const { data, error } = await window.PF.supabase.from('tasks').insert({
          title,
          project_id: projectId,
          column_id: defaultCol,
          bpmn_status: 'esbocar',
          priority: 'medium',
          position: 9999
        }).select();
        
        if (!error && data && data[0]) {
          const cards = window.PFBoard.cards.length ? window.PFBoard.cards : (window.mockCards || []);
          cards.push(data[0]);
          window.renderBoard();
        } else {
          window.showToast('Erro ao criar tarefa: ' + (error?.message || 'Erro desconhecido'), true);
        }
      };
    }

    board.style.display = 'block';
    board.style.padding = '20px';
    board.style.overflowY = 'auto';
    board.innerHTML = `
      <div style="background:var(--bg-1);border-radius:12px;border:1px solid var(--bo-1);overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <table class="pf-data-grid" style="width:100%;border-collapse:collapse;text-align:left;font-size:13px;">
          <thead style="background:var(--bg-2);border-bottom:1px solid var(--bo-2);color:var(--tx-3);">
            <tr>
              <th style="padding:12px 16px;font-weight:600;width:35%;border-right:1px solid var(--bo-1);">Título</th>
              <th style="padding:12px 16px;font-weight:600;width:15%;border-right:1px solid var(--bo-1);">Coluna</th>
              <th style="padding:12px 16px;font-weight:600;width:15%;border-right:1px solid var(--bo-1);">Responsável</th>
              <th style="padding:12px 16px;font-weight:600;width:15%;border-right:1px solid var(--bo-1);">Prioridade</th>
              <th style="padding:12px 16px;font-weight:600;width:10%;border-right:1px solid var(--bo-1);">Previsão</th>
              <th style="padding:12px 16px;font-weight:600;width:10%;">Tags</th>
            </tr>
          </thead>
          <tbody>
            ${cards.map(card => {
              const col = cols.find(c => _cardInCol(card, c));
              const assigneeId = card.assigned_to || card.assignee?.id || card.assignee;
              
              // Colunas Select
              const colOptions = cols.map(c => `<option value="${c.id}" ${c.id === card.column_id ? 'selected' : ''}>${_e(c.name)}</option>`).join('');
              
              // Team Select
              const teamOptions = team.map(u => `<option value="${u.id}" ${u.id === assigneeId ? 'selected' : ''}>${_e(u.name || u.email)}</option>`).join('');
              const assigneeSelect = `<select class="inline-select" onchange="inlineUpdateCard('${card.id}', 'assigned_to', this.value)">
                <option value="">Não atribuído</option>
                ${teamOptions}
              </select>`;
              
              // Priority Select
              const prioOptions = Object.entries(priorityIcon).map(([val, label]) => `<option value="${val}" ${val === card.priority ? 'selected' : ''}>${label}</option>`).join('');
              const prioritySelect = `<select class="inline-select" onchange="inlineUpdateCard('${card.id}', 'priority', this.value)">${prioOptions}</select>`;
              
              return `
                <tr class="table-row-editable" style="border-bottom:1px solid var(--bo-1);transition:background 0.2s;">
                  <td style="padding:8px 16px;border-right:1px solid var(--bo-1);">
                    <div style="display:flex;align-items:center;gap:8px;width:100%;">
                      ${card.doc_notes ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--c-exec-dot);flex-shrink:0;" title="Documento Executivo"></div>` : ''}
                      <input type="text" class="inline-input" value="${_e(card.title)}" onchange="inlineUpdateCard('${card.id}', 'title', this.value)" style="flex:1;" />
                      <button class="pill clickable" onclick="openCard('${card.id}')" title="Abrir Detalhes" style="padding:4px;background:transparent;border:none;flex-shrink:0;"><i data-lucide="maximize-2" style="width:12px;height:12px"></i></button>
                    </div>
                  </td>
                  <td style="padding:8px 16px;border-right:1px solid var(--bo-1);">
                    <select class="inline-select ${col?.color ? 'has-color' : ''}" onchange="inlineUpdateCard('${card.id}', 'column_id', this.value)" style="border-left: 3px solid ${col?.color || 'transparent'}">
                      ${colOptions}
                    </select>
                  </td>
                  <td style="padding:8px 16px;border-right:1px solid var(--bo-1);">
                    ${assigneeSelect}
                  </td>
                  <td style="padding:8px 16px;border-right:1px solid var(--bo-1);">
                    ${prioritySelect}
                  </td>
                  <td style="padding:8px 16px;border-right:1px solid var(--bo-1);">
                    <input type="date" class="inline-input" value="${card.due_date ? card.due_date.split('T')[0] : ''}" onchange="inlineUpdateCard('${card.id}', 'due_date', this.value)" />
                  </td>
                  <td style="padding:8px 16px;color:var(--tx-3);">
                    ${(card.tags||[]).slice(0,2).map(t => `<span style="background:var(--bg-2);padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px;">${_e(t)}</span>`).join('')}
                    ${card.is_recurring ? `<i data-lucide="repeat" style="width:14px;height:14px;vertical-align:middle;margin-left:4px;" title="Recorrente"></i>` : ''}
                  </td>
                </tr>
              `;
            }).join('') || `<tr><td colspan="6" style="padding:32px;text-align:center;color:var(--tx-3);">Nenhuma tarefa encontrada.</td></tr>`}
            
            <!-- Quick Add Row -->
            <tr style="background:var(--bg-0);">
              <td style="padding:12px 16px;border-right:1px solid var(--bo-1);">
                <div style="display:flex;align-items:center;gap:8px;">
                  <i data-lucide="plus" style="width:14px;height:14px;color:var(--tx-3)"></i>
                  <input type="text" id="inline-new-title" class="inline-input" placeholder="Nova tarefa..." onkeydown="if(event.key==='Enter') window.inlineAddCard()" style="flex:1;" />
                </div>
              </td>
              <td colspan="5" style="padding:12px 16px;color:var(--tx-3);font-size:12px;">
                Pressione <kbd style="background:var(--bg-2);padding:2px 6px;border-radius:4px;border:1px solid var(--bo-2);">Enter</kbd> para criar
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  
  for(const col of cols) {
    const colCards=cards.filter(c=>_cardInCol(c,col)).sort((a,b)=>(a.position||0)-(b.position||0));
    const over=col.wip_limit&&colCards.length>col.wip_limit;
    
    const cardNodes = colCards.map(c => _buildCard(c));
    const kcCards = h('div.kc-cards', { 'data-col': col.id }, ...cardNodes);
    
    const buttonOrHint = !col.is_locked 
      ? h('button.kc-add', { onclick: () => openNewCardInCol(col.id) }, 
          h('svg', { viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round' }, h('path', { d: 'M6 1v10M1 6h10' })),
          ' Adicionar tarefa'
        )
      : h('div.kc-recur-hint', {}, '🔄 Tarefas recorrentes');
      
    const div = h(`div.kc${over?'.kc--over':''}`, { 'data-col-id': String(col.id), style: { minWidth: COL_W+'px', maxWidth: COL_W+'px' } }, kcCards, buttonOrHint);
    
    board.appendChild(div);
  }

  board.addEventListener('scroll',()=>{if(hdr)hdr.style.marginLeft=(-board.scrollLeft)+'px';},{passive:true});
  _attachDrag(board);
  updateColCounts();
  if(typeof window.PFDiagramAutoUpdate==='function')window.PFDiagramAutoUpdate();
  if(window.NotificationManager) window.NotificationManager.checkSLA();
}

function _buildCard(c){
  const bpmn=c.bpmn||c.bpmn_status||'esbocar';
  const pri=c.priority||'medium';
  const priData={low:{icon:'↓',cls:'low',label:'Baixa'},medium:{icon:'⬝',cls:'med',label:'Média'},high:{icon:'↑',cls:'high',label:'Alta'},critical:{icon:'●',cls:'crit',label:'Crítica'}};
  const p=priData[pri]||priData.medium;
  const due=c.due_date||c.date||'';
  const now=new Date();
  const isOverdue=due&&bpmn!=='concluido'&&new Date(due)<now;
  const isDueSoon=due&&!isOverdue&&bpmn!=='concluido'&&(new Date(due)-now)<(3*86400000);
  const team=window.mockTeam||[];
  const assignee=team.find(m=>m.id===(c.assignee||c.assigned_to));
  const subtaskPct=c.subtasks?.total>0?Math.round(c.subtasks.done/c.subtasks.total*100):null;
  const budget=c.budget_str||(c.budget?'R$ '+Number(c.budget).toLocaleString('pt-BR'):'');
  const hours=c.estimated_hours?(c.estimated_hours+'h'):'';
  const attCount=(window.AttachmentManager?.getForCard(c.id)||[]).length;
  const hasDoc=c.doc_decision||c.doc_artifact||c.doc_risk;
  const tags=(c.tags||[]).filter(t=>t&&t!=='').slice(0,2);
  const tagLabels={a:'Cli A',b:'Cli B',c:'Cli C',meet:'Reunião',block:'🔴 Bloqueado'};

  const children = [];
  if(bpmn==='concluido') children.push(h('div.kcard-status.kcard-status--done', {}, '✓ Concluído'));
  if(c.is_blocked) children.push(h('div.kcard-status.kcard-status--block', {}, '⛔ Bloqueado'));
  
  children.push(h('div.kcard-title', {}, String(c.title||'')));
  
  if(c.description||c.desc) {
    const d = String(c.description||c.desc);
    children.push(h('div.kcard-desc', {}, d.slice(0,90) + (d.length>90?'…':'')));
  }
  
  if(subtaskPct!==null) {
    children.push(
      h('div.kcard-progress', {}, 
        h('div.kcard-prog-bar', {}, h('div.kcard-prog-fill', { style: { width: subtaskPct+'%' } })),
        h('span.kcard-prog-lbl', {}, `${c.subtasks.done}/${c.subtasks.total}`)
      )
    );
  }
  
  children.push(
    h('div.kcard-meta', {}, 
      _bpmnBadgeNode(bpmn),
      h(`span.kcard-pri.kcard-pri--${p.cls}`, {}, `${p.icon} ${p.label}`)
    )
  );

  const chips = [];
  if(hours) chips.push(h('span.kchip.kchip--hrs', {}, `⏱ ${hours}`));
  if(budget) chips.push(h('span.kchip.kchip--budget', {}, budget));
  if(attCount) chips.push(h('span.kchip.kchip--att', {}, `📎 ${attCount}`));
  if(hasDoc) chips.push(h('span.kchip.kchip--doc', {}, '📄 Doc'));
  for(const t of tags) chips.push(h('span.kchip', {}, tagLabels[t]||t));

  const rightArea = [];
  if(due) {
    const cls = isOverdue ? '.kcard-due--over' : (isDueSoon ? '.kcard-due--soon' : '');
    const prefix = isOverdue ? '⚠ ' : (isDueSoon ? '⏰ ' : '');
    rightArea.push(h(`span.kcard-due${cls}`, {}, prefix+due));
  }
  if(assignee) {
    rightArea.push(h('div.kavatar', { style: { background: assignee.color }, title: assignee.name }, String(assignee.initials)));
  }

  children.push(h('div.kcard-footer', {}, 
    h('div.kcard-chips', {}, ...chips),
    h('div.kcard-right', {}, ...rightArea)
  ));

  return h(`div.kcard${c._temp?'.kcard--sync':''}`, {
    'data-card-id': c.id,
    draggable: 'true',
    ondragstart: window.onDragStart,
    ondragend: window.onDragEnd,
    onclick: function(e) { if(!this._dragged) openCardEdit(c.id); }
  }, ...children);
}

// ── DRAG & DROP ───────────────────────────────────────────────
let _dId=null,_dCol=null;
function onDragStart(e){_dId=e.currentTarget.dataset.cardId;_dCol=e.currentTarget.closest('.kc-cards')?.dataset.col;e.currentTarget.classList.add('kcard--drag');e.dataTransfer.effectAllowed='move';}
function onDragEnd(e){
  // Limpa classes no elemento atual (pode ser null se re-renderizado)
  try { if(e.currentTarget) e.currentTarget.classList.remove('kcard--drag'); } catch(_){}
  document.querySelectorAll('.kcard--drag').forEach(c=>c.classList.remove('kcard--drag'));
  document.querySelectorAll('.kc-drop').forEach(z=>z.classList.remove('kc-drop'));
  // Guarda referência local antes do setTimeout (evita null no closure)
  const el = e.currentTarget;
  if(el) setTimeout(()=>{ try{ el._dragged=false; }catch(_){} }, 100);
}
function _attachDrag(board){
  board.querySelectorAll('.kc-cards').forEach(z=>{
    z.addEventListener('dragover',e=>{e.preventDefault();z.classList.add('kc-drop');});
    z.addEventListener('dragleave',e=>{if(!z.contains(e.relatedTarget))z.classList.remove('kc-drop');});
    z.addEventListener('drop',e=>{e.preventDefault();z.classList.remove('kc-drop');if(_dId&&z.dataset.col!==_dCol)moveCardToCol(_dId,z.dataset.col);_dId=null;});
  });
}

async function moveCardToCol(cardId,colId){
  const cards=PFBoard.cards.length?PFBoard.cards:(window.mockCards||[]);
  const card=cards.find(c=>c.id===cardId);if(!card)return;
  const col=(PFBoard.columns.length?PFBoard.columns:initDefaultColumns()).find(c=>c.id===colId);if(!col)return;
  if(col.wip_limit&&!col.is_done_col){
    const curr=cards.filter(c=>_cardInCol(c,col)&&c.id!==cardId).length;
    if(curr>=col.wip_limit){showToast('WIP ('+col.wip_limit+') atingido: "'+col.name+'"',true);return;}
  }
  const newB=col.bpmn_mapping?.[0]||card.bpmn||'esbocar';
  const prevC=card.column_id||card.col,prevB=card.bpmn||card.bpmn_status;
  await SyncManager.execute(cardId,
    ()=>{card.column_id=colId;card.col=colId;card.bpmn=newB;card.bpmn_status=newB;},
    async()=>{if(!PF.supabase||PF.demoMode)return{error:null};return PF.supabase.from('tasks').update({column_id:colId,bpmn_status:newB}).eq('id',cardId);},
    ()=>{card.column_id=prevC;card.col=prevC;card.bpmn=prevB;card.bpmn_status=prevB;},'');
}

// ── COLUNAS ───────────────────────────────────────────────────
async function addBoardColumn(){
  const result=await PFModal.addColumn();if(!result)return;
  // Ensure columns is always a real array (not empty from uninitialized state)
  if(!PFBoard.columns.length) PFBoard.columns=initDefaultColumns();
  const newCol={id:'col_'+Date.now(),name:result.name,position:PFBoard.columns.length+1,
    color:result.color||'#9A9A94',wip_limit:result.wip||null,is_done_col:false,is_locked:false,bpmn_mapping:[]};
  if(PF.supabase&&!PF.demoMode&&PFBoard.boardId){
    const{data,error}=await PF.supabase.from('kanban_columns').insert({
      board_id:PFBoard.boardId,name:result.name,position:newCol.position,
      color:result.color,wip_limit:result.wip||null
    }).select().single();
    if(error){showToast('Erro ao criar coluna: '+error.message,true);return;}
    newCol.id=data.id;
  }
  PFBoard.columns.push(newCol);
  renderBoard();
  showToast('Coluna "'+result.name+'" criada!','ok');
}

async function openColOptions(e,colId){
  e.stopPropagation();
  // Always ensure PFBoard.columns is real — never use a throwaway initDefaultColumns()
  if(!PFBoard.columns.length) PFBoard.columns=initDefaultColumns();
  const col=PFBoard.columns.find(c=>c.id===colId);
  if(!col){showToast('Coluna não encontrada',true);return;}
  if(col.is_locked){showToast('Esta coluna não pode ser editada',true);return;}
  const action=await PFModal.colOptions(col.name);
  if(!action)return;
  if(action==='rename'){
    const n=await PFModal.prompt({title:'Renomear Coluna',label:'Novo nome',value:col.name,placeholder:'Ex: Homologação'});
    if(!n||!n.trim())return;
    col.name=n.trim();
    if(PF.supabase&&!PF.demoMode)await PF.supabase.from('kanban_columns').update({name:col.name}).eq('id',colId);
    renderBoard();showToast('Coluna renomeada!','ok');
  }else if(action==='wip'){
    const w=await PFModal.prompt({title:'Limite WIP',label:'Máximo de tarefas simultâneas (vazio = sem limite)',value:col.wip_limit?String(col.wip_limit):'',type:'number',placeholder:'Ex: 4'});
    col.wip_limit=w&&parseInt(w)>0?parseInt(w):null;
    if(PF.supabase&&!PF.demoMode)await PF.supabase.from('kanban_columns').update({wip_limit:col.wip_limit}).eq('id',colId);
    renderBoard();showToast('Limite WIP '+(col.wip_limit?'definido como '+col.wip_limit:'removido'),'ok');
  }else if(action==='delete'){
    const cardCount=PFBoard.cards.filter(c=>_cardInCol(c,col)).length;
    const msg=cardCount
      ?'Remover "'+col.name+'"? '+cardCount+' tarefa(s) ficarão sem coluna.'
      :'Remover "'+col.name+'"? A coluna está vazia.';
    const ok=await PFModal.confirm({title:'Remover Coluna',message:msg,confirmText:'Remover',danger:true});
    if(!ok)return;
    PFBoard.columns=PFBoard.columns.filter(c=>c.id!==colId);
    if(PF.supabase&&!PF.demoMode)await PF.supabase.from('kanban_columns').delete().eq('id',colId);
    renderBoard();showToast('Coluna removida');
  }
}

function openNewCardInCol(colId){PF._pendingCol=colId;openNewCard();}
function openNewCard(){
  const colId = PF._pendingCol || (PFBoard.columns.length ? PFBoard.columns[0].id : 'col-1');
  const bpmn = PFBoard.columns.find(c=>c.id===colId)?.bpmn_mapping?.[0] || 'esbocar';
  const projectId = PFBoard.projectId || PF.currentProject;
  
  if (PF.supabase && !PF.demoMode) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!projectId || !isUUID.test(projectId)) {
      showToast('Selecione um projeto válido antes de criar tarefas.', true);
      return;
    }
  }

  const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uid();
  const nc = {
    id: tempId, _temp: true, column_id: colId, col: colId, bpmn, bpmn_status: bpmn,
    title: 'Nova Tarefa', description: '', priority: 'medium',
    project_id: projectId, board_id: PFBoard.boardId, _isNewDraft: true
  };
  
  if (PFBoard.cards.length) PFBoard.cards.push(nc);
  else { window.mockCards = window.mockCards || []; window.mockCards.push(nc); }
  
  renderBoard();
  PF._pendingCol = null;
  
  if (PF.supabase && !PF.demoMode) {
     PF.supabase.from('tasks').insert({
       id: tempId,
       title: 'Nova Tarefa', project_id: projectId, board_id: PFBoard.boardId||null,
       column_id: colId.startsWith('col-')?null:colId, bpmn_status: bpmn, priority: 'medium',
       created_by: PF.user?.id||null
     }).select('id').single().then(({data, error}) => {
       if(!error && data?.id) {
         nc._temp = false;
         renderBoard();
       } else {
         console.warn('[PF] Erro ao criar rascunho:', error);
       }
     });
  }
  
  openCardEdit(tempId);
  setTimeout(()=>document.getElementById('ce-title')?.focus(), 100);
}

async function checkDateConflict(dateStr, ignoreId=null) {
  if(!dateStr) return true;
  const cards=PFBoard.cards.length?PFBoard.cards:(window.mockCards||[]);
  const count=cards.filter(c => {
    if(ignoreId && c.id===ignoreId) return false;
    if(c.bpmn==='concluido' || c.bpmn_status==='concluido' || c.completed_at) return false;
    const d=c.due_date||c.date;
    return d===dateStr;
  }).length;
  if(count > 0) {
    const msg = `Você já tem ${count} tarefa(s) agendada(s) para esta data (${dateStr.split('-').reverse().join('/')}).\n\nPara evitar gargalos no SLA, considere reagendar para o dia seguinte.\nDeseja manter esta data?`;
    return await PFModal.confirm({title:'Conflito de Data (SLA)', message:msg, confirmText:'Manter mesmo assim', danger:true});
  }
  return true;
}



// ── CARD EDIT ─────────────────────────────────────────────────
function openCardEdit(cardId){
  const cards=PFBoard.cards.length?PFBoard.cards:(window.mockCards||[]);
  const c=cards.find(x=>x.id===cardId);if(!c)return;
  PF.activeCardId=cardId;
  const bpmn=c.bpmn||c.bpmn_status||'esbocar';
  const currIdx=BPMN_STEPS.indexOf(bpmn);
  const cols=PFBoard.columns.length?PFBoard.columns:initDefaultColumns();
  const team=window.mockTeam||[];
  const _v=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  const _t=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};

  _t('ce-id','#'+String(cardId).slice(-6).toUpperCase());
  const badge=document.getElementById('ce-bpmn-badge');
  if(badge){badge.textContent=BPMN_LABEL[bpmn]||bpmn;badge.dataset.bpmn=bpmn;
    badge.style.color=BPMN_C[bpmn]||'var(--ac)';
    badge.style.borderColor=(BPMN_C[bpmn]||'var(--ac)')+'40';
    badge.style.background=(BPMN_C[bpmn]||'var(--ac)')+'12';}

  _v('ce-title',c.title||'');_v('ce-desc',c.description||c.desc||'');
  if(window.tinymce?.get('ce-desc')) window.tinymce.get('ce-desc').setContent(c.description||c.desc||'');
  _v('ce-acceptance',c.acceptance_criteria||'');_v('ce-hours',c.estimated_hours||'');
  _v('ce-budget',c.budget||'');_v('ce-due-date',c.due_date||'');
  _v('ce-completed-at',c.completed_at ? new Date(c.completed_at).toISOString().slice(0,16) : '');
  _v('ce-doc-decision',c.doc_decision||'');_v('ce-doc-artifact',c.doc_artifact||'');
  _v('ce-doc-risk',c.doc_risk||'');_v('ce-doc-notes',c.doc_notes||'');
  _v('ce-links',c.doc_links||'');
  const pr=document.getElementById('ce-priority');if(pr)pr.value=c.priority||'medium';
  const ce=document.getElementById('ce-column');
  if(ce)ce.innerHTML=cols.filter(x=>!x.is_locked).map(x=>`<option value="${x.id}"${_cardInCol(c,x)?' selected':''}>${_e(x.name)}</option>`).join('');
  const ae=document.getElementById('ce-assignee');
  if(ae)ae.innerHTML='<option value="">— Não atribuído</option>'+team.map(m=>`<option value="${m.id}"${(c.assignee||c.assigned_to)===m.id?' selected':''}>${_e(m.name||m.email)}</option>`).join('')+'<option value="add_new" style="font-style:italic;color:var(--ac)">+ Adicionar Novo</option>';
  const req=document.getElementById('ce-requester');
  if(req)req.innerHTML='<option value="">— Não atribuído</option>'+team.map(m=>`<option value="${m.id}"${(c.requester||c.requester_id)===m.id?' selected':''}>${_e(m.name||m.email)}</option>`).join('')+'<option value="add_new" style="font-style:italic;color:var(--ac)">+ Adicionar Novo</option>';

  const bf=document.getElementById('ce-bpmn-flow');
  if(bf)bf.innerHTML=BPMN_STEPS.map((s,i)=>{
    const si=BPMN_STEPS.indexOf(s);const cls=si<currIdx?'done':si===currIdx?'active':si===currIdx+1?'next':'';
    return(i>0?'<div class="pf-bpmn-line"></div>':'')+`<div class="pf-bpmn-step ${cls}" data-step="${s}" onclick="setCardBpmn('${s}')"><div class="pf-bpmn-dot"></div><div class="pf-bpmn-lbl">${_e(BPMN_LABEL[s]||s)}</div></div>`;
  }).join('');

  document.querySelectorAll('#card-edit-overlay .ce-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#card-edit-overlay .ce-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('ce-tab-details')?.classList.add('active');
  document.getElementById('ce-panel-details')?.classList.add('active');
  _loadCardHistory(cardId);
  if(typeof refreshCardAttachments==='function')refreshCardAttachments(cardId);
  if (typeof toggleCardEditMode === 'function') {
    toggleCardEditMode(false); // start in read mode
  }
  openModal('card-edit-overlay');
}

function switchCETab(t){
  document.querySelectorAll('#card-edit-overlay .ce-tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('#card-edit-overlay .ce-panel').forEach(x=>x.classList.remove('active'));
  document.getElementById('ce-tab-'+t)?.classList.add('active');
  document.getElementById('ce-panel-'+t)?.classList.add('active');
}

function setCardBpmn(step){
  const cur=BPMN_STEPS.indexOf(step);
  document.querySelectorAll('#ce-bpmn-flow .pf-bpmn-step').forEach(el=>{
    const i=BPMN_STEPS.indexOf(el.dataset.step);
    el.className='pf-bpmn-step '+(i<cur?'done':i===cur?'active':i===cur+1?'next':'');
  });
  const b=document.getElementById('ce-bpmn-badge');
  if(b){b.textContent=BPMN_LABEL[step]||step;b.dataset.bpmn=step;
    b.style.color=BPMN_C[step]||'var(--ac)';
    b.style.borderColor=(BPMN_C[step]||'var(--ac)')+'40';
    b.style.background=(BPMN_C[step]||'var(--ac)')+'12';}
}

function advanceBpmn(){
  const b=document.getElementById('ce-bpmn-badge');if(!b)return;
  const next=BPMN_STEPS[BPMN_STEPS.indexOf(b.dataset.bpmn||'esbocar')+1];
  if(next)setCardBpmn(next);else showToast('Já está no último passo');
}

async function saveCardEdit(){
  const cardId=PF.activeCardId;if(!cardId)return;
  const cards=PFBoard.cards.length?PFBoard.cards:(window.mockCards||[]);
  const card=cards.find(c=>c.id===cardId);if(!card)return;
  const badge=document.getElementById('ce-bpmn-badge');
  const colEl=document.getElementById('ce-column');
  const title=document.getElementById('ce-title')?.value.trim();
  if(!title||title.length<3){showToast('Título deve ter ≥3 caracteres',true);return;}
  const newDue = document.getElementById('ce-due-date')?.value||null;
  if(newDue && newDue !== card.due_date) {
    const ok = await checkDateConflict(newDue, cardId);
    if(!ok) return;
  }
  const completedRaw = document.getElementById('ce-completed-at')?.value;
  const completed_at = completedRaw ? new Date(completedRaw).toISOString() : null;
  const updates={title,
    description:(window.tinymce?.get('ce-desc') ? window.tinymce.get('ce-desc').getContent().trim() : document.getElementById('ce-desc')?.value.trim())||null,
    acceptance_criteria:document.getElementById('ce-acceptance')?.value.trim()||null,
    priority:document.getElementById('ce-priority')?.value||'medium',
    estimated_hours:parseFloat(document.getElementById('ce-hours')?.value)||null,
    budget:parseFloat(document.getElementById('ce-budget')?.value)||null,
    due_date:newDue,
    completed_at:completed_at,
    bpmn_status:badge?.dataset.bpmn||card.bpmn_status||'esbocar',
    column_id:colEl?.value||card.column_id,
    doc_decision:document.getElementById('ce-doc-decision')?.value.trim()||null,
    doc_artifact:document.getElementById('ce-doc-artifact')?.value.trim()||null,
    doc_risk:document.getElementById('ce-doc-risk')?.value.trim()||null,
    doc_notes:document.getElementById('ce-doc-notes')?.value.trim()||null,
    doc_links:document.getElementById('ce-links')?.value.trim()||null,
    assigned_to:document.getElementById('ce-assignee')?.value||null,
    request_date:document.getElementById('ce-req-date')?.value||null,
    requester:document.getElementById('ce-requester')?.value.trim()||null,
    area:document.getElementById('ce-area')?.value.trim()||null,
    key_people:document.getElementById('ce-key-people')?.value.trim()||null};
  const prev={...card};
  await SyncManager.execute(cardId,
    ()=>{Object.assign(card,updates);card.bpmn=updates.bpmn_status;// preserva col legacy apenas se novo column_id não for UUID
const _u=/^[0-9a-f]{8}-[0-9a-f]{4}/i;if(!_u.test(updates.column_id||''))card.col=updates.column_id;card.date=updates.due_date;},
    async()=>{if(!PF.supabase||PF.demoMode)return{error:null};return PF.supabase.from('tasks').update({...updates,updated_at:new Date().toISOString()}).eq('id',cardId);},
    ()=>{Object.assign(card,prev);},'Alteração salva com êxito');
  card._isNewDraft = false;
  closeModal('card-edit-overlay');
}

async function deleteCard(cardIdOverride, silent = false){
  const cardId=cardIdOverride || PF.activeCardId;if(!cardId)return;
  const cards=PFBoard.cards.length?PFBoard.cards:(window.mockCards||[]);
  const card=cards.find(c=>c.id===cardId);if(!card)return;
  if(!silent) {
    const ok=await PFModal.deleteCard(card.title);if(!ok)return;
  }
  const idx=cards.findIndex(c=>c.id===cardId);if(idx===-1)return;
  const[removed]=cards.splice(idx,1);
  if(!silent) { closeModal('card-edit-overlay');renderBoard();showToast('Tarefa excluída'); }
  else { renderBoard(); }
  if(PF.supabase&&!PF.demoMode){
    if (window.listarAnexos && window.removerAnexo) {
       try {
         const atts = await window.listarAnexos(cardId);
         for (const a of atts) { await window.removerAnexo(a.id, a.storage_path); }
       } catch(e) { console.warn('Erro ao limpar anexos:', e); }
    }
    const{error}=await PF.supabase.from('tasks').delete().eq('id',cardId);
    if(error && !silent){cards.splice(idx,0,removed);renderBoard();showToast('Erro: '+error.message,true);}
  }
}

async function _loadCardHistory(cardId){
  const el=document.getElementById('ce-history');if(!el)return;
  el.innerHTML='<p class="pf-hist-loading">Carregando histórico...</p>';
  if(PF.demoMode||!PF.supabase){
    el.innerHTML='<div class="pf-hist-item"><div class="pf-hist-icon">📋</div><div class="pf-hist-body"><p class="pf-hist-text">Card criado</p><p class="pf-hist-time">Agora (modo demo)</p></div></div>';return;
  }
  const{data}=await PF.supabase.from('task_history').select('*').eq('task_id',cardId).order('changed_at',{ascending:false}).limit(20);
  if(!data?.length){el.innerHTML='<p class="pf-hist-empty">Nenhum histórico registrado</p>';return;}
  const lb={title:'Título',bpmn_status:'Status BPMN',column_id:'Coluna',assigned_to:'Responsável',priority:'Prioridade'};
  el.innerHTML=data.map(h=>`<div class="pf-hist-item">
    <div class="pf-hist-icon">${h.change_type==='status_change'?'🔄':h.change_type==='move'?'↔️':'✏️'}</div>
    <div class="pf-hist-body">
      <p class="pf-hist-text"><strong>${lb[h.field_name]||h.field_name}:</strong> <span class="pf-hist-old">${_e(h.old_value||'—')}</span> → <span class="pf-hist-new">${_e(h.new_value||'—')}</span></p>
      <p class="pf-hist-time">${new Date(h.changed_at).toLocaleString('pt-BR')}</p>
    </div>
  </div>`).join('');
}

function updateColCounts(){
  const cards=PFBoard.cards.length?PFBoard.cards:(window.mockCards||[]);
  const cols=PFBoard.columns.length?PFBoard.columns:initDefaultColumns();
  let active=0;cols.forEach(col=>{if(!col.is_done_col)active+=cards.filter(c=>_cardInCol(c,col)).length;});
  const wp=document.getElementById('wip-pill');
  if(wp){wp.textContent='WIP: '+active;wp.className='pill'+(active>15?' warn':'');}
}

async function loadProjectBoard(projectId){
  if(!PF.supabase||PF.demoMode){
    PFBoard.columns=initDefaultColumns();
    PFBoard.cards=(window.mockCards||[]).filter(c=>!c.sl||c.sl===projectId||c.project_id===projectId);
    PFBoard.projectId=projectId;renderBoard();return;
  }
  const{data:boards}=await PF.supabase.from('kanban_boards').select('id,name').eq('project_id',projectId).order('created_at').limit(1);
  if(!boards?.length){PFBoard.columns=initDefaultColumns();PFBoard.cards=[];PFBoard.projectId=projectId;renderBoard();return;}
  PFBoard.boardId=boards[0].id;
  const{data:cols}=await PF.supabase.from('kanban_columns').select('*').eq('board_id',PFBoard.boardId).order('position');
  PFBoard.columns=cols||initDefaultColumns();
  const{data:tasks}=await PF.supabase.from('tasks').select('*').eq('project_id',projectId).order('position',{ascending:true});
  PFBoard.cards=tasks||[];PFBoard.projectId=projectId;renderBoard();
}

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard(){
  const el=document.getElementById('dashboard-content');if(!el)return;
  const cards=PFBoard.cards.length?PFBoard.cards:(window.mockCards||[]);
  const cols=PFBoard.columns.length?PFBoard.columns:initDefaultColumns();
  const total=cards.length,done=cards.filter(c=>c.bpmn==='concluido'||c.bpmn_status==='concluido').length;
  const inExec=cards.filter(c=>c.bpmn==='executar'||c.bpmn_status==='executar').length;
  const inRev=cards.filter(c=>['avaliar','corrigir','validar_cliente'].includes(c.bpmn||c.bpmn_status)).length;
  const blocked=cards.filter(c=>c.is_blocked).length;
  const overdue=cards.filter(c=>{const d=c.due_date||c.date;if(!d||c.bpmn==='concluido'||c.bpmn_status==='concluido')return false;return new Date(d)<new Date();}).length;
  const byPri={critical:0,high:0,medium:0,low:0};cards.forEach(c=>{byPri[c.priority||'medium']=(byPri[c.priority||'medium']||0)+1;});
  const pct=total?Math.round(done/total*100):0;
  const proj=(window.mockProjects||[]).find(p=>p.id===PFBoard.projectId)||{color:'var(--ac)',name:'Projeto'};
  const team=window.mockTeam||[];

  // Budget
  const totalBudget=cards.reduce((s,c)=>s+(c.budget||0),0);
  const doneCards=cards.filter(c=>c.bpmn==='concluido'||c.bpmn_status==='concluido');
  const doneBudget=doneCards.reduce((s,c)=>s+(c.budget||0),0);
  const totalHours=cards.reduce((s,c)=>s+(c.estimated_hours||0),0);

  el.innerHTML=`
    <div style="max-width:1200px">
      <div class="dash-proj-hdr" style="border-left:4px solid ${proj.color||'var(--ac)'}">
        <div style="flex:1">
          <div style="font-size:20px;font-weight:800;color:var(--tx-1);letter-spacing:-.5px">${_e(proj.name)}</div>
          <div style="font-size:13px;color:var(--tx-3);margin-top:3px">${total} tarefas · última atualização agora</div>
        </div>
        <button class="btn-primary" onclick="switchView('kanban',document.getElementById('nav-kanban'))" style="font-size:12px">← Kanban</button>
      </div>

      <div class="dash-stats">
        ${[
          ['Total',total,'var(--tx-1)','📋'],
          ['Concluídas',done,'var(--green)','✅'],
          ['Em Execução',inExec,'var(--yellow)','⚡'],
          ['Em Revisão',inRev,'var(--blue)','🔍'],
          ['Bloqueadas',blocked,'var(--red)','⛔'],
          ['Atrasadas',overdue,'var(--red)','⚠️'],
        ].map(([l,v,c,i])=>`<div class="dash-stat">
          <div class="dash-stat-icon">${i}</div>
          <div class="dash-stat-n" style="color:${c}">${v}</div>
          <div class="dash-stat-l">${l}</div>
        </div>`).join('')}
      </div>

      <div class="dash-progress-card">
        <div class="dash-progress-hdr">
          <span class="dash-progress-title">Progresso Geral</span>
          <span class="dash-progress-pct" style="color:${proj.color||'var(--ac)'}">${pct}%</span>
        </div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${proj.color||'var(--ac)'},${proj.color||'var(--ac)'}88)"></div>
        </div>
        <div style="display:flex;gap:16px;margin-top:10px;font-size:12px;color:var(--tx-3)">
          <span>${done} de ${total} tarefas concluídas</span>
          ${totalHours>0?`<span>⏱ ${totalHours}h estimadas</span>`:''}
          ${totalBudget>0?`<span>💰 R$ ${totalBudget.toLocaleString('pt-BR')} em orçamento</span>`:''}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="dash-card">
          <div class="dash-card-title">Por Prioridade</div>
          ${[['critical','● Crítica','var(--red)'],['high','↑ Alta','var(--yellow)'],['medium','⬝ Média','var(--tx-2)'],['low','↓ Baixa','var(--tx-3)']].map(([p,l,c])=>byPri[p]?`
            <div class="dash-row">
              <span style="color:${c};font-weight:600;font-size:13px">${l}</span>
              <div class="dash-bar"><div style="height:100%;background:${c};border-radius:2px;width:${total?Math.round(byPri[p]/total*100):0}%;transition:width .4s"></div></div>
              <span class="dash-cnt">${byPri[p]}</span>
            </div>`:''
          ).join('')||'<p style="font-size:13px;color:var(--tx-3)">Sem tarefas</p>'}
        </div>
        <div class="dash-card">
          <div class="dash-card-title">Por Coluna</div>
          ${cols.map(col=>{const cnt=cards.filter(c=>_cardInCol(c,col)).length;if(!cnt)return'';return`
            <div class="dash-row">
              <span class="dash-col-dot" style="background:${col.color}"></span>
              <span style="font-size:13px;color:var(--tx-1)">${_e(col.name)}</span>
              <div style="flex:1"></div>
              <span class="dash-cnt">${cnt}</span>
            </div>`;}).join('')}
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">Tarefas Ativas — Em Execução &amp; Revisão</div>
        ${cards.filter(c=>['executar','avaliar','corrigir','validar_cliente'].includes(c.bpmn||c.bpmn_status)).slice(0,12).map(c=>{
          const m=team.find(x=>x.id===(c.assignee||c.assigned_to));
          const bpmn=c.bpmn||c.bpmn_status||'esbocar';
          return`<div class="dash-task-row" onclick="openCardEdit('${c.id}')">
            ${_bpmnDot(bpmn)}
            <span class="dash-task-title">${_e(c.title)}</span>
            ${m?`<div class="kavatar kavatar--sm" style="background:${m.color}" title="${_e(m.name)}">${m.initials}</div>`:''}
            <span class="dash-task-pri" style="color:${{'low':'var(--tx-3)','medium':'var(--tx-2)','high':'var(--yellow)','critical':'var(--red)'}[c.priority||'medium']}">${{low:'↓',medium:'⬝',high:'↑',critical:'●'}[c.priority||'medium']}</span>
            ${c.due_date||c.date?`<span style="font-size:11px;color:var(--tx-3)">📅 ${_e(c.due_date||c.date)}</span>`:''}
          </div>`;
        }).join('')||'<p style="font-size:13px;color:var(--tx-3);padding:10px 0">Nenhuma tarefa ativa no momento</p>'}
      </div>
    </div>`;
}

// ── CSS ────────────────────────────────────────────────────────
(function injectCSS(){
  if(document.getElementById('pf-board-v6'))return;
  const s=document.createElement('style');s.id='pf-board-v6';
  s.textContent=`
/* ── COLUMN HEADERS ── */
.kh{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 10px;flex-shrink:0;background:var(--bg-1);}
.kh-left{display:flex;align-items:center;gap:7px;}
.kh-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.kh-name{font-size:12.5px;font-weight:700;color:var(--tx-1);letter-spacing:-.2px;}
.kh-right{display:flex;align-items:center;gap:4px;}
.kh-cnt{font-family:var(--mono);font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:var(--r-f);background:var(--bg-3);border:1px solid var(--bd);color:var(--tx-3);}
.kh-cnt--over{background:var(--red-bg)!important;color:var(--red)!important;border-color:transparent!important;}
.kh-lock{font-size:10px;opacity:.4;}
.kh-opts{background:none;border:none;cursor:pointer;color:var(--tx-3);padding:3px 6px;font-size:16px;border-radius:var(--r-s);opacity:.5;transition:all var(--t);}
.kh-opts:hover{opacity:1;background:var(--bg-2);}

/* ── COLUMN BODY ── */
.kc{flex-shrink:0;display:flex;flex-direction:column;background:var(--bg-2);border-radius:var(--r-l);max-height:calc(100vh - 200px);border:1px solid var(--bd);overflow:hidden;transition:border-color var(--t);}
.kc--over{border-color:var(--red)!important;box-shadow:0 0 0 2px var(--red-bg);}
.kc-cards{flex:1;overflow-y:auto;padding:6px;min-height:64px;}
.kc-cards.kc-drop{background:var(--ac-bg);border-radius:var(--r-s);}
/* ── CARDS ── */
.kcard{background:var(--bg-1);border:1px solid var(--bd);border-radius:var(--r-l);padding:12px 13px;margin-bottom:6px;cursor:pointer;transition:all var(--t);position:relative;overflow:hidden;}
.kcard:hover{box-shadow:var(--sh-2);border-color:var(--bd-2);transform:translateY(-1px);}
.kcard:active{transform:scale(.99);}
.kcard--drag{opacity:.3;transform:rotate(1.5deg) scale(1.04);box-shadow:var(--sh-drag);cursor:grabbing;}
.kcard--sync::after{content:'';position:absolute;top:0;left:0;right:0;height:2.5px;background:linear-gradient(90deg,var(--ac),var(--purple),var(--ac));background-size:200%;animation:ksync 1.4s linear infinite;border-radius:var(--r-l) var(--r-l) 0 0;}
@keyframes ksync{0%{background-position:0}100%{background-position:200%}}
.kcard-status{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-f);margin-bottom:8px;}
.kcard-status--done{background:var(--green-bg);color:var(--green);}
.kcard-status--block{background:var(--red-bg);color:var(--red);}
.kcard-title{font-size:13.5px;font-weight:600;color:var(--tx-1);line-height:1.45;margin-bottom:5px;letter-spacing:-.2px;}
.kcard-desc{font-size:12px;color:var(--tx-3);line-height:1.45;margin-bottom:8px;}
.kcard-progress{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.kcard-prog-bar{flex:1;height:4px;background:var(--bg-3);border-radius:2px;overflow:hidden;}
.kcard-prog-fill{height:100%;background:var(--ac);border-radius:2px;transition:width .3s;}
.kcard-prog-lbl{font-size:10px;color:var(--tx-3);font-family:var(--mono);white-space:nowrap;}
.kcard-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
.kc-bpmn-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:var(--r-f);font-size:10.5px;font-weight:700;border:1px solid;white-space:nowrap;}
.kcard-pri{font-size:11.5px;font-weight:600;}
.kcard-pri--low{color:var(--tx-3)!important;}
.kcard-pri--med{color:var(--tx-2)!important;}
.kcard-pri--high{color:var(--yellow)!important;}
.kcard-pri--crit{color:var(--red)!important;}
.kcard-footer{display:flex;align-items:center;justify-content:space-between;gap:6px;}
.kcard-chips{display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex:1;min-width:0;}
.kchip{font-size:10.5px;padding:2px 7px;border-radius:var(--r-f);background:var(--bg-3);border:1px solid var(--bd);color:var(--tx-2);white-space:nowrap;}
.kchip--budget{background:var(--green-bg);border-color:transparent;color:var(--green);font-weight:700;font-family:var(--mono);}
.kchip--hrs{background:var(--blue-bg);border-color:transparent;color:var(--blue);}
.kchip--att{background:var(--purple-bg);border-color:transparent;color:var(--purple);}
.kchip--doc{background:var(--teal-bg);border-color:transparent;color:var(--teal);}
.kcard-right{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.kcard-due{font-size:11px;color:var(--tx-3);white-space:nowrap;}
.kcard-due--over{color:var(--red)!important;font-weight:700;}
.kcard-due--soon{color:var(--yellow)!important;font-weight:600;}
.kavatar{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;border:2px solid var(--bg-1);}
.kavatar--sm{width:22px;height:22px;font-size:8px;}
.kc-add{width:100%;padding:8px 0;background:none;border:none;border-top:1px dashed var(--bd);cursor:pointer;font-size:12px;color:var(--tx-3);display:flex;align-items:center;justify-content:center;gap:5px;transition:all var(--t);}
.kc-add:hover{background:var(--bg-3);color:var(--tx-1);}
.kc-add svg{width:11px;height:11px;}
.kc-recur-hint{font-size:11px;color:var(--tx-3);text-align:center;padding:9px;border-top:1px dashed var(--bd);opacity:.65;}
/* ── DASHBOARD ── */
.dash-proj-hdr{display:flex;align-items:center;gap:14px;padding:18px 20px;background:var(--bg-1);border:1px solid var(--bd);border-radius:var(--r-xl);margin-bottom:20px;}
.dash-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px;}
@media(max-width:1000px){.dash-stats{grid-template-columns:repeat(3,1fr);}}
.dash-stat{background:var(--bg-1);border:1px solid var(--bd);border-radius:var(--r-l);padding:16px;text-align:center;transition:box-shadow var(--t);}
.dash-stat:hover{box-shadow:var(--sh-2);}
.dash-stat-icon{font-size:20px;margin-bottom:6px;}
.dash-stat-n{font-size:28px;font-weight:900;line-height:1;letter-spacing:-.5px;}
.dash-stat-l{font-size:11px;color:var(--tx-3);margin-top:4px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.3px;}
.dash-progress-card{background:var(--bg-1);border:1px solid var(--bd);border-radius:var(--r-xl);padding:18px 20px;margin-bottom:20px;}
.dash-progress-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.dash-progress-title{font-size:14px;font-weight:700;color:var(--tx-1);letter-spacing:-.3px;}
.dash-progress-pct{font-size:22px;font-weight:900;letter-spacing:-.5px;}
.dash-progress-track{height:10px;border-radius:var(--r-f);background:var(--bg-3);overflow:hidden;}
.dash-progress-fill{height:100%;border-radius:var(--r-f);transition:width .5s cubic-bezier(.4,0,.2,1);}
.dash-card{background:var(--bg-1);border:1px solid var(--bd);border-radius:var(--r-xl);padding:18px 20px;margin-bottom:16px;}
.dash-card-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--tx-3);margin-bottom:14px;}
.dash-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);}
.dash-row:last-child{border:none;}
.dash-bar{flex:1;height:6px;background:var(--bg-3);border-radius:3px;overflow:hidden;}
.dash-cnt{font-size:12px;font-weight:700;font-family:var(--mono);color:var(--tx-2);min-width:24px;text-align:right;}
.dash-col-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.dash-task-row{display:flex;align-items:center;gap:8px;padding:9px 8px;border-radius:var(--r-s);cursor:pointer;transition:background var(--t);}
.dash-task-row:hover{background:var(--bg-2);}
.dash-task-title{font-size:13px;color:var(--tx-1);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dash-task-pri{font-size:13px;flex-shrink:0;}
  `;
  document.head.appendChild(s);
})();

// ── EXPORTS ────────────────────────────────────────────────────
function openCardModal(id){openCardEdit(id);}
window.renderBoard=renderBoard;window.openNewCard=openNewCard;
window.openCardModal=openCardModal;window.openCardEdit=openCardEdit;window.saveCardEdit=saveCardEdit;

window.toggleCardEditMode = function(isEdit) {
  PF.cardEditMode = isEdit;
  
  const inputs = document.querySelectorAll('#card-edit-overlay .field-input');
  inputs.forEach(el => {
    if (isEdit) {
      el.removeAttribute('disabled');
      el.classList.remove('readonly-mode');
    } else {
      el.setAttribute('disabled', 'true');
      el.classList.add('readonly-mode');
    }
  });

  if (typeof tinymce !== 'undefined') {
    const editor = tinymce.get('ce-desc');
    if (editor) {
      if (isEdit) {
        editor.mode.set('design');
      } else {
        editor.mode.set('readonly');
      }
    }
  }

  const editBtn = document.getElementById('ce-btn-edit');
  const footer = document.getElementById('ce-modal-footer');

  if (editBtn) editBtn.style.display = isEdit ? 'none' : 'flex';
  if (footer) footer.style.display = isEdit ? 'flex' : 'none';

  if (isEdit) {
    setTimeout(()=>document.getElementById('ce-title')?.focus(), 80);
  }
};

window.openTaskDiagram=function(){
  const cardId = PF.activeCardId;
  if(!cardId) return;
  closeModal('card-edit-overlay');
  
  // Set PF state to diagram specifically for this task
  PF.currentDiagramType = 'task';
  PF.currentDiagramTargetId = cardId;
  
  // Try to load via DiagramEngine or switch view directly
  // The switchView('diagram') will handle initializing DiagramEngine
  if(typeof switchView === 'function') {
    switchView('diagram');
    if(typeof initDiagramView === 'function') initDiagramView(cardId);
  }
};

window.deleteCard=deleteCard;window.advanceBpmn=advanceBpmn;window.setCardBpmn=setCardBpmn;
window.switchCETab=switchCETab;window.moveCardToCol=moveCardToCol;window.loadProjectBoard=loadProjectBoard;
window.addBoardColumn=addBoardColumn;window.openColOptions=openColOptions;window.openNewCardInCol=openNewCardInCol;
window.updateColCounts=updateColCounts;window.resetNewCardForm=resetNewCardForm;window.renderDashboard=renderDashboard;
window.SyncManager=SyncManager;window.PFBoard=PFBoard;
