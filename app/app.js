// Leonida Ledger — a GTA VI trophy guide & tracker.
// All 55 official trophies, every guide paraphrased and every step cited.
// Progress lives in localStorage; export/import moves it between browsers.
const STORE_KEY = 'leonida-ledger-v1';
const doc = await (await fetch('data/trophies.json')).json();
const TROPHIES = doc.trophies;
const SOURCES = doc.sources;
const STAGES = doc.stages;
const byId = new Map(TROPHIES.map((t) => [t.id, t]));
const sourceById = new Map(SOURCES.map((s) => [s.id, s]));
const GRADE_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
const KIND_LABEL = {
  story: 'Story', collectibles: 'Collectibles', activities: 'Activities', side: 'Side',
  crime: 'Crime', world: 'World', money: 'Money', misc: 'Platinum & 100%',
};
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo');

/* ---------------- state ---------------- */
function blankState() {
  return { earned: new Set(), counters: {}, spoiler: false, revealed: new Set() };
}
function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (!raw) return blankState();
    return {
      earned: new Set(raw.earned ?? []),
      counters: raw.counters ?? {},
      spoiler: !!raw.spoiler,
      revealed: new Set(raw.revealed ?? []),
    };
  } catch {
    return blankState();
  }
}
function demoState(name) {
  const st = blankState();
  const early = [2, 3, 4, 8, 16, 21, 35, 36, 44, 46, 51];
  if (name === 'cover' || name === 'roadmap' || name === 'sources') {
    st.earned = new Set(early);
    st.counters = { 28: 6, 15: 87, 17: 19, 31: 34 };
  }
  if (name === 'miss') {
    st.earned = new Set([2, 3, 8]);
    st.counters = { 28: 1 };
    st.spoiler = true;
  }
  return st;
}
const state = DEMO ? demoState(DEMO) : loadState();
function save() {
  if (DEMO) return;
  localStorage.setItem(STORE_KEY, JSON.stringify({
    earned: [...state.earned],
    counters: state.counters,
    spoiler: state.spoiler,
    revealed: [...state.revealed],
  }));
  flashSaved();
}
let savedTimer = null;
function flashSaved() {
  const el = document.getElementById('saved-note');
  el.textContent = 'Saved ✓ just now';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { el.textContent = 'Saved in this browser'; }, 1600);
}

/* ---------------- helpers ---------------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const citesHtml = (cites) => `<span class="citeref">${cites.map((c) => `[${c}]`).join('')}</span>`;
const isMasked = (t) => state.spoiler && !state.earned.has(t.id) && !state.revealed.has(t.id) && (t.kind === 'story' || t.hidden);
function counterStep(t) {
  if (!t.count) return 1;
  if (t.count >= 100000) return 5000;
  if (t.count >= 100) return 10;
  return 1;
}
function citedByGuides(sourceId) {
  return TROPHIES.filter((t) => t.sources.includes(sourceId)).length;
}
function citedBySteps(sourceId) {
  let n = 0;
  for (const t of TROPHIES) for (const s of t.steps) if (s.cites.includes(sourceId)) n += 1;
  return n;
}
function singleSourceCount() {
  return TROPHIES.filter((t) => t.sources.filter((s) => s !== 7).length === 1).length;
}

/* ---------------- header & audit ---------------- */
function renderHeader() {
  $('earned-count').textContent = state.earned.size;
  const totals = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
  const got = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of TROPHIES) if (state.earned.has(t.id)) got[t.grade] += 1;
  $('grade-chips').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<span class="gchip ${g}">${GRADE_LETTER[g]} <b>${got[g]}/${totals[g]}</b></span>`).join('');
  $('spoiler').checked = state.spoiler;
}
function renderAudit() {
  const totalSteps = TROPHIES.reduce((n, t) => n + t.steps.length, 0);
  const citedSteps = TROPHIES.reduce((n, t) => n + t.steps.filter((s) => s.cites.length > 0).length, 0);
  const citedGuides = TROPHIES.filter((t) => t.sources.some((s) => s !== 7)).length;
  const hidden = TROPHIES.filter((t) => t.hidden).length;
  const miss = TROPHIES.filter((t) => t.missable_status === 'possibly-missable').length;
  const watch = TROPHIES.filter((t) => t.missable_status === 'watch').length;
  const unc = TROPHIES.filter((t) => t.confirm_status === 'unconfirmed').length;
  const dis = TROPHIES.filter((t) => t.disagree).length;
  const d = doc.read_date ? new Date(doc.read_date + 'T00:00:00') : null;
  const readStr = d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  $('audit-strip').innerHTML =
    `<b>55 official</b> · 1P 2G 6S 46B · <b>${hidden} hidden</b> on PSN · ` +
    `<b>${citedGuides}/55</b> guides cite a source · <b>${citedSteps}/${totalSteps}</b> steps cited · ` +
    `<b>7 sources</b> read ${esc(readStr)} · <span class="warn">${miss} possibly missable</span> · ` +
    `<span class="warn">${watch} watch</span> · ${unc} unconfirmed · ${singleSourceCount()} single-source · ${dis} disagree`;
}

/* ---------------- filters ---------------- */
let chipFilter = 'all';
let searchText = '';
let gradeFilter = 'all';
const CHIP_DEFS = [
  ['all', 'All', () => true],
  ['story', 'Story', (t) => t.kind === 'story'],
  ['collectibles', 'Collectibles', (t) => t.kind === 'collectibles'],
  ['activities', 'Activities', (t) => t.kind === 'activities'],
  ['side', 'Side', (t) => t.kind === 'side'],
  ['crime', 'Crime', (t) => t.kind === 'crime'],
  ['world', 'World', (t) => t.kind === 'world'],
  ['money', 'Money', (t) => t.kind === 'money'],
  ['missable', 'Missable', (t) => t.missable_status === 'possibly-missable', 'alert'],
  ['watch', 'Watch', (t) => t.missable_status === 'watch', 'alert'],
  ['unconfirmed', 'Unconfirmed', (t) => t.confirm_status === 'unconfirmed'],
  ['disagree', 'Disagree', (t) => t.disagree],
  ['earned', 'Earned only', (t) => state.earned.has(t.id)],
  ['unearned', 'Unearned only', (t) => !state.earned.has(t.id)],
];
function chipFn() {
  return (CHIP_DEFS.find((c) => c[0] === chipFilter) ?? CHIP_DEFS[0])[2];
}
function renderChips() {
  $('chips').innerHTML = CHIP_DEFS.map(([key, label, fn, cls]) => {
    const n = TROPHIES.filter(fn).length;
    return `<button type="button" class="chip ${cls ?? ''} ${key === chipFilter ? 'active' : ''}" data-chip="${key}">${label} <b>${n}</b></button>`;
  }).join('');
  for (const btn of $('chips').querySelectorAll('[data-chip]')) {
    btn.addEventListener('click', () => { chipFilter = btn.dataset.chip; renderChips(); renderList(); });
  }
}
function passesFilters(t) {
  if (!chipFn()(t)) return false;
  if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
  if (searchText) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(searchText)) return false;
  }
  return true;
}

/* ---------------- checklist ---------------- */
let selectedId = Number(params.get('open')) || 28;
function badgesHtml(t) {
  let h = '';
  if (t.missable_status === 'possibly-missable') h += '<span class="badge miss">MISSABLE?</span>';
  if (t.missable_status === 'watch') h += '<span class="badge watch">WATCH</span>';
  if (t.hidden) h += '<span class="badge hiddenb">HIDDEN ON PSN</span>';
  if (t.confirm_status === 'unconfirmed') h += '<span class="badge unc">UNCONFIRMED</span>';
  return h;
}
function renderList() {
  const list = $('trophy-list');
  let html = '';
  for (const stage of STAGES) {
    const inStage = TROPHIES.filter((t) => t.stage === stage.n && passesFilters(t));
    const allInStage = TROPHIES.filter((t) => t.stage === stage.n);
    if (!inStage.length) continue;
    const done = allInStage.filter((t) => state.earned.has(t.id)).length;
    html += `<div class="stage-head">S${stage.n} · ${esc(stage.name)} <span>${done}/${allInStage.length} earned</span></div>`;
    for (const t of inStage) {
      const masked = isMasked(t);
      const earned = state.earned.has(t.id);
      const citeSet = [...new Set(t.steps.flatMap((s) => s.cites))].sort((a, b) => a - b);
      html += `<div class="trow ${earned ? 'earned' : ''} ${t.id === selectedId ? 'selected' : ''}" data-row="${t.id}">
        <input type="checkbox" data-earn="${t.id}" ${earned ? 'checked' : ''} aria-label="Mark earned">
        <div class="tgrade ${t.grade}">${GRADE_LETTER[t.grade]}</div>
        <div>
          <div class="tname">${masked ? '<span class="masked-name">Hidden trophy</span>' : esc(t.name)}<span class="stage-tag">S${t.stage}</span></div>
          <div class="tdesc">${masked ? 'Hidden until earned.' : esc(t.description)}</div>
          <div class="tbadges">${badgesHtml(t)} ${citesHtml(citeSet)}</div>
        </div>
      </div>`;
    }
  }
  list.innerHTML = html || '<p class="empty-note">No trophies match the current filters.</p>';
  for (const row of list.querySelectorAll('[data-row]')) {
    row.addEventListener('click', (ev) => {
      if (ev.target.matches('input[type="checkbox"]')) return;
      selectedId = Number(row.dataset.row);
      renderList(); renderDetail();
    });
  }
  for (const box of list.querySelectorAll('[data-earn]')) {
    box.addEventListener('change', () => {
      toggleEarned(Number(box.dataset.earn));
    });
  }
}
function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id); else state.earned.add(id);
  save(); renderAll();
}

/* ---------------- detail pane ---------------- */
function renderDetail() {
  const t = byId.get(selectedId) ?? TROPHIES[0];
  const el = $('trophy-detail');
  const earned = state.earned.has(t.id);
  const masked = isMasked(t);
  const stage = STAGES.find((s) => s.n === t.stage);
  let html = `<div class="detail-head">
      <div class="tgrade ${t.grade} detail-grade" style="width:30px">${GRADE_LETTER[t.grade]}</div>
      <div>
        <h2>${masked ? '<span class="masked-name">Hidden trophy</span>' : esc(t.name)}</h2>
        <div class="detail-meta">${esc(KIND_LABEL[t.kind])} · Stage ${t.stage} — ${esc(stage ? stage.name : '')} · ${esc(t.confirm_status)}${t.hidden ? ' · hidden on PSN' : ''}</div>
        <div class="tbadges">${badgesHtml(t)}</div>
      </div>
      <button type="button" class="earn-btn ${earned ? 'is-earned' : ''}" id="earn-btn">${earned ? '✓ Earned' : 'Mark earned'}</button>
    </div>`;
  if (masked) {
    html += `<p class="kicker">SPOILER SHIELD ON</p>
      <p class="in-short">This trophy is masked because spoilers are hidden and it is not earned yet.</p>
      <p style="margin-top:10px"><button type="button" class="reveal-btn" id="reveal-btn" style="font-size:12px;padding:4px 12px">Reveal this trophy</button></p>`;
    el.innerHTML = html;
    $('reveal-btn').addEventListener('click', () => { state.revealed.add(t.id); save(); renderList(); renderDetail(); });
    $('earn-btn').addEventListener('click', () => toggleEarned(t.id));
    return;
  }
  html += `<p class="kicker">OFFICIAL DESCRIPTION · PLAYSTATION</p>
    <p class="official-desc">“${esc(t.description)}”</p>
    <p class="kicker">IN SHORT</p>
    <p class="in-short">${esc(t.guide)}</p>`;
  if (t.missable_status !== 'none') {
    html += `<div class="alert-box miss"><h3>${t.missable_status === 'possibly-missable' ? '⚠ POSSIBLY MISSABLE' : '⚠ WATCH — DO IT WHILE YOU ARE HERE'}</h3><p>${esc(t.missable_note ?? '')}</p></div>`;
  }
  if (t.disagree) {
    html += `<div class="alert-box dis"><h3>SOURCES DISAGREE — BOTH VERSIONS SHOWN</h3><p>${esc(t.disagree_note ?? '')}</p></div>`;
  }
  if (t.count) {
    const cur = Math.min(state.counters[t.id] ?? 0, t.count);
    const pct = Math.round((cur / t.count) * 100);
    const fmt = (n) => n.toLocaleString('en-US');
    html += `<div class="counter-box">
      <span class="c-label">YOUR COUNT</span>
      <div class="counter-ctrl">
        <button type="button" id="c-minus" aria-label="Decrease count">−</button>
        <span class="counter-val">${fmt(cur)} <small>/ ${fmt(t.count)} ${esc(t.count_label ?? '')}</small></span>
        <button type="button" id="c-plus" aria-label="Increase count">+</button>
      </div>
      <div class="counter-bar"><i style="width:${pct}%"></i></div>
      <span class="citeref">${pct}%</span>
    </div>`;
  }
  html += `<p class="kicker">THE STEPS · EVERY STEP CITED</p><ol class="steps">`;
  for (const s of t.steps) html += `<li>${esc(s.text)} ${citesHtml(s.cites)}</li>`;
  html += `</ol>`;
  html += `<p class="kicker">SOURCES FOR THIS GUIDE</p>
    <p class="in-short">${t.sources.map((id) => `[${id}] ${esc(sourceById.get(id)?.name ?? '')}`).join(' · ')}</p>`;
  el.innerHTML = html;
  $('earn-btn').addEventListener('click', () => toggleEarned(t.id));
  if (t.count) {
    const step = counterStep(t);
    $('c-minus').addEventListener('click', () => {
      state.counters[t.id] = Math.max(0, (state.counters[t.id] ?? 0) - step);
      save(); renderDetail();
    });
    $('c-plus').addEventListener('click', () => {
      state.counters[t.id] = Math.min(t.count, (state.counters[t.id] ?? 0) + step);
      if (state.counters[t.id] >= t.count) state.earned.add(t.id);
      save(); renderAll();
    });
  }
}

/* ---------------- source rail ---------------- */
function renderRail() {
  $('source-rail').innerHTML = `<p class="rail-title">SOURCES · READ ${esc(doc.read_date ?? '')}</p>` + SOURCES.map((s) => `
    <div class="rail-src">
      <div class="rail-num">${s.id}</div>
      <div>
        <div class="s-name">${esc(s.name)}</div>
        <div class="s-meta">${esc(s.what)} — read ${esc(s.read_date)} · ${esc(s.read_method)} · <b>cited by ${citedByGuides(s.id)} of 55 guides</b></div>
        <div class="s-url">${esc(s.url)}</div>
      </div>
    </div>`).join('') +
    `<p class="s-meta" style="color:var(--ink-faint);font-size:11px;margin-top:10px">Guide text is paraphrased in our own words; citations mark the source each step rests on. Where sources conflict, both versions are shown in the guide.</p>`;
}

/* ---------------- roadmap ---------------- */
function renderRoadmap() {
  const nonPlat = TROPHIES.filter((t) => t.grade !== 'platinum');
  const platDone = nonPlat.filter((t) => state.earned.has(t.id)).length;
  const counted = TROPHIES.filter((t) => t.count && t.id !== 1);
  let closest = null;
  for (const t of counted) {
    const ratio = (state.counters[t.id] ?? 0) / t.count;
    if (!state.earned.has(t.id) && (!closest || ratio > closest.ratio)) closest = { t, ratio };
  }
  const nextStory = TROPHIES.filter((t) => t.kind === 'story' && !state.earned.has(t.id))
    .sort((a, b) => a.stage - b.stage || a.id - b.id)[0];
  const missFirst = TROPHIES.find((t) => t.missable_status === 'possibly-missable');
  let html = `<div class="goal-banner">
      <div><h2>GOAL · 100% AND THE PLATINUM</h2>
      <p>Seven stages: story first, the balcony meditation before Chapter 1 ends, then activities, collectibles, money and the last percentage points.</p></div>
      <div class="goal-stats">
        <div><b>${platDone}/54</b><span>toward Vice Got a Price!</span></div>
        <div><b>${Math.round((state.earned.size / 55) * 100)}%</b><span>of the list earned</span></div>
        <div><b>${counted.filter((t) => state.earned.has(t.id)).length}/${counted.length}</b><span>counters finished</span></div>
      </div>
    </div>
    <div class="nextup">
      <div class="next-card hot"><h3>NEXT UP · DO FIRST (MISSABLE)</h3>
        <div class="n-name">${missFirst && !state.earned.has(missFirst.id) ? esc(missFirst.name) : 'Positive Mental Attitude ✓'}</div>
        <p>${missFirst && !state.earned.has(missFirst.id) ? 'Meditate on the Chapter 1 balcony before the chapter ends — the one spot guides say may not come back.' : 'The balcony meditation is done. Nothing else on the list can be lost for good.'}</p></div>
      <div class="next-card"><h3>NEXT UP · NEXT STORY BEAT</h3>
        <div class="n-name">${nextStory ? esc(nextStory.name) : 'Story complete ✓'}</div>
        <p>${nextStory ? `${esc(nextStory.description)} — stage ${nextStory.stage}, ${esc(STAGES.find((s) => s.n === nextStory.stage)?.name ?? '')}.` : 'All 12 story trophies are earned.'}</p></div>
      <div class="next-card"><h3>NEXT UP · CLOSEST COUNTER</h3>
        <div class="n-name">${closest ? esc(closest.t.name) : 'All counters done ✓'}</div>
        <p>${closest ? `${(state.counters[closest.t.id] ?? 0).toLocaleString('en-US')} / ${closest.t.count.toLocaleString('en-US')} ${esc(closest.t.count_label ?? '')} — ${Math.round(closest.ratio * 100)}% of the way there.` : 'Every tracked counter has reached its line.'}</p></div>
    </div>
    <div class="stage-grid">`;
  for (const stage of STAGES) {
    const items = TROPHIES.filter((t) => t.stage === stage.n);
    const done = items.filter((t) => state.earned.has(t.id)).length;
    html += `<div class="stage-card">
      <h3>S${stage.n} · ${esc(stage.name)} <span class="s-count">${done}/${items.length}</span></h3>
      <p class="s-blurb">${esc(stage.blurb)}</p>
      <ul>${items.map((t) => `<li class="${state.earned.has(t.id) ? 'done' : ''}">${esc(t.name)}</li>`).join('')}</ul>
    </div>`;
  }
  html += `</div>`;
  $('roadmap-body').innerHTML = html;
}

/* ---------------- missables ---------------- */
function renderMissables() {
  const flagged = TROPHIES.filter((t) => t.missable_status !== 'none');
  const hidden = TROPHIES.filter((t) => t.hidden);
  let html = `<h2 class="view-title">MISSABLES &amp; WATCH</h2>
    <p class="view-intro">One trophy on this list can genuinely be lost: <b>Positive Mental Attitude</b>, if the Chapter 1
    balcony meditation is skipped before the chapter ends. Two more are far easier inside their story windows than after them.
    Everything else can be cleaned up in free roam. Below them, the spoiler shield at work: with spoilers hidden, unearned
    story and hidden trophies are masked until you reveal or earn them.</p>
    <div class="miss-grid">`;
  for (const t of flagged) {
    html += `<div class="miss-card ${t.missable_status === 'watch' ? 'watch' : ''}">
      <h3>${t.missable_status === 'possibly-missable' ? '⚠ POSSIBLY MISSABLE' : '⚠ WATCH'} · ${esc(t.name)}</h3>
      <p>${esc(t.missable_note ?? '')}</p>
      <p style="margin-top:6px">${citesHtml([...new Set(t.steps.flatMap((s) => s.cites))].sort((a, b) => a - b))} <span style="color:var(--ink-faint)">${esc(t.guide)}</span></p>
    </div>`;
  }
  html += `</div>
    <h2 class="view-title" style="margin-top:20px">HIDDEN ON PSN · ${hidden.length} TROPHIES · SPOILERS ${state.spoiler ? 'HIDDEN' : 'SHOWN'}</h2>
    <div class="hidden-grid">`;
  for (const t of hidden) {
    const masked = isMasked(t);
    html += `<div class="hidden-cell">${masked
      ? `<span class="masked-name">Hidden trophy</span><div class="h-sub">Masked by the spoiler shield — earn it or reveal it in the checklist.</div>`
      : `<b>${esc(t.name)}</b><div class="h-sub">${esc(t.description)}</div>`}</div>`;
  }
  html += `</div>`;
  $('missables-body').innerHTML = html;
}

/* ---------------- sources view ---------------- */
function renderSources() {
  let html = `<h2 class="view-title">SOURCE MATRIX · 7 SOURCES</h2>
    <p class="view-intro">Every step in every guide ends with the numbers of the sources it rests on. This matrix is the
    other end of those numbers: what each source is, where it lives, when it was read, how it was read, and how much of
    the guide leans on it. Guide text is paraphrased — no source's wording is reproduced.</p>
    <table class="src-table"><thead><tr>
      <th>#</th><th>Source</th><th>What it is</th><th>URL</th><th>Read</th><th>Method</th><th>Cited by</th>
    </tr></thead><tbody>`;
  for (const s of SOURCES) {
    const g = citedByGuides(s.id);
    const st = citedBySteps(s.id);
    html += `<tr>
      <td><span class="rail-num">${s.id}</span></td>
      <td><b>${esc(s.name)}</b></td>
      <td>${esc(s.what)}</td>
      <td class="s-url">${esc(s.url)}</td>
      <td>${esc(s.read_date)}</td>
      <td>${esc(s.read_method)}</td>
      <td><b>${g} of 55</b> guides · ${st} steps<div class="cited-bar"><i style="width:${Math.round((g / 55) * 100)}%"></i></div></td>
    </tr>`;
  }
  html += `</tbody></table>
    <p class="view-intro" style="margin-top:12px">Coverage: <b>${TROPHIES.filter((t) => t.sources.some((s) => s !== 7)).length}/55 guides</b> cite at least one
    public guide source, <b>${TROPHIES.reduce((n, t) => n + t.steps.filter((s) => s.cites.length).length, 0)}/${TROPHIES.reduce((n, t) => n + t.steps.length, 0)} steps</b> carry citations,
    ${singleSourceCount()} trophies rest on a single guide source (flagged in their guides), and
    ${TROPHIES.filter((t) => t.disagree).length} carry a sources-disagree note with both versions shown.</p>`;
  $('sources-body').innerHTML = html;
}

/* ---------------- views & wiring ---------------- */
let view = params.get('view') || (DEMO === 'roadmap' ? 'roadmap' : DEMO === 'miss' ? 'missables' : DEMO === 'sources' ? 'sources' : 'checklist');
function renderView() {
  for (const btn of $('tabs').querySelectorAll('[data-view]')) {
    btn.classList.toggle('active', btn.dataset.view === view);
  }
  for (const v of ['checklist', 'roadmap', 'missables', 'sources']) {
    $('view-' + v).hidden = v !== view;
  }
  if (view === 'roadmap') renderRoadmap();
  if (view === 'missables') renderMissables();
  if (view === 'sources') renderSources();
}
function renderAll() {
  renderHeader(); renderAudit(); renderChips(); renderList(); renderDetail(); renderRail(); renderView();
}
for (const btn of $('tabs').querySelectorAll('[data-view]')) {
  btn.addEventListener('click', () => { view = btn.dataset.view; renderView(); });
}
$('spoiler').addEventListener('change', () => { state.spoiler = $('spoiler').checked; save(); renderAll(); });
$('search').addEventListener('input', () => { searchText = $('search').value.trim().toLowerCase(); renderList(); });
$('grade-filter').addEventListener('change', () => { gradeFilter = $('grade-filter').value; renderList(); });
$('export').addEventListener('click', () => {
  const payload = JSON.stringify({
    app: 'leonida-ledger', version: 1,
    earned: [...state.earned], counters: state.counters, spoiler: state.spoiler, revealed: [...state.revealed],
  }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('import').addEventListener('change', async () => {
  const file = $('import').files[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    state.earned = new Set((raw.earned ?? []).filter((id) => byId.has(id)));
    state.counters = raw.counters ?? {};
    state.spoiler = !!raw.spoiler;
    state.revealed = new Set(raw.revealed ?? []);
    save(); renderAll();
  } catch {
    $('saved-note').textContent = 'That file could not be read as progress.';
  }
  $('import').value = '';
});

renderAll();
