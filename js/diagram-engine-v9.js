// ============================================================
//  ProjectFlow V10 — diagram-engine-v9.js  (V4 — FIXED)
//  Arquitetura: SVG único e autossuficiente (sem #bv3-hit)
//  O SVG recebe todos os eventos diretamente nos elementos
//  <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Seleção e drag funcionando em todos os elementos
//  <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Dot-grid CSS sempre visível
//  <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Conexões via arrastar porta azul
//  <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Floating toolbar bpmn.io
//  <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Menu "Create element" com busca
//  <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Paleta completa com "..." para mais elementos
//  <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> 57+ tipos BPMN 2.0
//  <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Undo/Redo/Autosave
// ============================================================
'use strict';

window.DiagramEngineV9 = (function () {

  // ── Estado ───────────────────────────────────────────────
  let _svgEl = null;
  let _pid = null, _taskId = null;
  let _zoom = 1, _pan = {x:60, y:60};
  let _nodes = [], _edges = [];
  let _sel = null;            // id nó selecionado
  let _selEdge = null;        // id edge selecionada
  let _hist = [], _histIdx = -1;
  let _dirty = false, _saveTimer = null;
  let _kbBound = false;
  const MAXHIST = 80;

  // Interação
  let _drag   = null;  // {node, ox, oy}
  let _conn   = null;  // {srcId, x1,y1,x2,y2}
  let _panning = null; // {lx,ly}
  let _tool   = 'select';

  // ── Registry ─────────────────────────────────────────────
  const REG = {
    gw_excl:  {cat:'Gateways',          label:'Exclusive gateway',         bpmn:'ExclusiveGateway',             w:60,h:60},
    gw_par:   {cat:'Gateways',          label:'Parallel gateway',          bpmn:'ParallelGateway',              w:60,h:60},
    gw_incl:  {cat:'Gateways',          label:'Inclusive gateway',         bpmn:'InclusiveGateway',             w:60,h:60},
    gw_evt:   {cat:'Gateways',          label:'Event-based gateway',       bpmn:'EventBasedGateway',            w:60,h:60},
    gw_cplx:  {cat:'Gateways',          label:'Complex gateway',           bpmn:'ComplexGateway',               w:60,h:60},
    task:     {cat:'Tasks',             label:'Task',                      bpmn:'Task',                         w:120,h:80},
    task_usr: {cat:'Tasks',             label:'User task',                 bpmn:'UserTask',                     w:120,h:80},
    task_svc: {cat:'Tasks',             label:'Service task',              bpmn:'ServiceTask',                  w:120,h:80},
    task_snd: {cat:'Tasks',             label:'Send task',                 bpmn:'SendTask',                     w:120,h:80},
    task_rcv: {cat:'Tasks',             label:'Receive task',              bpmn:'ReceiveTask',                  w:120,h:80},
    task_man: {cat:'Tasks',             label:'Manual task',               bpmn:'ManualTask',                   w:120,h:80},
    task_biz: {cat:'Tasks',             label:'Business rule task',        bpmn:'BusinessRuleTask',             w:120,h:80},
    task_scr: {cat:'Tasks',             label:'Script task',               bpmn:'ScriptTask',                   w:120,h:80},
    call_act: {cat:'Sub-processes',     label:'Call activity',             bpmn:'CallActivity',                 w:120,h:80},
    sp_coll:  {cat:'Sub-processes',     label:'Sub-process (collapsed)',   bpmn:'SubProcess',                   w:120,h:80},
    sp_exp:   {cat:'Sub-processes',     label:'Sub-process (expanded)',    bpmn:'SubProcess',                   w:220,h:140},
    tx_sub:   {cat:'Sub-processes',     label:'Transaction',               bpmn:'Transaction',                  w:140,h:80},
    ev_sub:   {cat:'Sub-processes',     label:'Event sub-process',         bpmn:'EventSubProcess',              w:140,h:80},
    adhoc_c:  {cat:'Sub-processes',     label:'Ad-hoc sub-process (collapsed)', bpmn:'AdHocSubProcess',        w:120,h:80},
    adhoc_e:  {cat:'Sub-processes',     label:'Ad-hoc sub-process (expanded)',  bpmn:'AdHocSubProcess',        w:220,h:140},
    es_none:  {cat:'Events (Start)',    label:'Start event',               bpmn:'StartEvent',                   w:44,h:44},
    es_msg:   {cat:'Events (Start)',    label:'Message start',             bpmn:'StartEvent:Message',           w:44,h:44},
    es_tmr:   {cat:'Events (Start)',    label:'Timer start',               bpmn:'StartEvent:Timer',             w:44,h:44},
    es_cnd:   {cat:'Events (Start)',    label:'Conditional start',         bpmn:'StartEvent:Conditional',       w:44,h:44},
    es_sig:   {cat:'Events (Start)',    label:'Signal start',              bpmn:'StartEvent:Signal',            w:44,h:44},
    es_err:   {cat:'Events (Start)',    label:'Error start',               bpmn:'StartEvent:Error',             w:44,h:44},
    es_esc:   {cat:'Events (Start)',    label:'Escalation start',          bpmn:'StartEvent:Escalation',        w:44,h:44},
    es_mlt:   {cat:'Events (Start)',    label:'Multiple start',            bpmn:'StartEvent:Multiple',          w:44,h:44},
    ei_msg_c: {cat:'Events (Intermediate)', label:'Message catch',         bpmn:'IntermediateCatch:Message',    w:44,h:44},
    ei_tmr_c: {cat:'Events (Intermediate)', label:'Timer catch',           bpmn:'IntermediateCatch:Timer',      w:44,h:44},
    ei_cnd_c: {cat:'Events (Intermediate)', label:'Conditional catch',     bpmn:'IntermediateCatch:Conditional',w:44,h:44},
    ei_lnk_c: {cat:'Events (Intermediate)', label:'Link catch',            bpmn:'IntermediateCatch:Link',       w:44,h:44},
    ei_sig_c: {cat:'Events (Intermediate)', label:'Signal catch',          bpmn:'IntermediateCatch:Signal',     w:44,h:44},
    ei_msg_t: {cat:'Events (Intermediate)', label:'Message throw',         bpmn:'IntermediateThrow:Message',    w:44,h:44},
    ei_sig_t: {cat:'Events (Intermediate)', label:'Signal throw',          bpmn:'IntermediateThrow:Signal',     w:44,h:44},
    ei_esc_t: {cat:'Events (Intermediate)', label:'Escalation throw',      bpmn:'IntermediateThrow:Escalation', w:44,h:44},
    ei_cmp_t: {cat:'Events (Intermediate)', label:'Compensation throw',    bpmn:'IntermediateThrow:Compensation',w:44,h:44},
    ei_lnk_t: {cat:'Events (Intermediate)', label:'Link throw',            bpmn:'IntermediateThrow:Link',       w:44,h:44},
    ee_none:  {cat:'Events (End)',      label:'End event',                 bpmn:'EndEvent',                     w:44,h:44},
    ee_msg:   {cat:'Events (End)',      label:'Message end',               bpmn:'EndEvent:Message',             w:44,h:44},
    ee_err:   {cat:'Events (End)',      label:'Error end',                 bpmn:'EndEvent:Error',               w:44,h:44},
    ee_term:  {cat:'Events (End)',      label:'Terminate end',             bpmn:'EndEvent:Terminate',           w:44,h:44},
    ee_sig:   {cat:'Events (End)',      label:'Signal end',                bpmn:'EndEvent:Signal',              w:44,h:44},
    ee_esc:   {cat:'Events (End)',      label:'Escalation end',            bpmn:'EndEvent:Escalation',          w:44,h:44},
    ee_cmp:   {cat:'Events (End)',      label:'Compensation end',          bpmn:'EndEvent:Compensation',        w:44,h:44},
    ee_cnl:   {cat:'Events (End)',      label:'Cancel end',                bpmn:'EndEvent:Cancel',              w:44,h:44},
    ee_mlt:   {cat:'Events (End)',      label:'Multiple end',              bpmn:'EndEvent:Multiple',            w:44,h:44},
    eb_msg:   {cat:'Boundary Events',  label:'Message boundary',          bpmn:'Boundary:Message',             w:44,h:44},
    eb_tmr:   {cat:'Boundary Events',  label:'Timer boundary',            bpmn:'Boundary:Timer',               w:44,h:44},
    eb_err:   {cat:'Boundary Events',  label:'Error boundary',            bpmn:'Boundary:Error',               w:44,h:44},
    eb_sig:   {cat:'Boundary Events',  label:'Signal boundary',           bpmn:'Boundary:Signal',              w:44,h:44},
    eb_esc:   {cat:'Boundary Events',  label:'Escalation boundary',       bpmn:'Boundary:Escalation',          w:44,h:44},
    eb_cmp:   {cat:'Boundary Events',  label:'Compensation boundary',     bpmn:'Boundary:Compensation',        w:44,h:44},
    eb_cnl:   {cat:'Boundary Events',  label:'Cancel boundary',           bpmn:'Boundary:Cancel',              w:44,h:44},
    eb_cnd:   {cat:'Boundary Events',  label:'Conditional boundary',      bpmn:'Boundary:Conditional',         w:44,h:44},
    pool:     {cat:'Participants',     label:'Pool',                      bpmn:'Pool',                         w:520,h:160},
    lane:     {cat:'Participants',     label:'Lane',                      bpmn:'Lane',                         w:520,h:80},
    data_obj: {cat:'Data',             label:'Data object',               bpmn:'DataObject',                   w:36,h:50},
    data_str: {cat:'Data',             label:'Data store',                bpmn:'DataStore',                    w:54,h:44},
    annot:    {cat:'Artifacts',        label:'Text annotation',           bpmn:'TextAnnotation',               w:120,h:60},
    grp:      {cat:'Artifacts',        label:'Group',                     bpmn:'Group',                        w:200,h:140},
  };

  // ── Helpers ──────────────────────────────────────────────
  const isDark = () => document.documentElement.getAttribute('data-theme')==='dark';
  const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // ── CSS ──────────────────────────────────────────────────
  function _css() {
    if (document.getElementById('bv4css')) return;
    const s = document.createElement('style');
    s.id = 'bv4css';
    s.textContent = `
#bv4{display:flex;flex-direction:column;height:100%;min-height:0;position:relative;font-family:-apple-system,'Segoe UI',system-ui,sans-serif;overflow:hidden}

/* ── Toolbar ── */
#bv4tb{display:flex;align-items:center;gap:2px;padding:0 10px;height:40px;background:var(--bg-1,#fff);border-bottom:1px solid var(--bd,#e4e4e7);flex-shrink:0;z-index:40}
.b4tg{display:flex;align-items:center;gap:1px;padding:0 5px;border-right:1px solid var(--bd,#e4e4e7)}
.b4tg:last-child{border:none;margin-left:auto}
.b4btn{display:flex;align-items:center;justify-content:center;gap:4px;height:28px;min-width:28px;padding:0 7px;border:none;background:transparent;border-radius:5px;cursor:pointer;font-size:12px;font-weight:500;color:var(--tx-2,#52525b);white-space:nowrap;transition:.1s}
.b4btn:hover{background:var(--bg-2,#f4f4f5);color:var(--tx-1,#18181b)}
.b4btn.act{background:#dbeafe;color:#1d4ed8}
.b4btn svg{flex-shrink:0}
.b4save{background:#1d4ed8!important;color:#fff!important;border-radius:5px}
.b4save:hover{background:#1e40af!important}
.b4zl{font-size:11px;font-family:monospace;min-width:40px;text-align:center;color:var(--tx-3,#71717a)}
.b4sep{width:1px;height:20px;background:var(--bd,#e4e4e7);margin:0 3px;flex-shrink:0}
.b4dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.b4dot.saved{background:#22c55e}.b4dot.dirty{background:#f59e0b}.b4dot.saving{background:#3b82f6;animation:b4p 1s infinite}
@keyframes b4p{0%,100%{opacity:1}50%{opacity:.3}}

/* ── Main ── */
#bv4main{display:flex;flex:1;min-height:0;overflow:hidden;position:relative}

/* ── Palette ── */
#bv4pal{
  width:44px;flex-shrink:0;
  background:var(--bg-1,#fff);
  border-right:1px solid var(--bd,#e4e4e7);
  display:flex;flex-direction:column;align-items:center;
  padding:6px 0;gap:1px;overflow-y:auto;z-index:20;user-select:none;
}
#bv4pal::-webkit-scrollbar{width:0}
.b4pi{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:5px;cursor:pointer;border:1.5px solid transparent;transition:.12s;position:relative;flex-shrink:0}
.b4pi:hover{background:var(--bg-2,#f4f4f5);border-color:var(--bd,#d4d4d8)}
.b4pi.act{background:#dbeafe;border-color:#93c5fd}
.b4pi svg{pointer-events:none;overflow:visible}
.b4sep2{width:28px;height:1px;background:var(--bd,#e4e4e7);margin:3px 0;flex-shrink:0}

/* ── Canvas wrap — dot grid always via CSS ── */
#bv4wrap{
  flex:1;min-width:0;position:relative;overflow:hidden;cursor:default;
  background-color:var(--bg-0,#fafafa);
  background-image:radial-gradient(circle, rgba(0,0,0,0.18) 1.2px, transparent 1.2px);
  background-size:20px 20px;
}
[data-theme=dark] #bv4wrap{
  background-color:#1a1a1a;
  background-image:radial-gradient(circle, rgba(255,255,255,0.12) 1.2px, transparent 1.2px);
}

/* ── SVG ocupa tudo, recebe eventos ── */
#bv4svg{
  position:absolute;top:0;left:0;
  width:100%;height:100%;
  overflow:visible;
  /* NÃO usar pointer-events:none aqui */
}

/* ── Node groups — cursor e hover ── */
.b4node{cursor:move}
.b4node:hover .b4port{opacity:1}

/* ── Ports ── */
.b4port{
  fill:#1971c2;stroke:#fff;stroke-width:2;
  cursor:crosshair;opacity:0;transition:opacity .15s;
  pointer-events:all;
}
.b4port.always{opacity:1}

/* ── Floating toolbar ── */
#bv4ftb{
  position:fixed;z-index:200;
  display:none;
  background:var(--bg-1,#fff);
  border:1px solid var(--bd,#d4d4d8);
  border-radius:7px;
  box-shadow:0 4px 18px rgba(0,0,0,.14);
  padding:4px;gap:2px;align-items:center;
  pointer-events:all;
}
#bv4ftb.vis{display:flex}
.ftbtn{width:28px;height:28px;border:none;background:transparent;border-radius:5px;cursor:pointer;color:var(--tx-2,#52525b);display:flex;align-items:center;justify-content:center;transition:.1s;flex-shrink:0}
.ftbtn:hover{background:var(--bg-2,#f0f0f0);color:var(--tx-1,#18181b)}
.ftbtn.red:hover{background:#fef2f2;color:#dc2626}
.ftbtn svg{pointer-events:none}
.ftsep{width:1px;height:18px;background:var(--bd,#e4e4e7);margin:0 2px;flex-shrink:0}

/* ── Create element menu ── */
#bv4menu{
  position:fixed;z-index:500;
  background:var(--bg-1,#fff);
  border:1px solid var(--bd,#e4e4e7);
  border-radius:9px;
  box-shadow:0 10px 36px rgba(0,0,0,.16);
  width:250px;display:none;flex-direction:column;max-height:450px;overflow:hidden;
}
#bv4menu.open{display:flex}
.bm-head{padding:10px 12px 8px;border-bottom:1px solid var(--bd,#f0f0f0)}
.bm-title{font-size:13px;font-weight:700;color:var(--tx-1,#18181b);margin-bottom:7px}
.bm-sw{position:relative}
.bm-sinp{width:100%;padding:6px 10px 6px 30px;border:1.5px solid var(--bd,#d4d4d8);border-radius:6px;font-size:13px;outline:none;background:var(--bg-2,#f9f9f9);color:var(--tx-1,#18181b);box-sizing:border-box}
.bm-sinp:focus{border-color:#93c5fd;background:var(--bg-1,#fff)}
.bm-sico{position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#a1a1aa;pointer-events:none}
.bm-list{overflow-y:auto;flex:1}
.bm-list::-webkit-scrollbar{width:4px}
.bm-list::-webkit-scrollbar-thumb{background:#d4d4d8;border-radius:2px}
.bm-cat{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#a1a1aa;padding:8px 12px 3px}
.bm-item{display:flex;align-items:center;gap:9px;padding:7px 12px;cursor:pointer;font-size:13px;color:var(--tx-1,#374151);transition:.08s}
.bm-item:hover{background:var(--bg-2,#f4f4f5)}
.bm-item svg{flex-shrink:0;overflow:visible}

/* ── Props panel ── */
#bv4props{width:0;flex-shrink:0;background:var(--bg-1,#fff);border-left:1px solid var(--bd,#e4e4e7);overflow:hidden;transition:width .15s;display:flex;flex-direction:column}
#bv4props.open{width:220px}
.pp-head{padding:12px 14px 8px;border-bottom:1px solid var(--bd,#f0f0f0);display:flex;align-items:center;gap:8px}
.pp-title{font-size:12px;font-weight:700;color:var(--tx-1,#18181b);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-close{background:none;border:none;cursor:pointer;color:#a1a1aa;font-size:16px;padding:0;line-height:1}
.pp-body{padding:10px 14px;overflow-y:auto;flex:1}
.pp-bpmn{font-size:9px;padding:2px 6px;background:#dbeafe;color:#1d4ed8;border-radius:4px;font-weight:700;display:inline-block;margin-bottom:10px}
.pp-row{margin-bottom:9px}
.pp-lbl{display:block;font-size:10px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}
.pp-inp{width:100%;padding:5px 8px;border:1.5px solid var(--bd,#e4e4e7);border-radius:5px;font-size:12px;background:var(--bg-2,#f9f9f9);color:var(--tx-1,#18181b);font-family:inherit;outline:none;box-sizing:border-box}
.pp-inp:focus{border-color:#93c5fd;background:var(--bg-1,#fff)}
.pp-del{width:100%;padding:7px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:6px}
.pp-del:hover{background:#fee2e2}
.pp-clrs{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.pp-clr{width:20px;height:20px;border-radius:4px;cursor:pointer;border:2px solid transparent;transition:.1s}
.pp-clr:hover{transform:scale(1.18);border-color:#52525b}

/* ── Status bar ── */
#bv4sb{height:24px;display:flex;align-items:center;gap:8px;padding:0 14px;background:var(--bg-1,#fff);border-top:1px solid var(--bd,#e4e4e7);font-size:11px;color:var(--tx-3,#71717a);flex-shrink:0;font-family:monospace}

/* ── Tooltip ── */
#bv4tt{position:fixed;z-index:9999;background:#18181b;color:#fff;font-size:11px;padding:4px 8px;border-radius:4px;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .1s;transform:translateX(-50%)}
#bv4tt.vis{opacity:1}
    `;
    document.head.appendChild(s);
  }

  // ── SVG shape builder ─────────────────────────────────────
  // Retorna HTML interno de um <g> local (0,0,w,h)
  function _shape(type, w, h, label, fillOvr) {
    const dark = isDark();
    const fill   = fillOvr || (dark ? '#2c2c2c' : '#ffffff');
    const border = dark ? '#bbbbbb' : '#222222';
    const textC  = dark ? '#eeeeee' : '#111111';
    const sw = 1.8;
    // invisible hit rect over entire shape (ensures click registration)
    const hit = `<rect x="0" y="0" width="${w}" height="${h}" fill="transparent" stroke="none" class="b4hitbox"/>`;
    const lbl = (txt,cx,cy,fs=11,dy=0) =>
      `<text x="${cx}" y="${cy+dy}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="${fs}" fill="${textC}" pointer-events="none" style="user-select:none">${_esc(txt)}</text>`;

    // ── Events ──────────────────────────────────────────────
    const isEv = type.startsWith('es_')||type.startsWith('ee_')||type.startsWith('ei_')||type.startsWith('eb_');
    if (isEv) {
      const cx=w/2,cy=h/2, r=Math.min(w,h)/2-2;
      const sc  = type.startsWith('es_') ? (dark?'#2da854':'#1e8a4a') : type.startsWith('ee_') ? '#c0392b' : border;
      const esw = type.startsWith('ee_') ? 3.5 : sw;
      let s = hit;
      s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${sc}" stroke-width="${esw}"/>`;
      if (type.startsWith('ei_')||type.startsWith('eb_'))
        s += `<circle cx="${cx}" cy="${cy}" r="${r-5}" fill="none" stroke="${sc}" stroke-width="1.4"/>`;
      const ms=r*0.44, isThrow=type.includes('_t')||type.startsWith('ee_')||type.startsWith('eb_'), mf=isThrow?sc:'none';
      if      (type.includes('msg')) { s += `<rect x="${cx-ms*1.1}" y="${cy-ms*0.7}" width="${ms*2.2}" height="${ms*1.4}" fill="${mf}" stroke="${sc}" stroke-width="1.2" rx="1"/><path d="M${cx-ms*1.1} ${cy-ms*0.7} L${cx} ${cy+ms*0.2} L${cx+ms*1.1} ${cy-ms*0.7}" fill="none" stroke="${isThrow?fill:sc}" stroke-width="1"/>`; }
      else if (type.includes('tmr')) { s += `<circle cx="${cx}" cy="${cy}" r="${ms*0.88}" fill="none" stroke="${sc}" stroke-width="1.3"/><path d="M${cx} ${cy-ms*0.7} L${cx} ${cy} L${cx+ms*0.5} ${cy+ms*0.35}" fill="none" stroke="${sc}" stroke-width="1.3" stroke-linecap="round"/>`; }
      else if (type.includes('err')) { s += `<path d="M${cx-ms*0.8} ${cy+ms*0.7} L${cx-ms*0.1} ${cy-ms*0.8} L${cx+ms*0.3} ${cy+ms*0.1} L${cx+ms*0.8} ${cy-ms*0.8}" fill="${mf}" stroke="${sc}" stroke-width="1.4" stroke-linejoin="round"/>`; }
      else if (type.includes('sig')) { s += `<polygon points="${cx},${cy-ms} ${cx+ms*0.9},${cy+ms*0.6} ${cx-ms*0.9},${cy+ms*0.6}" fill="${mf}" stroke="${sc}" stroke-width="1.3"/>`; }
      else if (type.includes('term')){  s += `<circle cx="${cx}" cy="${cy}" r="${ms*0.85}" fill="${sc}"/>`; }
      else if (type.includes('esc')) { s += `<path d="M${cx} ${cy-ms} L${cx+ms*0.7} ${cy+ms*0.6} L${cx} ${cy+ms*0.1} L${cx-ms*0.7} ${cy+ms*0.6}Z" fill="${mf}" stroke="${sc}" stroke-width="1.2"/>`; }
      else if (type.includes('cmp')) { s += `<path d="M${cx-ms*0.85} ${cy} L${cx-ms*0.05} ${cy-ms*0.7} L${cx-ms*0.05} ${cy+ms*0.7}Z M${cx+ms*0.1} ${cy} L${cx+ms*0.9} ${cy-ms*0.7} L${cx+ms*0.9} ${cy+ms*0.7}Z" fill="${sc}"/>`; }
      else if (type.includes('cnl')) { s += `<path d="M${cx-ms*0.7} ${cy-ms*0.7} L${cx+ms*0.7} ${cy+ms*0.7} M${cx+ms*0.7} ${cy-ms*0.7} L${cx-ms*0.7} ${cy+ms*0.7}" stroke="${sc}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`; }
      else if (type.includes('cnd')) { s += `<rect x="${cx-ms*0.85}" y="${cy-ms*0.72}" width="${ms*1.7}" height="${ms*1.44}" fill="${mf}" stroke="${sc}" stroke-width="1.2" rx="1"/><path d="M${cx-ms*0.55} ${cy-ms*0.28} L${cx+ms*0.55} ${cy-ms*0.28} M${cx-ms*0.55} ${cy+ms*0.24} L${cx+ms*0.22} ${cy+ms*0.24}" fill="none" stroke="${sc}" stroke-width="1"/>`; }
      else if (type.includes('lnk')) { s += `<path d="M${cx-ms*0.85} ${cy} L${cx+ms*0.4} ${cy} M${cx-ms*0.15} ${cy-ms*0.65} L${cx+ms*0.85} ${cy} L${cx-ms*0.15} ${cy+ms*0.65}" fill="none" stroke="${sc}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`; }
      else if (type.includes('mlt')) { s += `<polygon points="${cx},${cy-ms} ${cx+ms*0.95},${cy-ms*0.31} ${cx+ms*0.59},${cy+ms*0.81} ${cx-ms*0.59},${cy+ms*0.81} ${cx-ms*0.95},${cy-ms*0.31}" fill="${mf}" stroke="${sc}" stroke-width="1.2"/>`; }
      s += lbl(label||'', cx, h+15);
      return s;
    }

    // ── Gateways ────────────────────────────────────────────
    if (type.startsWith('gw_')) {
      const cx=w/2,cy=h/2, ms=Math.min(w,h)*0.2;
      let s = hit;
      s += `<polygon points="${cx},2 ${w-2},${cy} ${cx},${h-2} 2,${cy}" fill="${fill}" stroke="${border}" stroke-width="${sw}"/>`;
      if      (type==='gw_excl') s += `<line x1="${cx-ms}" y1="${cy-ms}" x2="${cx+ms}" y2="${cy+ms}" stroke="${border}" stroke-width="2.4" stroke-linecap="round"/><line x1="${cx+ms}" y1="${cy-ms}" x2="${cx-ms}" y2="${cy+ms}" stroke="${border}" stroke-width="2.4" stroke-linecap="round"/>`;
      else if (type==='gw_par')  s += `<line x1="${cx-ms}" y1="${cy}" x2="${cx+ms}" y2="${cy}" stroke="${border}" stroke-width="2.4" stroke-linecap="round"/><line x1="${cx}" y1="${cy-ms}" x2="${cx}" y2="${cy+ms}" stroke="${border}" stroke-width="2.4" stroke-linecap="round"/>`;
      else if (type==='gw_incl') s += `<circle cx="${cx}" cy="${cy}" r="${ms}" fill="none" stroke="${border}" stroke-width="2.4"/>`;
      else if (type==='gw_evt')  s += `<circle cx="${cx}" cy="${cy}" r="${ms*1.1}" fill="none" stroke="${border}" stroke-width="1.2"/><circle cx="${cx}" cy="${cy}" r="${ms*0.75}" fill="none" stroke="${border}" stroke-width="0.9"/>`;
      else if (type==='gw_cplx') s += `<path d="M${cx-ms} ${cy} L${cx+ms} ${cy} M${cx} ${cy-ms} L${cx} ${cy+ms} M${cx-ms*0.72} ${cy-ms*0.72} L${cx+ms*0.72} ${cy+ms*0.72} M${cx+ms*0.72} ${cy-ms*0.72} L${cx-ms*0.72} ${cy+ms*0.72}" stroke="${border}" stroke-width="2" stroke-linecap="round"/>`;
      s += lbl(label||'', cx, h+15);
      return s;
    }

    // ── Tasks ────────────────────────────────────────────────
    const taskTypes = ['task','task_usr','task_svc','task_snd','task_rcv','task_man','task_biz','task_scr','call_act'];
    if (taskTypes.includes(type)) {
      const sw2 = type==='call_act' ? 4 : sw;
      let s = hit;
      s += `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="8" fill="${fill}" stroke="${border}" stroke-width="${sw2}"/>`;
      const icons = {
        task_usr:`M6 14c0-3 9-3 9 0 M10.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7`,
        task_svc:`M8 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M11 9v1 M11 15v1 M8.4 10.4l.7.7 M13.9 13.9l.7.7 M8 12H7 M15 12h-1 M8.4 13.6l.7-.7 M13.9 10.1l.7-.7`,
        task_snd:`M4 7h14v9H4z M4 7l7 6 7-6`,
        task_rcv:`M4 7h14v9H4z M4 7l7 6 7-6`,
        task_man:`M4 12c0-2 2.5-3 4.5-2h5c2 0 3 2.5 1 3H8`,
        task_biz:`M4 6h14v11H4z M4 6h14l-7 5.5z`,
        task_scr:`M5 4h12v16H5z M7 9h8 M7 12h8 M7 15h5`,
      };
      if (icons[type]) s += `<g transform="translate(5,5)"><path d="${icons[type]}" fill="none" stroke="${dark?'#aaa':'#666'}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      s += lbl(label||REG[type]?.label||'Task', w/2, h/2+2, 13);
      return s;
    }

    // ── Sub-processes ────────────────────────────────────────
    const subTypes = ['sp_coll','sp_exp','tx_sub','ev_sub','adhoc_c','adhoc_e'];
    if (subTypes.includes(type)) {
      const sw2=sw, isDashed=type==='ev_sub', isTx=type==='tx_sub', isAdhoc=type.startsWith('adhoc');
      let s = hit;
      s += `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="8" fill="${fill}" stroke="${border}" stroke-width="${sw2}"${isDashed?' stroke-dasharray="5 3"':''}/>`;
      if (isTx) s += `<rect x="5" y="5" width="${w-10}" height="${h-10}" rx="5" fill="none" stroke="${border}" stroke-width="1.3"/>`;
      // Plus marker
      const px=w/2, py=h-14, ms=7;
      s += `<rect x="${px-ms-1}" y="${py-ms-1}" width="${ms*2+2}" height="${ms*2+2}" rx="2" fill="${fill}" stroke="${border}" stroke-width="1.2"/>`;
      s += `<line x1="${px-ms+2}" y1="${py}" x2="${px+ms-2}" y2="${py}" stroke="${border}" stroke-width="1.5" stroke-linecap="round"/>`;
      s += `<line x1="${px}" y1="${py-ms+2}" x2="${px}" y2="${py+ms-2}" stroke="${border}" stroke-width="1.5" stroke-linecap="round"/>`;
      if (isAdhoc) s += `<text x="${px}" y="${py-ms-6}" text-anchor="middle" dominant-baseline="central" font-size="16" fill="${border}" pointer-events="none">~</text>`;
      s += lbl(label||REG[type]?.label||'Sub', w/2, h/2-8, 13);
      return s;
    }

    // ── Data Object ──────────────────────────────────────────
    if (type==='data_obj') {
      const cr=w*0.28;
      return `${hit}<path d="M1 1 L${w-cr} 1 L${w-1} ${cr+1} L${w-1} ${h-1} L1 ${h-1}Z" fill="${fill}" stroke="${border}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M${w-cr} 1 L${w-cr} ${cr+1} L${w-1} ${cr+1}" fill="none" stroke="${border}" stroke-width="1.3"/>${lbl(label||'', w/2, h+15)}`;
    }
    // ── Data Store ───────────────────────────────────────────
    if (type==='data_str') {
      const ry=Math.max(7,h*0.22), rx2=w/2-1;
      return `${hit}<rect x="1" y="${ry}" width="${w-2}" height="${h-ry-1}" fill="${fill}" stroke="${border}" stroke-width="${sw}"/><ellipse cx="${w/2}" cy="${ry}" rx="${rx2}" ry="${ry}" fill="${fill}" stroke="${border}" stroke-width="${sw}"/><ellipse cx="${w/2}" cy="${h-1}" rx="${rx2}" ry="${ry}" fill="${dark?'#333':'#f0f0f0'}" stroke="${border}" stroke-width="${sw}"/>${lbl(label||'', w/2, h+15)}`;
    }
    // ── Pool ─────────────────────────────────────────────────
    if (type==='pool') {
      const hw=32;
      return `${hit}<rect x="0" y="0" width="${w}" height="${h}" fill="${fill}" stroke="${border}" stroke-width="${sw}"/><rect x="0" y="0" width="${hw}" height="${h}" fill="${dark?'#333':'#f0f0f0'}" stroke="${border}" stroke-width="${sw}"/><text x="${hw/2}" y="${h/2}" text-anchor="middle" dominant-baseline="central" transform="rotate(-90,${hw/2},${h/2})" font-family="system-ui,sans-serif" font-size="12" fill="${textC}" pointer-events="none" style="user-select:none">${_esc(label||'Pool')}</text>`;
    }
    if (type==='lane') {
      return `${hit}<rect x="0" y="0" width="${w}" height="${h}" fill="${fill}" stroke="${border}" stroke-width="${sw}"/><line x1="0" y1="26" x2="${w}" y2="26" stroke="${border}" stroke-width="1"/><text x="${w/2}" y="13" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="11" fill="${textC}" pointer-events="none" style="user-select:none">${_esc(label||'Lane')}</text>`;
    }
    // ── Annotation ───────────────────────────────────────────
    if (type==='annot') {
      return `${hit}<path d="M${w*0.28} 4 L4 4 L4 ${h-4} L${w*0.28} ${h-4}" fill="none" stroke="${border}" stroke-width="${sw}" stroke-linecap="round"/><text x="${w*0.34}" y="${h/2}" text-anchor="start" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="12" fill="${textC}" pointer-events="none" style="user-select:none">${_esc(label||'Note')}</text>`;
    }
    // ── Group ────────────────────────────────────────────────
    if (type==='grp') {
      return `${hit}<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="6" fill="rgba(0,0,0,0.01)" stroke="${dark?'#888':'#aaa'}" stroke-width="1.6" stroke-dasharray="6 4"/>${lbl(label||'Group', w/2, 14)}`;
    }
    // ── Fallback ─────────────────────────────────────────────
    return `${hit}<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="8" fill="${fill}" stroke="${border}" stroke-width="${sw}"/>${lbl(label||type, w/2, h/2, 12)}`;
  }

  // ── Render ─────────────────────────────────────────────────
  function _render() {
    if (!_svgEl) return;
    const dark = isDark();
    const bc = dark ? '#aaa' : '#333';
    const arrowM = `<marker id="bvarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="${bc}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker>
      <marker id="bvarrb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#1971c2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker>`;

    let edgesHtml = '', nodesHtml = '';

    // Edges
    _edges.forEach(e => {
      const src=_nodes.find(n=>n.id===e.src), tgt=_nodes.find(n=>n.id===e.tgt);
      if (!src||!tgt) return;
      const [x1,y1]=_port(src,'right'), [x2,y2]=_port(tgt,'left');
      const mx=(x1+x2)/2;
      const d = Math.abs(y1-y2)<8 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x2} ${y2}`;
      const isSel = e.id===_selEdge;
      edgesHtml += `<path data-eid="${e.id}" d="${d}" fill="none" stroke="${isSel?'#1971c2':bc}" stroke-width="${isSel?2.2:1.6}" marker-end="url(#bvarr)" style="cursor:pointer;pointer-events:stroke" stroke-linecap="round"/>`;
      if (e.label) edgesHtml += `<text x="${mx}" y="${(y1+y2)/2-8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${dark?'#bbb':'#555'}" pointer-events="none">${_esc(e.label)}</text>`;
    });

    // Connection preview
    if (_conn) edgesHtml += `<line x1="${_conn.x1}" y1="${_conn.y1}" x2="${_conn.x2}" y2="${_conn.y2}" stroke="#1971c2" stroke-width="1.8" stroke-dasharray="5 3" marker-end="url(#bvarrb)" pointer-events="none"/>`;

    // Nodes
    _nodes.forEach(n => {
      const isSel = n.id===_sel;
      const portsHtml = [[n.w/2,0,'top'],[n.w/2,n.h,'bottom'],[0,n.h/2,'left'],[n.w,n.h/2,'right']].map(([px,py,dir]) =>
        `<circle class="b4port${isSel?' always':''}" cx="${px}" cy="${py}" r="5" data-port="${dir}" data-nid="${n.id}"/>`).join('');

      let selRing = '';
      if (isSel) {
        if (n.type.startsWith('es_')||n.type.startsWith('ee_')||n.type.startsWith('ei_')||n.type.startsWith('eb_'))
          selRing = `<circle cx="${n.w/2}" cy="${n.h/2}" r="${Math.min(n.w,n.h)/2+3}" fill="none" stroke="#1971c2" stroke-width="2.5" pointer-events="none"/>`;
        else if (n.type.startsWith('gw_'))
          selRing = `<polygon points="${n.w/2},-3 ${n.w+3},${n.h/2} ${n.w/2},${n.h+3} -3,${n.h/2}" fill="none" stroke="#1971c2" stroke-width="2.5" pointer-events="none"/>`;
        else
          selRing = `<rect x="-3" y="-3" width="${n.w+6}" height="${n.h+6}" rx="10" fill="none" stroke="#1971c2" stroke-width="2.5" pointer-events="none"/>`;
      }

      nodesHtml += `<g class="b4node" transform="translate(${n.x},${n.y})" data-nid="${n.id}">
        ${_shape(n.type, n.w, n.h, n.label, n.fill)}
        ${selRing}
        ${portsHtml}
      </g>`;
    });

    _svgEl.innerHTML = `<defs>${arrowM}</defs>
      <rect width="100%" height="100%" fill="transparent" id="bv4bg"/>
      <g id="bv4vp" transform="translate(${_pan.x},${_pan.y}) scale(${_zoom})">
        ${edgesHtml}
        ${nodesHtml}
      </g>`;

    // Bind events — SVG elements directly
    _svgEl.querySelector('#bv4bg')?.addEventListener('mousedown', _bgMD);
    _svgEl.querySelectorAll('.b4node').forEach(g => {
      g.addEventListener('mousedown', _nodeMD);
    });
    _svgEl.querySelectorAll('.b4port').forEach(c => {
      c.addEventListener('mousedown', _portMD);
    });
    _svgEl.querySelectorAll('[data-eid]').forEach(p => {
      p.addEventListener('click', e => { e.stopPropagation(); _selEdge=p.dataset.eid; _sel=null; _render(); });
    });
    _moveFTB();
    _updateStat();
  }

  function _port(n,dir) {
    return {top:[n.x+n.w/2,n.y],bottom:[n.x+n.w/2,n.y+n.h],left:[n.x,n.y+n.h/2],right:[n.x+n.w,n.y+n.h/2]}[dir]||[n.x+n.w/2,n.y+n.h/2];
  }

  // ── Coord transform ─────────────────────────────────────
  function _sc(sx,sy) {
    const r=document.getElementById('bv4wrap')?.getBoundingClientRect()||{left:0,top:0};
    return [(sx-r.left-_pan.x)/_zoom, (sy-r.top-_pan.y)/_zoom];
  }
  function _nodeAt(cx,cy) {
    return _nodes.slice().reverse().find(n=>cx>=n.x&&cx<=n.x+n.w&&cy>=n.y&&cy<=n.y+n.h)||null;
  }

  // ── Mouse handlers ──────────────────────────────────────
  function _bgMD(e) {
    if (e.button===1||(e.button===0&&e.altKey)) { _panning={lx:e.clientX,ly:e.clientY}; e.preventDefault(); return; }
    if (e.button!==0) return;
    const [cx,cy]=_sc(e.clientX,e.clientY);
    if (_tool!=='select'&&_tool!=='pan'&&REG[_tool]) { _addNode(_tool,cx,cy); _setTool('select'); return; }
    _sel=null; _selEdge=null; _render(); _closeProps();
  }
  function _bgMM(e) {
    if (_panning) { _pan.x+=e.clientX-_panning.lx; _pan.y+=e.clientY-_panning.ly; _panning.lx=e.clientX; _panning.ly=e.clientY; _render(); return; }
    if (_drag) { const[cx,cy]=_sc(e.clientX,e.clientY); _drag.n.x=Math.round(cx-_drag.ox); _drag.n.y=Math.round(cy-_drag.oy); _render(); return; }
    if (_conn) { const[cx,cy]=_sc(e.clientX,e.clientY); _conn.x2=cx; _conn.y2=cy; _render(); }
  }
  function _bgMU(e) {
    if (_panning) { _panning=null; return; }
    if (_drag) { _push(); _markDirty(); _drag=null; _render(); return; }
    if (_conn) {
      const[cx,cy]=_sc(e.clientX,e.clientY);
      const tgt=_nodeAt(cx,cy);
      if (tgt&&tgt.id!==_conn.srcId) { _edges.push({id:'e'+Date.now()+Math.random().toString(36).slice(2),src:_conn.srcId,tgt:tgt.id,label:''}); _push(); _markDirty(); }
      _conn=null; _render();
    }
  }

  function _nodeMD(e) {
    if (e.button!==0) return;
    e.stopPropagation();
    const nid=e.currentTarget.dataset.nid; if(!nid)return;
    const n=_nodes.find(n=>n.id===nid); if(!n)return;
    _sel=nid; _selEdge=null;
    const[cx,cy]=_sc(e.clientX,e.clientY);
    _drag={n, ox:cx-n.x, oy:cy-n.y};
    _render();
    _showProps(n);
  }

  function _portMD(e) {
    if (e.button!==0) return;
    e.stopPropagation(); e.preventDefault();
    const nid=e.currentTarget.dataset.nid;
    const n=_nodes.find(n=>n.id===nid); if(!n)return;
    const portDir=e.currentTarget.dataset.port;
    const[px,py]=_port(n,portDir);
    _conn={srcId:nid, x1:px, y1:py, x2:px, y2:py};
    _drag=null;
  }

  function _wrapWheel(e) {
    e.preventDefault();
    const wrap=document.getElementById('bv4wrap');
    const r=wrap.getBoundingClientRect();
    const mx=e.clientX-r.left, my=e.clientY-r.top;
    const f=e.deltaY>0?0.92:1.09;
    const nz=Math.max(0.06,Math.min(12,_zoom*f));
    _pan.x=mx-(mx-_pan.x)*(nz/_zoom);
    _pan.y=my-(my-_pan.y)*(nz/_zoom);
    _zoom=nz; _render(); _zlbl();
  }

  // ── Floating toolbar ────────────────────────────────────
  function _buildFTB() {
    const ftb=document.getElementById('bv4ftb'); if(!ftb)return;
    const ico=(path,vb='0 0 24 24') => `<svg width="16" height="16" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    // Quick-connect buttons: add connected element
    const QC = [
      {type:'es_none', svg:`<circle cx="9" cy="9" r="8" stroke="#1e8a4a" stroke-width="1.8" fill="none"/>`, title:'Adicionar Start Event'},
      {type:'gw_excl', svg:`<polygon points="9,1 17,9 9,17 1,9" stroke="#333" stroke-width="1.8" fill="none"/><line x1="6" y1="6" x2="12" y2="12" stroke="#333" stroke-width="1.8"/><line x1="12" y1="6" x2="6" y2="12" stroke="#333" stroke-width="1.8"/>`, title:'Adicionar XOR Gateway'},
      {type:'task',    svg:`<rect x="1" y="3" width="16" height="12" rx="3" stroke="#333" stroke-width="1.8" fill="none"/>`, title:'Adicionar Task'},
      {type:'ee_none', svg:`<circle cx="9" cy="9" r="8" stroke="#c0392b" stroke-width="3" fill="none"/>`, title:'Adicionar End Event'},
    ];
    ftb.innerHTML = QC.map(q=>`<button class="ftbtn" data-qt="${q.type}" title="${q.title}"><svg width="18" height="18" viewBox="0 0 18 18">${q.svg}</svg></button>`).join('')+
      `<div class="ftsep"></div>
      <button class="ftbtn" id="ftb-dup" title="Duplicar">${ico('<rect x="6" y="6" width="10" height="10" rx="2"/><path d="M2 12V3a1 1 0 011-1h9"/>')}</button>
      <button class="ftbtn red" id="ftb-del" title="Apagar (Del)">${ico('<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>','0 0 24 24')}</button>`;
    ftb.querySelectorAll('[data-qt]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const src=_nodes.find(n=>n.id===_sel); if(!src)return;
        const reg=REG[btn.dataset.qt]||REG.task;
        const nid=_addNodeObj(btn.dataset.qt, src.x+src.w+90, src.y+src.h/2-reg.h/2);
        _edges.push({id:'e'+Date.now(),src:src.id,tgt:nid,label:''});
        _push(); _markDirty(); _render();
      });
    });
    document.getElementById('ftb-dup')?.addEventListener('click',e=>{e.stopPropagation();duplicateSelected();});
    document.getElementById('ftb-del')?.addEventListener('click',e=>{e.stopPropagation();deleteSelected();});
  }

  function _moveFTB() {
    const ftb=document.getElementById('bv4ftb'); if(!ftb)return;
    if (!_sel) { ftb.classList.remove('vis'); return; }
    const n=_nodes.find(n=>n.id===_sel); if(!n){ftb.classList.remove('vis');return;}
    const wrap=document.getElementById('bv4wrap'); if(!wrap)return;
    const wr=wrap.getBoundingClientRect();
    ftb.style.left=(wr.left + n.x*_zoom + _pan.x + (n.w*_zoom/2))+'px';
    ftb.style.top =(wr.top  + n.y*_zoom + _pan.y - 46)+'px';
    ftb.style.transform='translateX(-50%)';
    ftb.classList.add('vis');
  }

  // ── Create-element menu ─────────────────────────────────
  let _menuPos={x:200,y:200};

  function _buildMenu() {
    const menu=document.getElementById('bv4menu'); if(!menu)return;
    const inp=document.getElementById('bvm-sinp'), list=document.getElementById('bvm-list');
    function render(q='') {
      const cats={};
      Object.entries(REG).forEach(([t,r])=>{
        if(q&&!r.label.toLowerCase().includes(q)&&!r.cat.toLowerCase().includes(q))return;
        (cats[r.cat]=cats[r.cat]||[]).push({t,...r});
      });
      list.innerHTML=Object.entries(cats).map(([cat,items])=>
        `<div class="bm-cat">${cat}</div>`+items.map(it=>
          `<div class="bm-item" data-type="${it.t}">
            <svg width="20" height="20" viewBox="0 0 20 20">${_menuIco(it.t)}</svg>
            <span>${it.label}</span>
          </div>`).join('')).join('');
      list.querySelectorAll('.bm-item').forEach(el=>el.addEventListener('click',()=>{ _closeMenu(); _addNode(el.dataset.type,_menuPos.x,_menuPos.y); }));
    }
    render();
    inp?.addEventListener('input',e=>render(e.target.value.toLowerCase().trim()));
  }

  function _menuIco(t) {
    if (t.startsWith('es_')) return `<circle cx="10" cy="10" r="8.5" fill="none" stroke="#1e8a4a" stroke-width="1.8"/>`;
    if (t.startsWith('ee_')) return `<circle cx="10" cy="10" r="8.5" fill="none" stroke="#c0392b" stroke-width="3"/>`;
    if (t.startsWith('ei_')||t.startsWith('eb_')) return `<circle cx="10" cy="10" r="8.5" fill="none" stroke="#555" stroke-width="1.8"/><circle cx="10" cy="10" r="5.5" fill="none" stroke="#555" stroke-width="1.2"/>`;
    if (t.startsWith('gw_')) return `<polygon points="10,1 19,10 10,19 1,10" fill="none" stroke="#333" stroke-width="1.8"/>`;
    if (t==='pool'||t==='lane') return `<rect x="1" y="3" width="4" height="14" fill="#e0e0e0" stroke="#555" stroke-width="1.3"/><rect x="5" y="3" width="14" height="14" fill="none" stroke="#555" stroke-width="1.3"/>`;
    if (t==='data_obj') return `<path d="M3 1h9l5 4v14H3V1z" fill="none" stroke="#555" stroke-width="1.5"/><path d="M12 1v4h5" fill="none" stroke="#555" stroke-width="1.2"/>`;
    if (t==='data_str') return `<ellipse cx="10" cy="5.5" rx="8" ry="3" fill="none" stroke="#555" stroke-width="1.5"/><path d="M2 5.5v10c0 1.7 3.6 3 8 3s8-1.3 8-3v-10" fill="none" stroke="#555" stroke-width="1.5"/>`;
    if (t==='annot') return `<path d="M7 2H3v16h4" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round"/>`;
    if (t==='grp')   return `<rect x="1" y="1" width="18" height="18" rx="3" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="4 2"/>`;
    return `<rect x="1" y="4" width="18" height="12" rx="3" fill="none" stroke="#555" stroke-width="1.8"/>`;
  }

  function _openMenu(cx,cy,canCx,canCy) {
    const menu=document.getElementById('bv4menu'); if(!menu)return;
    _menuPos={x:canCx,y:canCy};
    menu.style.left=Math.min(cx,window.innerWidth-256)+'px';
    menu.style.top=Math.min(cy,window.innerHeight-460)+'px';
    menu.classList.add('open');
    const inp=document.getElementById('bvm-sinp');
    if(inp){inp.value='';inp.focus();inp.dispatchEvent(new Event('input'));}
    document.getElementById('bvm-list')?.scrollTo(0,0);
    setTimeout(()=>document.addEventListener('pointerdown',_menuOut,{once:true,capture:true}),0);
  }
  function _menuOut(e){if(!document.getElementById('bv4menu')?.contains(e.target))_closeMenu();}
  function _closeMenu(){document.getElementById('bv4menu')?.classList.remove('open');}

  // ── Props panel ─────────────────────────────────────────
  function _showProps(n) {
    const panel=document.getElementById('bv4props'), title=document.getElementById('pp-title'), body=document.getElementById('pp-body');
    if(!panel||!title||!body)return;
    panel.classList.add('open');
    title.textContent=n.label||REG[n.type]?.label||n.type;
    const reg=REG[n.type]||{};
    const clrs=['#fff','#dbeafe','#d1fae5','#fce7f3','#fef9c3','#fee2e2','#ede9fe','#f1f5f9','#ffedd5'].map(c=>
      `<div class="pp-clr" style="background:${c};border-color:${c===n.fill?'#1971c2':'#d4d4d8'}" data-clr="${c}"></div>`).join('');
    body.innerHTML=`${reg.bpmn?`<span class="pp-bpmn">${reg.bpmn}</span>`:''}<div class="pp-row"><label class="pp-lbl">Label</label><input class="pp-inp" id="pp-lbl" value="${_esc(n.label||'')}"></div><div class="pp-row"><label class="pp-lbl">Largura</label><input class="pp-inp" id="pp-w" type="number" value="${n.w}" style="width:65px"> px</div><div class="pp-row"><label class="pp-lbl">Altura</label><input class="pp-inp" id="pp-h" type="number" value="${n.h}" style="width:65px"> px</div><div class="pp-row"><label class="pp-lbl">Cor de fundo</label><div class="pp-clrs">${clrs}<input type="color" id="pp-clr" style="width:20px;height:20px;border:none;cursor:pointer;padding:0;border-radius:3px" value="${n.fill||'#ffffff'}"></div></div><button class="pp-del" onclick="DiagramEngineV9.deleteSelected()">🗑 Remover</button>`;
    setTimeout(()=>{
      document.getElementById('pp-lbl')?.addEventListener('input',e=>{n.label=e.target.value;_render();title.textContent=n.label;_markDirty();});
      document.getElementById('pp-w')?.addEventListener('change',e=>{n.w=Math.max(20,parseInt(e.target.value)||n.w);_render();_push();_markDirty();});
      document.getElementById('pp-h')?.addEventListener('change',e=>{n.h=Math.max(20,parseInt(e.target.value)||n.h);_render();_push();_markDirty();});
      document.getElementById('pp-clr')?.addEventListener('input',e=>{n.fill=e.target.value;_render();_markDirty();});
      body.querySelectorAll('[data-clr]').forEach(c=>c.addEventListener('click',()=>{n.fill=c.dataset.clr;_render();_markDirty();}));
    },0);
  }
  function _closeProps(){document.getElementById('bv4props')?.classList.remove('open');}

  // ── Nodes ───────────────────────────────────────────────
  function _addNodeObj(type,x,y,w,h,label) {
    const reg=REG[type]||REG.task;
    const id='n'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    const node={id,type,x:Math.round(x),y:Math.round(y),w:w||reg.w,h:h||reg.h,label:label||reg.label,bpmn:reg.bpmn,fill:null};
    _nodes.push(node); return id;
  }
  function _addNode(type,cx,cy) {
    const reg=REG[type]||REG.task;
    const id=_addNodeObj(type,cx-reg.w/2,cy-reg.h/2);
    _sel=id; _selEdge=null; _push(); _markDirty(); _render();
    const n=_nodes.find(n=>n.id===id); if(n)_showProps(n);
    return id;
  }
  function deleteSelected() {
    if(!_sel)return;
    _nodes=_nodes.filter(n=>n.id!==_sel);
    _edges=_edges.filter(e=>e.src!==_sel&&e.tgt!==_sel);
    _sel=null; _selEdge=null; _closeProps(); _push(); _markDirty(); _render();
    showToast('Elemento removido');
  }
  function duplicateSelected() {
    if(!_sel)return;
    const src=_nodes.find(n=>n.id===_sel); if(!src)return;
    const id=_addNodeObj(src.type,src.x+24,src.y+24,src.w,src.h,src.label);
    _nodes.find(n=>n.id===id).fill=src.fill;
    _sel=id; _push(); _markDirty(); _render();
  }

  // ── Tool ────────────────────────────────────────────────
  function _setTool(t) {
    _tool=t;
    document.querySelectorAll('.b4pi').forEach(p=>p.classList.remove('act'));
    document.querySelector(`.b4pi[data-type="${t}"]`)?.classList.add('act');
    const el=document.getElementById('bv4tool');
    const wrap=document.getElementById('bv4wrap');
    if(wrap)wrap.style.cursor=t==='pan'?'grab':t==='select'?'default':'crosshair';
    if(el)el.textContent=t==='select'?'🖱 Selecionar':t==='pan'?'✋ Pan':(REG[t]?.label||t);
  }

  // ── Zoom / Fit ──────────────────────────────────────────
  function _zlbl(){const el=document.getElementById('bv4zl');if(el)el.textContent=Math.round(_zoom*100)+'%';}
  function fitView(){
    if(!_svgEl||!_nodes.length){_zoom=1;_pan={x:60,y:60};_render();_zlbl();return;}
    const wrap=document.getElementById('bv4wrap');if(!wrap)return;
    const wr=wrap.getBoundingClientRect();
    let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
    _nodes.forEach(n=>{x1=Math.min(x1,n.x);y1=Math.min(y1,n.y);x2=Math.max(x2,n.x+n.w);y2=Math.max(y2,n.y+n.h);});
    const pad=80,bw=x2-x1+pad*2,bh=y2-y1+pad*2;
    _zoom=Math.min(10,Math.max(0.08,Math.min(wr.width/bw,wr.height/bh)*0.9));
    _pan.x=(wr.width-bw*_zoom)/2-x1*_zoom+pad*_zoom;
    _pan.y=(wr.height-bh*_zoom)/2-y1*_zoom+pad*_zoom;
    _render();_zlbl();
  }
  function autoLayout(){
    if(!_nodes.length)return;
    const PAD=80,XS=200,YS=110;
    const starts=_nodes.filter(n=>n.type.startsWith('es_'));
    const ends=_nodes.filter(n=>n.type.startsWith('ee_'));
    const rest=_nodes.filter(n=>!starts.includes(n)&&!ends.includes(n));
    [...starts,...rest,...ends].forEach((n,i)=>{n.x=PAD+Math.floor(i/(Math.ceil(Math.sqrt(_nodes.length))))*XS;n.y=PAD+(i%Math.ceil(Math.sqrt(_nodes.length)))*YS;});
    _push();_markDirty();fitView();showToast('Layout aplicado');
  }

  // ── History ─────────────────────────────────────────────
  function _push(){const s=JSON.stringify({nodes:_nodes,edges:_edges});_hist=_hist.slice(0,_histIdx+1);_hist.push(s);if(_hist.length>MAXHIST)_hist.shift();_histIdx=_hist.length-1;}
  function undo(){if(_histIdx<=0){showToast('Nada para desfazer');return;}_histIdx--;const d=JSON.parse(_hist[_histIdx]);_nodes=[...d.nodes];_edges=[...d.edges];_sel=null;_render();}
  function redo(){if(_histIdx>=_hist.length-1){showToast('Nada para refazer');return;}_histIdx++;const d=JSON.parse(_hist[_histIdx]);_nodes=[...d.nodes];_edges=[...d.edges];_sel=null;_render();}

  // ── Save / Load ─────────────────────────────────────────
  function _markDirty(){_dirty=true;_sv('dirty');clearTimeout(_saveTimer);_saveTimer=setTimeout(()=>{if(_dirty)save(true);},2500);}
  function _sv(s){const d=document.getElementById('bv4dot'),l=document.getElementById('bv4sl');if(d)d.className='b4dot '+s;if(l)l.textContent={saved:'Salvo',dirty:'Não salvo',saving:'Salvando…'}[s]||s;}
  async function save(silent=false){
    if(!_pid){if(!silent)showToast('Selecione um projeto',true);return;}
    const btn=document.getElementById('bv4save');if(btn)btn.disabled=true;
    _sv('saving');
    try{
      const data={nodes:_nodes,edges:_edges,zoom:_zoom,pan:_pan,pid:_pid,taskId:_taskId,v:4,savedAt:new Date().toISOString()};
      try{localStorage.setItem('pf_dg_v10_'+_pid,JSON.stringify(data));}catch(e){}
      if(window.PF?.supabase&&!window.PF?.demoMode){
        await ( _taskId ? PF.supabase.from('project_diagrams').update({is_current:false}).eq('project_id',_pid).eq('task_id',_taskId).eq('is_current',true) : PF.supabase.from('project_diagrams').update({is_current:false}).eq('project_id',_pid).is('task_id',null).eq('is_current',true) );
        const{data:ex}=await ( _taskId ? PF.supabase.from('project_diagrams').select('id').eq('project_id',_pid).eq('task_id',_taskId).eq('is_current',true).limit(1) : PF.supabase.from('project_diagrams').select('id').eq('project_id',_pid).is('task_id',null).eq('is_current',true).limit(1) );
        const pl={content_json:data,updated_at:new Date().toISOString()};
        if(ex?.length)await PF.supabase.from('project_diagrams').update(pl).eq('id',ex[0].id);
        else await PF.supabase.from('project_diagrams').insert({project_id:_pid,task_id:_taskId||null,name:'Diagrama BPMN',is_current:true,content_json:data,generated_from:'manual',created_by:PF.user?.id||null});
      }
      _dirty=false;_sv('saved');if(!silent)showToast('Salvo ✓','ok');
    }catch(err){
      _sv('dirty');
      if(err?.message?.includes('fetch')||err?.message?.includes('ERR_NAME')){_dirty=false;_sv('saved');if(!silent)showToast('Salvo localmente');}
      else if(!silent)showToast('Erro: '+(err?.message||err),true);
    }finally{if(btn)btn.disabled=false;}
  }
  async function _load(){
    let data=null;
    if(window.PF?.supabase&&!window.PF?.demoMode&&_pid){
      try{
        let q = PF.supabase.from('project_diagrams').select('content_json').eq('project_id',_pid).eq('is_current',true);
        if (_taskId) q = q.eq('task_id', _taskId);
        else q = q.is('task_id', null);
        const{data:rows}=await q.limit(1);
        if(rows?.[0]?.content_json)data=rows[0].content_json;
      }catch(e){}
    }
    if(!data){try{data=JSON.parse(localStorage.getItem('pf_dg_v10_'+_pid)||'null');}catch(e){}}
    if(!data)return;
    _nodes=data.nodes||[];_edges=data.edges||[];
    if(data.zoom)_zoom=data.zoom;if(data.pan)_pan={...data.pan};
    _hist=[JSON.stringify({nodes:_nodes,edges:_edges})];_histIdx=0;_dirty=false;_sv('saved');
  }

  function exportSVG(){
    if(!_svgEl)return;
    let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
    _nodes.forEach(n=>{x1=Math.min(x1,n.x-10);y1=Math.min(y1,n.y-10);x2=Math.max(x2,n.x+n.w+30);y2=Math.max(y2,n.y+n.h+30);});
    if(!_nodes.length){x1=0;y1=0;x2=800;y2=600;}
    const W=x2-x1,H=y2-y1;
    const tmp=document.createElementNS('http://www.w3.org/2000/svg','svg');
    tmp.setAttribute('xmlns','http://www.w3.org/2000/svg');
    tmp.setAttribute('width',W);tmp.setAttribute('height',H);
    tmp.setAttribute('viewBox',`${x1} ${y1} ${W} ${H}`);
    tmp.setAttribute('style','background:#fff');
    // Clone viewport group at scale 1
    const vp=_svgEl.querySelector('#bv4vp');
    if(vp){const cl=vp.cloneNode(true);cl.setAttribute('transform','');tmp.appendChild(cl);}
    const blob=new Blob([tmp.outerHTML],{type:'image/svg+xml'});
    Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`bpmn-${_pid||'diagram'}.svg`}).click();
    showToast('SVG exportado!');
  }

  function generateFromProject(pid){
    const tp=pid||_pid||PF?.currentProject;if(!tp)return;
    const sm={esbocar:'es_none',viabilizar:'task',atribuir:'task_usr',executar:'task_svc',avaliar:'gw_excl',corrigir:'task_man',validar_cliente:'task_usr',concluido:'ee_none',todo:'task',doing:'task_usr',done:'ee_none',blocked:'eb_err',review:'gw_excl'};
    const cards=(PFBoard?.cards?.length?PFBoard.cards:(window.mockCards||[])).filter(c=>(c.project_id||c.sl)===tp);
    if(!cards.length){showToast('Sem tarefas',true);return;}
    _nodes=[];_edges=[];_sel=null;
    const ORDER=['esbocar','viabilizar','atribuir','executar','avaliar','corrigir','validar_cliente','concluido','todo','doing','review','done','blocked'];
    const byB={};cards.forEach(c=>{const b=c.bpmn||c.bpmn_status||c.status||'executar';(byB[b]=byB[b]||[]).push(c);});
    let xi=80,prevIds=[];
    ORDER.forEach(b=>{
      const g=byB[b];if(!g?.length)return;
      const type=sm[b]||'task',reg=REG[type]||REG.task;
      let yi=80;const curIds=[];
      g.forEach(c=>{
        const title=(c.title||'').slice(0,26)+((c.title||'').length>26?'…':'');
        const id=_addNodeObj(type,xi,yi,reg.w,reg.h,title);
        curIds.push(id);
        if(prevIds.length)prevIds.forEach(pid2=>_edges.push({id:'e'+Date.now()+Math.random(),src:pid2,tgt:id,label:''}));
        yi+=reg.h+70;
      });
      prevIds=curIds;xi+=reg.w+100;
    });
    _push();_markDirty();setTimeout(fitView,50);
    showToast('Diagrama gerado com '+cards.length+' elementos');
  }

  // ── Stat ────────────────────────────────────────────────
  function _updateStat(){const el=document.getElementById('bv4stat');if(el)el.textContent=`${_nodes.length} elementos · ${_edges.length} conexões`;}

  // ── Import Diagram ───────────────────────────────────────
  async function _importDiagramFromCode() {
    const code = document.getElementById('bv4imp-code')?.value?.trim();
    if(!code) { showToast('Código vazio', true); return; }
    document.getElementById('bv4imp-modal').style.display='none';
    
    // Draw.io XML
    if(code.startsWith('<mxfile') || code.startsWith('<mxGraphModel')) {
      _parseDrawio(code);
      return;
    }
    // Mermaid / text
    _parseWithAI(code);
  }

  function _parseDrawio(xml) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      const cells = doc.querySelectorAll("mxCell");
      _nodes = []; _edges = []; _sel = null; _selEdge = null;
      
      const idMap = {};
      
      cells.forEach(c => {
        const id = c.getAttribute("id");
        if(id==="0" || id==="1") return;
        const isEdge = c.getAttribute("edge") === "1";
        const isVertex = c.getAttribute("vertex") === "1";
        
        if (isVertex) {
          const geo = c.querySelector("mxGeometry");
          if(!geo) return;
          const x = parseFloat(geo.getAttribute("x")||"0");
          const y = parseFloat(geo.getAttribute("y")||"0");
          const w = parseFloat(geo.getAttribute("width")||"120");
          const h = parseFloat(geo.getAttribute("height")||"80");
          let value = c.getAttribute("value") || "";
          value = value.replace(/<br\s*\/?>/gi, " ");
          value = value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g," ").trim();
          
          let type = "task";
          const style = c.getAttribute("style") || "";
          if(style.includes("rhombus")) type = "gw_excl";
          else if(style.includes("cylinder")) type = "data_str";
          else if(style.includes("ellipse") || style.includes("shape=ellipse")) type = "es_none";
          else if(style.includes("swimlane")) type = "pool";
          
          const nid = 'n_'+id.replace(/[^a-zA-Z0-9]/g,'_');
          idMap[id] = nid;
          _nodes.push({ id: nid, type, x, y, w, h, label: value, fill: isDark() ? '#2c2c2c' : '#ffffff' });
        } else if (isEdge) {
          const src = c.getAttribute("source");
          const tgt = c.getAttribute("target");
          let value = c.getAttribute("value") || "";
          value = value.replace(/<[^>]+>/g, " ").trim();
          if(src && tgt) {
            _edges.push({ id: 'e_'+id.replace(/[^a-zA-Z0-9]/g,'_'), src: 'n_'+src.replace(/[^a-zA-Z0-9]/g,'_'), tgt: 'n_'+tgt.replace(/[^a-zA-Z0-9]/g,'_'), label: value });
          }
        }
      });
      _push(); _markDirty(); _render(); setTimeout(fitView, 50);
      showToast('Diagrama XML importado com sucesso!');
    } catch(e) {
      showToast('Erro ao ler XML: '+e.message, true);
    }
  }

  async function _parseWithAI(code) {
    if(!window.PF_CONFIG?.supabaseUrl) { showToast('Proxy IA ausente na configuração', true); return; }
    showToast('Interpretando código com Inteligência Artificial...');
    
    try {
      const supabase = window._supabase || window.supabase;
      const session  = supabase ? (await supabase.auth.getSession())?.data?.session : null;
      const authHeader = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      const PROXY_URL = `${window.PF_CONFIG.supabaseUrl}/functions/v1/claude-proxy`;
      
      const systemPrompt = `Você é um conversor de diagramas. Eu enviarei um código (Mermaid/Markdown) e você DEVE convertê-lo ESTRITAMENTE para JSON válido (sem NENHUM texto antes ou depois, comece com { e termine com }).
Formato:
{
  "nodes": [ {"id":"n1", "type":"task", "x":100, "y":100, "w":120, "h":80, "label":"Nome", "fill":"#ffffff"} ],
  "edges": [ {"id":"e1", "src":"n1", "tgt":"n2", "label":""} ]
}
Tipos de nodes suportados: task, data_str, gw_excl, pool, es_none, ee_none.
Espalhe as coordenadas (x e y) inteligentemente para formar um layout organizado, incrementando o y ou x para evitar sobreposição.`;

      const res = await fetch(PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': window.PF_CONFIG.supabaseKey, ...authHeader },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: code }]
        }),
      });

      if (!res.ok) throw new Error('Falha no proxy da IA');
      const data = await res.json();
      let text = data?.content?.[0]?.text || data?.content?.map?.(b => b.text || '').join('') || '';
      
      // Limpa possível formatação markdown
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      
      if(parsed.nodes) _nodes = parsed.nodes;
      if(parsed.edges) _edges = parsed.edges;
      _sel = null; _selEdge = null;
      _push(); _markDirty(); _render(); setTimeout(fitView, 50);
      showToast('Diagrama gerado por IA!');
    } catch(e) {
      showToast('Falha IA: ' + e.message, true);
    }
  }

  // ── HTML ────────────────────────────────────────────────
  function _buildHTML(pid) {
    const proj=(window.mockProjects||[]).find(p=>p.id===pid);
    const pname=(proj?.name||pid||'').replace(/</g,'&lt;');
    const cards=(PFBoard?.cards?.length?PFBoard.cards:(window.mockCards||[])).filter(c=>(c.project_id||c.sl)===pid);
    const taskOpts=cards.map(c=>`<option value="${c.id}">${(c.title||'').slice(0,36).replace(/</g,'&lt;')}</option>`).join('');
    const s16=(d,vb='0 0 24 24')=>`<svg width="15" height="15" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const btn=(svg,id,title,cls='')=>`<button class="b4btn${cls?` ${cls}`:''}" id="${id}" title="${title}">${svg}</button>`;

    // Palette items — compact, paleta fiel ao bpmn.io
    const PI = [
      {t:'select', s:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l7 18 3-7 7-3z"/></svg>`, tt:'Selecionar (V)'},
      {t:'pan',    s:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`, tt:'Pan (H / Espaço)'},
      {sep:true},
      {t:'es_none',s:`<svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="none" stroke="#1e8a4a" stroke-width="1.8"/></svg>`, tt:'Start event'},
      {t:'ei_msg_c',s:`<svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="none" stroke="#555" stroke-width="1.8"/><circle cx="10" cy="10" r="5.5" fill="none" stroke="#555" stroke-width="1.2"/></svg>`, tt:'Intermediate event', more:true},
      {t:'ee_none',s:`<svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="none" stroke="#c0392b" stroke-width="3"/></svg>`, tt:'End event', more:true},
      {sep:true},
      {t:'gw_excl',s:`<svg width="18" height="18" viewBox="0 0 20 20"><polygon points="10,1 19,10 10,19 1,10" fill="none" stroke="#333" stroke-width="1.8"/><line x1="7" y1="7" x2="13" y2="13" stroke="#333" stroke-width="2"/><line x1="13" y1="7" x2="7" y2="13" stroke="#333" stroke-width="2"/></svg>`, tt:'Exclusive gateway'},
      {t:'gw_par', s:`<svg width="18" height="18" viewBox="0 0 20 20"><polygon points="10,1 19,10 10,19 1,10" fill="none" stroke="#333" stroke-width="1.8"/><line x1="7" y1="10" x2="13" y2="10" stroke="#333" stroke-width="2"/><line x1="10" y1="7" x2="10" y2="13" stroke="#333" stroke-width="2"/></svg>`, tt:'Parallel gateway'},
      {t:'gw_incl',s:`<svg width="18" height="18" viewBox="0 0 20 20"><polygon points="10,1 19,10 10,19 1,10" fill="none" stroke="#333" stroke-width="1.8"/><circle cx="10" cy="10" r="3.5" fill="none" stroke="#333" stroke-width="2"/></svg>`, tt:'Inclusive gateway', more:true},
      {sep:true},
      {t:'task',   s:`<svg width="18" height="18" viewBox="0 0 20 20"><rect x="1" y="4" width="18" height="12" rx="3" fill="none" stroke="#333" stroke-width="1.8"/></svg>`, tt:'Task', more:true},
      {t:'task_usr',s:`<svg width="18" height="18" viewBox="0 0 20 20"><rect x="1" y="4" width="18" height="12" rx="3" fill="none" stroke="#333" stroke-width="1.8"/><circle cx="7" cy="9" r="2" fill="none" stroke="#666" stroke-width="1.1"/><path d="M3 16c0-2.5 8-2.5 8 0" fill="none" stroke="#666" stroke-width="1.1"/></svg>`, tt:'User task'},
      {t:'task_svc',s:`<svg width="18" height="18" viewBox="0 0 20 20"><rect x="1" y="4" width="18" height="12" rx="3" fill="none" stroke="#333" stroke-width="1.8"/><circle cx="7.5" cy="11" r="2.5" fill="none" stroke="#666" stroke-width="1"/></svg>`, tt:'Service task'},
      {t:'sp_coll',s:`<svg width="18" height="18" viewBox="0 0 20 20"><rect x="1" y="4" width="18" height="12" rx="3" fill="none" stroke="#333" stroke-width="1.8"/><rect x="8" y="14" width="4" height="3" rx="1" fill="none" stroke="#333" stroke-width="1"/><line x1="10" y1="14.5" x2="10" y2="16.5" stroke="#333" stroke-width="1"/><line x1="8.5" y1="15.5" x2="11.5" y2="15.5" stroke="#333" stroke-width="1"/></svg>`, tt:'Sub-process', more:true},
      {t:'call_act',s:`<svg width="18" height="18" viewBox="0 0 20 20"><rect x="1" y="4" width="18" height="12" rx="3" fill="none" stroke="#333" stroke-width="3.5"/></svg>`, tt:'Call activity'},
      {sep:true},
      {t:'data_obj',s:`<svg width="18" height="18" viewBox="0 0 20 20"><path d="M3 1h10l5 5v13H3V1z" fill="none" stroke="#555" stroke-width="1.5"/><path d="M13 1v5h5" fill="none" stroke="#555" stroke-width="1.2"/></svg>`, tt:'Data object'},
      {t:'data_str',s:`<svg width="18" height="18" viewBox="0 0 20 20"><ellipse cx="10" cy="5" rx="8" ry="3" fill="none" stroke="#555" stroke-width="1.5"/><path d="M2 5v10c0 1.7 3.6 3 8 3s8-1.3 8-3V5" fill="none" stroke="#555" stroke-width="1.5"/></svg>`, tt:'Data store'},
      {t:'pool',    s:`<svg width="18" height="18" viewBox="0 0 20 20"><rect x="1" y="2" width="4" height="16" fill="#e4e4e7" stroke="#555" stroke-width="1.4"/><rect x="5" y="2" width="14" height="16" fill="none" stroke="#555" stroke-width="1.4"/></svg>`, tt:'Pool'},
      {t:'annot',   s:`<svg width="18" height="18" viewBox="0 0 20 20"><path d="M8 3H4v14h4" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round"/></svg>`, tt:'Text annotation'},
      {t:'grp',     s:`<svg width="18" height="18" viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" rx="3" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="4 2"/></svg>`, tt:'Group'},
      {sep:true},
      {t:'_more',   s:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>`, tt:'Mais elementos (todos)'},
    ];

    const palHtml = PI.map(p=>p.sep?`<div class="b4sep2"></div>`:
      `<div class="b4pi" data-type="${p.t}" title="${p.tt||p.t}" draggable="true">${p.s}${p.more?`<span style="position:absolute;right:0;bottom:0;font-size:6px;color:#a1a1aa">▼</span>`:''}</div>`).join('');

    return `<div id="bv4">
<div id="bv4tb">
  <div class="b4tg">
    ${btn(s16('<path d="M3 9a9 9 0 1 1 1 6"/><path d="M3 3v6h6"/>'),'bv4und','Undo (Ctrl+Z)')}
    ${btn(s16('<path d="M21 9a9 9 0 1 0-1 6"/><path d="M21 3v6h-6"/>'),'bv4red','Redo (Ctrl+Y)')}
  </div>
  <div class="b4tg">
    ${btn(s16('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>'),'bv4zo','Zoom out')}
    <span class="b4zl" id="bv4zl">100%</span>
    ${btn(s16('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>'),'bv4zi','Zoom in')}
    ${btn(s16('<path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4"/>'),'bv4fit','Fit (0)')}
  </div>
  <div class="b4tg">
    ${btn(s16('<path d="M3 6h18M19 6l-1 14H6L5 6"/>'),'bv4del','Apagar (Del)')}
    ${btn(s16('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),'bv4gen','Gerar BPMN do projeto')}
    ${btn(s16('<path d="M12 3v9M3 12h9"/>'),'bv4lay','Auto-layout')}
  </div>
  <div class="b4tg" style="border:none">
    <span class="b4zl" style="font-size:11px">${pname}</span>
    <div class="b4sep"></div>
    <select style="font-size:11px;padding:2px 6px;border:1px solid var(--bd,#e4e4e7);border-radius:4px;background:var(--bg-2,#f9f9f9);color:var(--tx-2,#52525b);outline:none" id="bv4tasksel">
      <option value="">— tarefa —</option>${taskOpts}
    </select>
    <div class="b4sep"></div>
    ${btn(s16('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'),'bv4imp','Importar Código (XML/Mermaid)')}
    ${btn(s16('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),'bv4exp','Exportar SVG')}
    <div class="b4sep"></div>
    <span class="b4dot saved" id="bv4dot"></span>
    <span style="font-size:11px;color:var(--tx-3,#71717a)" id="bv4sl">Salvo</span>
    <div class="b4sep"></div>
    ${btn(s16('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>'),'bv4save','Salvar (Ctrl+S)','b4save')}
  </div>
</div>

<div id="bv4main">
  <div id="bv4pal">${palHtml}</div>
  <div id="bv4wrap">
    <svg id="bv4svg" xmlns="http://www.w3.org/2000/svg"></svg>
  </div>
  <div id="bv4props">
    <div class="pp-head">
      <span class="pp-title" id="pp-title">Propriedades</span>
      <button class="pp-close" id="pp-close">✕</button>
    </div>
    <div class="pp-body" id="pp-body"><p style="font-size:11px;color:#a1a1aa">Selecione um elemento</p></div>
  </div>
</div>

<div id="bv4sb">
  <span id="bv4tool">🖱 Selecionar</span>
  <span>·</span>
  <span id="bv4stat">0 elementos · 0 conexões</span>
  <div style="flex:1"></div>
  <span>Clique direito / duplo-clique = menu · Arrastar porta azul = conectar · Del = apagar</span>
</div>

<div id="bv4ftb"></div>

<div id="bv4menu">
  <div class="bm-head">
    <div class="bm-title">Create element</div>
    <div class="bm-sw">
      <span class="bm-sico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
      <input class="bm-sinp" id="bvm-sinp" type="text" placeholder="" autocomplete="off" spellcheck="false">
    </div>
  </div>
  <div class="bm-list" id="bvm-list"></div>
</div>

<div id="bv4tt"></div>

<div id="bv4imp-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
  <div style="background:var(--bg-1,#fff);width:600px;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);overflow:hidden;border:1px solid var(--bd,#e4e4e7);">
    <div style="padding:15px 20px;border-bottom:1px solid var(--bd,#e4e4e7);display:flex;justify-content:space-between;align-items:center;">
      <h3 style="margin:0;font-size:15px;color:var(--tx-1,#111);">Importar Diagrama (XML / Mermaid)</h3>
      <button onclick="document.getElementById('bv4imp-modal').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:18px;color:#888;">&times;</button>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <p style="margin:0;font-size:13px;color:var(--tx-3,#555);">Cole o código XML (gerado pelo Draw.io) ou o código Mermaid para ser convertido nativamente para o quadro.</p>
      <textarea id="bv4imp-code" style="width:100%;height:250px;padding:12px;border:1px solid var(--bd,#e4e4e7);border-radius:8px;font-family:monospace;font-size:12px;background:var(--bg-2,#f9f9f9);color:var(--tx-1,#111);outline:none;resize:vertical;" placeholder="Ex: <mxfile... ou erDiagram..."></textarea>
    </div>
    <div style="padding:15px 20px;border-top:1px solid var(--bd,#e4e4e7);display:flex;justify-content:flex-end;gap:10px;background:var(--bg-2,#f9f9f9);">
      <button class="b4btn" style="border:1px solid var(--bd,#e4e4e7);" onclick="document.getElementById('bv4imp-modal').style.display='none'">Cancelar</button>
      <button class="b4btn b4save" id="bv4imp-btn-submit" style="padding:0 14px;">Gerar Diagrama</button>
    </div>
  </div>
</div>

</div>`;
  }

  // ── Bindings ────────────────────────────────────────────
  function _bindTB() {
    const on=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);
    on('bv4und',undo);on('bv4red',redo);on('bv4del',deleteSelected);
    on('bv4fit',fitView);
    on('bv4zi',()=>{_zoom=Math.min(12,_zoom*1.18);_render();_zlbl();});
    on('bv4zo',()=>{_zoom=Math.max(0.06,_zoom*0.85);_render();_zlbl();});
    on('bv4exp',exportSVG);on('bv4save',()=>save());on('bv4gen',()=>generateFromProject());
    on('bv4imp',()=>document.getElementById('bv4imp-modal').style.display='flex');
    on('bv4imp-btn-submit',_importDiagramFromCode);
    on('bv4lay',autoLayout);on('pp-close',_closeProps);
    document.getElementById('bv4tasksel')?.addEventListener('change',e=>{ _taskId=e.target.value||null; showToast(_taskId?'Tarefa vinculada':'Vínculo removido'); });
  }

  function _bindPal() {
    const pal=document.getElementById('bv4pal');if(!pal)return;
    let _dt=null;
    pal.querySelectorAll('.b4pi').forEach(item=>{
      const t=item.dataset.type;
      item.addEventListener('dragstart',e=>{_dt=t;e.dataTransfer.effectAllowed='copy';});
      item.addEventListener('click',()=>{
        if(t==='_more'){const r=item.getBoundingClientRect();_openMenu(r.right+6,r.top,_pan.x/_zoom,_pan.y/_zoom);return;}
        pal.querySelectorAll('.b4pi').forEach(p=>p.classList.remove('act'));
        item.classList.add('act');
        _setTool(t);
      });
      item.addEventListener('mouseenter',e=>{const tt=document.getElementById('bv4tt');if(!tt)return;const r=item.getBoundingClientRect();tt.textContent=item.title||t;tt.style.left=(r.right+8)+'px';tt.style.top=(r.top+r.height/2)+'px';tt.style.transform='translateY(-50%)';tt.classList.add('vis');});
      item.addEventListener('mouseleave',()=>document.getElementById('bv4tt')?.classList.remove('vis'));
    });
    const wrap=document.getElementById('bv4wrap');if(!wrap)return;
    wrap.addEventListener('dragover',e=>e.preventDefault());
    wrap.addEventListener('drop',e=>{e.preventDefault();if(!_dt)return;const[cx,cy]=_sc(e.clientX,e.clientY);_addNode(_dt,cx,cy);_dt=null;});
  }

  function _bindSVG() {
    const svg=document.getElementById('bv4svg');if(!svg)return;
    svg.addEventListener('wheel',_wrapWheel,{passive:false});
    svg.addEventListener('contextmenu',e=>{e.preventDefault();const[cx,cy]=_sc(e.clientX,e.clientY);_openMenu(e.clientX,e.clientY,cx,cy);});
    svg.addEventListener('dblclick',e=>{
      // Delegate to node if needed
      if(e.target.closest('.b4node'))return; // handled by node listener
      const[cx,cy]=_sc(e.clientX,e.clientY);
      _openMenu(e.clientX,e.clientY,cx,cy);
    });
    // Global drag events
    window.addEventListener('mousemove',_bgMM);
    window.addEventListener('mouseup',_bgMU);
  }

  function _bindKB() {
    if(_kbBound)return;_kbBound=true;
    document.addEventListener('keydown',e=>{
      if(!_svgEl)return;
      if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
      if(e.code==='Space'){e.preventDefault();_setTool('pan');return;}
      if(!e.ctrlKey&&!e.metaKey){
        switch(e.key){
          case'v':case'V':_setTool('select');break;
          case'h':case'H':_setTool('pan');break;
          case'0':fitView();break;
          case'+':case'=':_zoom=Math.min(12,_zoom*1.18);_render();_zlbl();break;
          case'-':_zoom=Math.max(0.06,_zoom*0.85);_render();_zlbl();break;
          case'Escape':_setTool('select');_closeMenu();_sel=null;_selEdge=null;_render();_closeProps();break;
          case'Delete':case'Backspace':if(_sel){e.preventDefault();deleteSelected();}break;
        }
      }else{
        switch(e.key){
          case'z':e.preventDefault();undo();break;
          case'y':e.preventDefault();redo();break;
          case's':e.preventDefault();save();break;
          case'd':e.preventDefault();duplicateSelected();break;
        }
      }
    });
    document.addEventListener('keyup',e=>{if(e.code==='Space')_setTool('select');});
  }

  // ── Init ────────────────────────────────────────────────
  async function init(containerId, projectId, taskId = null) {
    _pid=projectId;_taskId=taskId;
    if(!_pid){showToast('Selecione um Projeto',true);return;}
    const outer=document.getElementById(containerId);
    if(!outer){console.error('[BPMN] container:',containerId);return;}
    document.getElementById('bv4')?.remove();
    _nodes=[];_edges=[];_sel=null;_selEdge=null;_zoom=1;_pan={x:60,y:60};
    _hist=[];_histIdx=-1;_dirty=false;_kbBound=false;
    clearTimeout(_saveTimer);
    _css();
    const root=document.createElement('div');
    root.style.cssText='flex:1;display:flex;flex-direction:column;overflow:hidden;height:100%;min-height:0;width:100%;';
    root.innerHTML=_buildHTML(projectId);
    outer.appendChild(root);
    _svgEl=document.getElementById('bv4svg');
    _buildFTB();_buildMenu();_bindTB();_bindPal();_bindSVG();_bindKB();
    // Dark mode observer
    new MutationObserver(()=>_render()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    _setTool('select');
    await _load();
    if(!_nodes.length){
      _addNodeObj('es_none',80,120,44,44,'Início');
      _addNodeObj('task',200,100,120,80,'Minha Task');
      _addNodeObj('ee_none',400,120,44,44,'Fim');
      _edges.push({id:'e1',src:_nodes[0].id,tgt:_nodes[1].id,label:''});
      _edges.push({id:'e2',src:_nodes[1].id,tgt:_nodes[2].id,label:''});
      _push();
    } else { _push(); }
    _render();_zlbl();
    const badge=document.getElementById('diagram-project-badge');
    const proj=(window.mockProjects||[]).find(p=>p.id===_pid);
    if(badge)badge.textContent=(proj?.name||_pid)+' — BPMN 2.0';
    showToast('BPMN 2.0 pronto · Clique direito = menu · Arrastar porta azul = conectar');
  }

  let _initialized=false;
  return {
    init,save,generateFromProject,exportSVG,
    undo,redo,deleteSelected,duplicateSelected,
    autoLayout,fitView,
    zoomIn(){_zoom=Math.min(12,_zoom*1.18);_render();_zlbl();},
    zoomOut(){_zoom=Math.max(0.06,_zoom*0.85);_render();_zlbl();},
    clearAll(){if(confirm('Limpar diagrama?')){_nodes=[];_edges=[];_sel=null;_selEdge=null;_push();_markDirty();_render();showToast('Limpo');}},
    addNode(t,x,y){_addNode(t,x||200,y||200);},
    setLinkedTask(v){_taskId=v||null;},
    get canvas(){return _svgEl;},get pid(){return _pid;}, get taskId(){return _taskId;},
    get shapes(){return REG;},
    get _initialized(){return _initialized;},
    set _initialized(v){_initialized=v;},
    startArrowTool(){_setTool('select');},
    startLineTool(){_setTool('select');},
    addText(){_addNode('annot',200,200);},
    selectAll(){_nodes.forEach(n=>{}); /* multi-sel TODO */},
  };
})();

window.DiagramViewManager = {
  _pid:null,
  async init(pid, taskId=null){this._pid=pid||PF?.currentProject;if(!this._pid){showToast('Selecione um projeto',true);return;}await DiagramEngineV9.init('dg-container',this._pid, taskId);},
  async generate(pid){this._pid=pid||PF?.currentProject;if(!this._pid)return;await DiagramEngineV9.init('dg-container',this._pid);DiagramEngineV9.generateFromProject(this._pid);},
};
