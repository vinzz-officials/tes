// overlay.js
(function(){
  // helper
  const $ = id => document.getElementById(id);
  const toast = (m,t=1100)=>{ const e=document.createElement('div'); e.className='toast'; e.textContent=m; document.body.appendChild(e); setTimeout(()=>e.remove(),t); };

  const STORE='overlay_gui_fixed_v1';
  const genId=()=> 'id_'+Math.random().toString(36).slice(2,9);

  // initial state
  let state = {
    pos:{x:20,y:20},
    tabs:[ { id: genId(), title:'Main', actions: [ { id: genId(), label:'Hello', type:'alert', payload:'Halo!' } ] } ],
    active:0,
    minimized:false
  };
  try{ const raw = localStorage.getItem(STORE); if(raw) state = JSON.parse(raw); }catch(e){ console.warn(e); }

  // refs (must exist after markup appended)
  const panelWrap = $('panelWrap'), panel = $('panel'), hdr = $('hdr');
  const tabsEl = $('tabs'), body = $('body'), editor = $('editor');
  const labelInput = $('labelInput'), actionType = $('actionType'), addBtn = $('addBtn');
  const addTabBtn = $('addTabBtn'), minBtn = $('minBtn'), closeBtn = $('closeBtn'), saveBtn = $('saveBtn'), inspectBtn = $('inspectBtn');

  // if required elements missing, abort gracefully
  if(!panelWrap || !panel || !hdr){
    console.warn('Overlay: required DOM elements missing. Aborting init.');
    return;
  }

  // apply saved pos
  try { panelWrap.style.transform = `translate(${state.pos.x}px, ${state.pos.y}px)`; } catch(e){}

  // DRAG realtime
  let dragging=false, startPointer={x:0,y:0}, startPos={x:0,y:0};
  hdr.addEventListener('pointerdown', e=>{
    try{
      e.preventDefault();
      hdr.setPointerCapture(e.pointerId);
      dragging=true;
      panel.classList.add('dragging');
      startPointer = {x:e.clientX, y:e.clientY};
      startPos = {x: state.pos.x, y: state.pos.y};
    }catch(err){/* ignore */ }
  }, {passive:false});

  document.addEventListener('pointermove', e=>{
    if(!dragging) return;
    e.preventDefault();
    const nx = startPos.x + (e.clientX - startPointer.x);
    const ny = startPos.y + (e.clientY - startPointer.y);
    state.pos.x = nx; state.pos.y = ny;
    panelWrap.style.transform = `translate(${nx}px, ${ny}px)`;
  }, {passive:false});

  document.addEventListener('pointerup', e=>{
    if(!dragging) return;
    dragging=false;
    panel.classList.remove('dragging');
    try{ localStorage.setItem(STORE, JSON.stringify(state)); }catch(e){ console.warn(e); }
  });

  // render
  function render(){
    // minimized
    if(state.minimized){
      if(tabsEl) tabsEl.style.display='none';
      if(body) body.style.display='none';
      if(editor) editor.style.display='none';
      if(minBtn) minBtn.textContent='⬆';
    } else {
      if(tabsEl) tabsEl.style.display='';
      if(body) body.style.display='';
      if(editor) editor.style.display='';
      if(minBtn) minBtn.textContent='—';
    }

    // tabs
    if(!tabsEl) return;
    tabsEl.innerHTML='';
    state.tabs.forEach((t,i)=>{
      const b = document.createElement('button');
      b.className = 'tab' + (i===state.active ? ' active' : '');
      b.textContent = t.title;
      b.addEventListener('click', ()=>{ state.active = i; render(); });
      b.addEventListener('contextmenu', ev=>{
        ev.preventDefault();
        const opt = prompt('rename / delete', 'rename');
        if(!opt) return;
        if(opt==='delete'){ if(confirm('Delete tab "'+t.title+'"?')){ state.tabs.splice(i,1); state.active = Math.max(0, state.active-1); save(); render(); } }
        else if(opt==='rename'){ const name = prompt('New name:', t.title); if(name){ t.title = name; save(); render(); } }
      });
      tabsEl.appendChild(b);
    });

    // actions: horizontal scroll row
    if(!body) return;
    body.innerHTML = '';
    const cur = state.tabs[state.active] || state.tabs[0];
    const row = document.createElement('div');
    row.className = 'panel-row';
    (cur.actions || []).forEach(act=>{
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = act.label;
      btn.title = act.type + (act.payload ? ' — ' + (act.payload.length>40 ? act.payload.slice(0,40)+'...' : act.payload) : '');
      btn.addEventListener('click', ()=> runAction(act));
      btn.addEventListener('contextmenu', ev=>{
        ev.preventDefault();
        const opt = prompt('edit / delete', 'edit');
        if(!opt) return;
        if(opt==='delete'){ if(confirm('Delete "'+act.label+'"?')){ cur.actions = cur.actions.filter(x=>x.id!==act.id); save(); render(); } }
        else if(opt==='edit'){
          const newLabel = prompt('Label:', act.label); if(newLabel) act.label = newLabel;
          const newPayload = prompt('Payload (alert/log/copy/custom):', act.payload || '') || '';
          act.payload = newPayload;
          save(); render();
        }
      });
      row.appendChild(btn);
    });
    // if no actions show hint
    if((cur.actions || []).length === 0){
      const h = document.createElement('div'); h.className='small'; h.style.padding='6px 0'; h.textContent='(No actions yet — add using the form below)';
      row.appendChild(h);
    }
    body.appendChild(row);
  }

  // actions runner
  function runAction(act){
    try{
      if(act.type === 'alert') alert(act.payload || act.label);
      else if(act.type === 'log') console.log(act.payload || act.label);
      else if(act.type === 'copy'){
        const txt = act.payload || act.label;
        if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(()=> toast('Copied'));
        else { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Copied'); }
      } else if(act.type === 'custom'){
        if(!confirm('Execute custom JS?')) return;
        (new Function(act.payload || ''))();
      }
    }catch(e){ console.error(e); toast('Action failed'); }
  }

  // controls
  if(addBtn) addBtn.addEventListener('click', ()=>{
    try{
      const label = labelInput.value.trim(); if(!label){ toast('Masukkan label'); return; }
      const type = actionType.value; let payload = '';
      if(type==='alert') payload = prompt('Pesan alert:', 'Hello') || '';
      else if(type==='log') payload = prompt('Pesan console.log:', label) || '';
      else if(type==='copy') payload = prompt('Text untuk copy:', label) || '';
      else if(type==='custom') payload = prompt('Custom JS:', 'console.log(\"hi\")') || '';
      const cur = state.tabs[state.active] || state.tabs[0];
      cur.actions = cur.actions || [];
      cur.actions.push({ id: genId(), label, type, payload });
      labelInput.value = '';
      save(); render();
      setTimeout(()=> { if(body) body.scrollLeft = body.scrollWidth; }, 60);
    }catch(e){ console.error(e); }
  });

  if(addTabBtn) addTabBtn.addEventListener('click', ()=>{
    const name = prompt('Nama tab baru:', 'Tools'); if(!name) return;
    state.tabs.push({ id: genId(), title: name, actions: [] });
    state.active = state.tabs.length - 1;
    save(); render();
  });

  if(minBtn) minBtn.addEventListener('click', ()=>{ state.minimized = !state.minimized; save(); render(); });
  if(closeBtn) closeBtn.addEventListener('click', ()=>{ panelWrap.remove(); toast('Panel closed'); });
  if(saveBtn) saveBtn.addEventListener('click', ()=>{ save(); });

  // inspector
  let inspector=false, highlighted=null;
  if(inspectBtn) inspectBtn.addEventListener('click', ()=>{
    inspector = !inspector;
    toast(inspector ? 'Inspect ON — tap element' : 'Inspect OFF');
  });

  function onPointerOverInspect(e){
    if(!inspector) return;
    const el = e.target;
    if(el === panel || panel.contains(el)) return;
    if(highlighted && highlighted !== el) highlighted.classList.remove('_ov_highlight');
    highlighted = el;
    el.classList.add('_ov_highlight');
  }
  function onClickInspect(e){
    if(!inspector) return;
    e.preventDefault(); e.stopPropagation();
    const el = e.target; if(el === panel || panel.contains(el)) return;
    const path = domPath(el);
    console.log('INSPECT:', el, path);
    alert('Element selected — lihat console untuk DOM path');
    if(highlighted){ highlighted.classList.remove('_ov_highlight'); highlighted = null; }
    inspector = false;
  }
  function domPath(el){
    const parts = [];
    while(el && el.nodeType === 1 && el !== document.body){
      let name = el.tagName.toLowerCase();
      if(el.id) name += '#'+el.id;
      else if(el.className) name += '.'+String(el.className).split(/\s+/).filter(Boolean).join('.');
      parts.unshift(name);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  document.addEventListener('mouseover', onPointerOverInspect, true);
  document.addEventListener('click', onClickInspect, true);

  // save helper
  function save(){ try{ localStorage.setItem(STORE, JSON.stringify(state)); toast('Saved'); }catch(e){ console.warn(e); } }

  // responsive: ensure position stays reasonable on resize (but allow offscreen)
  window.addEventListener('resize', ()=>{
    if(!state.pos || isNaN(state.pos.x) || isNaN(state.pos.y)) { state.pos = {x:20,y:20}; panelWrap.style.transform = `translate(${state.pos.x}px, ${state.pos.y}px)`; }
  });

  // initial
  render();
  panelWrap.style.transform = `translate(${state.pos.x}px, ${state.pos.y}px)`;

})();
