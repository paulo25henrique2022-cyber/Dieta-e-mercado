'use strict';
/* ===== Dieta e Compras — app pessoal (PWA) ===== */
const CHAVE = 'appDieta.v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n, d = 0) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const rs = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const z2 = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${z2(d.getMonth() + 1)}-${z2(d.getDate())}`;
const hoje = () => iso(new Date());
const fmtD = s => s.split('-').reverse().join('/');
const idxSeg = (d = new Date()) => (d.getDay() + 6) % 7;
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

/* ---------- estado ---------- */
let S;
function padrao() {
  return {
    perfil: { nome: '', foto: '', sexo: 'M', idade: 30, peso: 70, altura: 170, cintura: '', gordura: '', objetivo: 'manter', ritmo: 'moderado',
      acordar: '06:30', dormir: '22:30', restricoes: '', saude: '', suplementos: '',
      treinos: { karate: 'moderada', musculacao: 'moderada', natacao: 'moderada', yoga: 'leve', sabado: 'moderada' }, sabadoMin: 60, ajuste: 0 },
    nutri: {}, crono: { karate: {}, natacao: {}, musculacao: {}, yoga: {} }, pesagens: [],
    consumo: { data: hoje(), ids: [] },
    alimentos: JSON.parse(JSON.stringify(ALIMENTOS0)),
    receitas: RECEITAS0.map((r, i) => ({ ...r, id: 'r' + i })),
    listas: { bruto: {}, semanal: {} },
    orc: { saldo: 0, hist: [] }, novo: true,
  };
}
function carregar() { try { S = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { S = null; } if (!S) S = padrao(); if (!S.alimV106) { const t = new Set(S.alimentos.map(x => x.n)); ALIMENTOS0.filter(x => ALIM_NOVOS_106.includes(x.n) && !t.has(x.n)).forEach(x => S.alimentos.push({ ...x })); S.alimV106 = 1; } if (!S.unV109) { S.alimentos.forEach(a => { if (UN[a.n] && !a.u) a.u = UN[a.n]; }); S.unV109 = 1; } if (S.agua == null) S.agua = 0; if (navigator.storage?.persist) navigator.storage.persist().catch(() => {}); }
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch (e) { toast('Não foi possível salvar. Faça um backup.'); } }
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2300); }

/* ---------- cálculos (fontes no fim do arquivo) ---------- */
const MET = { // Compêndio de Atividades Físicas 2024
  karate: { leve: 5.3, moderada: 10.3, intensa: 10.3 },
  musculacao: { leve: 3.5, moderada: 4.25, intensa: 5.0 },
  natacao: { leve: 5.8, moderada: 8.0, intensa: 10.5 },
  yoga: { leve: 2.3, moderada: 3.5, intensa: 4.0 },
  sabado: { leve: 3.0, moderada: 4.4, intensa: 5.8 },
};
const TNOME = { karate: 'Karatê', musculacao: 'Musculação', natacao: 'Natação', yoga: 'Yoga', sabado: 'Treino de sábado' };
const OBJ = { perder: 'Perder gordura', ganhar: 'Ganhar massa', definicao: 'Definição', forca: 'Força e energia', manter: 'Manter' };
const min = h => { const [a, b] = (h || '0:0').split(':').map(Number); return a * 60 + b; };
const hm = m => `${z2(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${z2(Math.round(m % 60 + 60) % 60)}`;

function treinosDia(i) {
  const L = [];
  for (const k of ['karate', 'musculacao', 'natacao', 'yoga']) {
    const t = S.crono[k] && S.crono[k][i];
    if (t && t[0]) { let d = min(t[1]) - min(t[0]); if (!t[1] || d <= 0) d = 60; L.push({ k, ini: t[0], fim: t[1] || '', min: d }); }
  }
  if (i === 5 && S.perfil.sabadoMin > 0) L.push({ k: 'sabado', ini: '', fim: '', min: +S.perfil.sabadoMin });
  return L;
}
function calc(i) {
  const p = S.perfil, w = +p.peso || 70, h = +p.altura || 170, a = +p.idade || 30;
  const tmb = 10 * w + 6.25 * h - 5 * a + (p.sexo === 'F' ? -161 : 5);          // Mifflin-St Jeor
  const base = tmb * 1.2;                                                         // vida diária sem os treinos
  const tr = treinosDia(i).map(t => ({ ...t, kcal: (MET[t.k][p.treinos[t.k]] - 1) * w * t.min / 60 })); // MET líquido
  const gasto = base + tr.reduce((s, t) => s + t.kcal, 0);
  const rit = { lento: 0, moderado: 1, rapido: 2 }[p.ritmo] ?? 1;
  let kcal = gasto, nota = '';
  if (p.objetivo === 'perder') { const pct = [0.5, 0.75, 1][rit]; kcal = gasto - w * pct / 100 * 7700 / 7; nota = `déficit para perder ~${nf(pct, 2)}% do peso por semana`; }
  else if (p.objetivo === 'ganhar') { const pct = [10, 15, 20][rit]; kcal = gasto * (1 + pct / 100); nota = `superávit de ${pct}% (meta: +0,25 a 0,5% do peso por semana)`; }
  else if (p.objetivo === 'definicao') { kcal = gasto * 0.9; nota = 'déficit leve de 10% (recomposição: sem consenso único)'; }
  else nota = 'manutenção';
  kcal += +p.ajuste || 0;
  kcal = Math.max(kcal, tmb);
  const mm = p.gordura ? w * (1 - p.gordura / 100) : null;
  const ptn = { perder: mm ? 2.7 * mm : 2.2 * w, ganhar: 2.0 * w, definicao: 2.2 * w, forca: 1.8 * w, manter: 1.6 * w }[p.objetivo];
  const gord = kcal * (p.objetivo === 'perder' || p.objetivo === 'definicao' ? 0.25 : 0.30) / 9;
  const carb = Math.max(0, (kcal - ptn * 4 - gord * 9) / 4);
  const horasTr = tr.reduce((s, t) => s + t.min, 0) / 60;
  const agua = (p.sexo === 'F' ? 2.0 : 2.5) + 0.5 * horasTr;
  const auto = { kcal, ptn, carb, gord, fibra: kcal / 1000 * 14, agua };
  const n = S.nutri, m = {};
  for (const k in auto) m[k] = n[k] != null && n[k] !== '' ? +n[k] : auto[k];
  return { tmb, gasto, tr, m, auto, nota };
}
function refeicoes(i, m) {
  const p = S.perfil, a = min(p.acordar), d = min(p.dormir) < a ? min(p.dormir) + 1440 : min(p.dormir);
  const ini = a + 30, fim = d - 150, passo = (fim - ini) / 4;
  const N = [['Café da manhã', .2], ['Lanche', .1], ['Almoço', .3], ['Lanche / pré-treino', .15], ['Jantar', .25]];
  return N.map(([n, f], j) => ({ n, h: hm(ini + passo * j), kcal: m.kcal * f, ptn: m.ptn / 5, carb: m.carb * f, gord: m.gord * f }));
}

/* ---------- peso médio por unidade (g) — medidas caseiras aproximadas (TACO/UNICAMP; Pinheiro, Tabela para Avaliação de Consumo Alimentar em Medidas Caseiras) ---------- */
const UN = { 'ovo': 50, 'clara de ovo': 33, 'pão francês': 50, 'pão de forma tradicional': 25, 'pão integral': 25, 'pão sírio': 60, 'tortilha/wrap integral': 40, 'biscoito de arroz': 9,
  'banana': 80, 'banana-prata': 70, 'banana-nanica': 100, 'maçã': 130, 'pera': 130, 'laranja': 180, 'tangerina': 135, 'kiwi': 75, 'manga': 300, 'limão': 60, 'caqui': 110, 'figo': 50, 'ameixa': 40,
  'goiaba': 170, 'maracujá': 90, 'morango': 12, 'tomate-cereja': 10, 'acerola': 6, 'uva': 6, 'tomate': 100, 'cebola': 100, 'cenoura': 100, 'batata': 130, 'batata-doce': 150, 'batata-doce roxa': 150,
  'beterraba': 120, 'pepino': 150, 'pimentão': 130, 'berinjela': 250, 'abobrinha': 250, 'alho': 4, 'castanha-do-pará': 4, 'nozes': 5, 'mandioquinha': 90, 'inhame': 100 };
const unQ = (n, g) => { const a = AL(n); if (!a || !a.u) return 0; return Math.round(g / a.u * 2) / 2; };
const unTxt = (n, g) => { const q = unQ(n, g); return q ? ` <span class="un">(≈ ${nf(q, 1)} un.)</span>` : ''; };

/* ---------- nutrientes de receitas ---------- */
const AL = n => S.alimentos.find(a => a.n === n);
function totais(ings) {
  const t = { kcal: 0, proteina_g: 0, carbo_g: 0, gordura_g: 0, fibra_g: 0 };
  for (const i of ings) { const a = AL(i.alimento); if (!a) continue; for (const k in t) t[k] += (a[k] || 0) * i.g / 100; }
  return t;
}
function consumoHoje() {
  if (S.consumo.data !== hoje()) { S.consumo = { data: hoje(), ids: [], comidos: [] }; salvar(); }
  const t = { kcal: 0, ptn: 0, carb: 0, gord: 0, fibra: 0 };
  for (const id of S.consumo.ids) { const r = S.receitas.find(x => x.id === id); if (!r) continue; const q = totais(r.ingredientes);
    t.kcal += q.kcal; t.ptn += q.proteina_g; t.carb += q.carbo_g; t.gord += q.gordura_g; t.fibra += q.fibra_g; }
  return t;
}
function comidoHoje() { consumoHoje(); const C = S.consumo.comidos || []; let k = 0; for (const id of C) { if (!S.consumo.ids.includes(id)) continue; const r = S.receitas.find(x => x.id === id); if (r) k += totais(r.ingredientes).kcal; } return k; }

/* ---------- roteador ---------- */
const V = {}, ACT = {};
let rotaAtual = '';
function render() {
  const h = location.hash.slice(2) || '';
  rotaAtual = h; fechar();
  if (S.novo && h !== 'perfil') { location.hash = '#/perfil'; return; }
  const p = h.split('/'); const f = V[p[0] || 'inicio'] || V.inicio;
  $('#app').innerHTML = f(...p.slice(1)); window.scrollTo(0, 0);
}
function rerender() { const y = scrollY; $('#app').innerHTML = (V[rotaAtual.split('/')[0] || 'inicio'] || V.inicio)(...rotaAtual.split('/').slice(1)); scrollTo(0, y); }
function abrir(html, cls = '') { $('#modal').innerHTML = `<div class="fundo" data-act="fecharFundo"><div class="jan ${cls}">${html}</div></div>`; }
function fechar() { $('#modal').innerHTML = ''; }
ACT.fechar = fechar;
ACT.fecharFundo = (a, el, ev) => { if (ev.target === el) fechar(); };
document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (!el) return; const f = ACT[el.dataset.act]; if (f) f(el.dataset.arg, el, ev); });
document.addEventListener('change', ev => { const el = ev.target.closest('[data-chg]'); if (el && ACT[el.dataset.chg]) ACT[el.dataset.chg](el.dataset.arg, el, ev); });
document.addEventListener('input', ev => { const el = ev.target.closest('[data-inp]'); if (el && ACT[el.dataset.inp]) ACT[el.dataset.inp](el.dataset.arg, el, ev); });
window.addEventListener('hashchange', render);
const hot = (href, x, y, w, h, n) => `<a href="${href}" class="hot" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" aria-label="${n}"></a>`;
const hotN = (href, x, y, w, h, n, cor) => `<a href="${href}" class="hot" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" aria-label="${n}"><span class="rot" style="--c:${cor}">${n}</span></a>`;
const hotA = (act, arg, x, y, w, h, n) => `<a class="hot" data-act="${act}" data-arg="${arg}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" aria-label="${n}"></a>`;
const volta = (h = '#/') => `<a class="voltar" data-act="voltar" data-arg="${h}" aria-label="Voltar">‹</a>`;
let navegou = false; window.addEventListener('hashchange', () => { navegou = true; }, { once: true });
ACT.voltar = h => { if (navegou && history.length > 1) history.back(); else location.hash = h; };

/* ---------- tela inicial ---------- */
V.inicio = () => `<div class="arte"><img src="img/inicial.jpg" alt="Menu">
  ${hotN('#/dieta', 5, 25.6, 43.8, 26.2, 'DIETA', '#2f6e14')}${hotN('#/receitas', 51.3, 25.6, 43.8, 26.2, 'RECEITAS', '#b8560f')}
  ${hotN('#/mercado', 5, 53.3, 43.8, 27.6, 'MERCADO', '#8f1a12')}${hotN('#/casal', 51.3, 53.3, 43.8, 27.6, 'CASAL', '#9a6a12')}
  <a class="casal-top" href="#/perfil" style="left:auto;right:58px;top:10px;padding:2px 10px 2px 2px">${S.perfil.foto ? `<img class="av" style="width:36px;height:36px" src="${S.perfil.foto}">` : '<span class="av" style="width:36px;height:36px;font-size:18px">👤</span>'}<span style="font-size:13px"><b>${esc(S.perfil.nome)}</b><br><span class="obj" style="font-size:10px">${OBJ[S.perfil.objetivo]}</span></span></a>
  <a class="cfg" href="#/config" aria-label="Configurações">⚙️</a>${garrafa()}</div>`;
function garrafa() {
  const b = 'M40 6h20v10h-2v8c0 4 26 10 26 26v98c0 6-4 10-10 10H26c-6 0-10-4-10-10V50c0-16 26-22 26-26v-8h-2z';
  const marcas = Array.from({ length: 9 }, (_, i) => `<line x1="18" x2="${i % 2 ? 25 : 29}" y1="${aguaY(i + 1)}" y2="${aguaY(i + 1)}"/>`).join('');
  const bol = [[34, 0], [52, 1.3], [66, .6], [44, 2.1], [60, 2.8]].map(([x, d]) => `<circle class="bol" cx="${x}" cy="140" r="${1.6 + (x % 3) * .6}" style="animation-delay:${d}s"/>`).join('');
  return `<div class="garrafa" id="garrafa" aria-label="Garrafa de água: toque para tirar 1 litro, arraste para encher ou esvaziar">
   <svg viewBox="0 0 100 172"><defs><clipPath id="gcl"><path d="${b}"/></clipPath><linearGradient id="gag" x1="0" x2="1"><stop offset="0" stop-color="#1e88e5"/><stop offset=".5" stop-color="#4fc3f7"/><stop offset="1" stop-color="#1565c0"/></linearGradient></defs>
    <path d="${b}" fill="rgba(255,255,255,.10)"/>
    <g clip-path="url(#gcl)"><g id="gagua" style="transform:translateY(${aguaY(S.agua)}px)">
     <path class="onda o2" d="M-100 4q12.5-7 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0V200H-100z" fill="#0d47a1" opacity=".55"/>
     <path class="onda" d="M-100 4q12.5-7 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0V200H-100z" fill="url(#gag)" opacity=".9"/>
     <g class="bols">${bol}</g></g></g>
    <g stroke="rgba(255,255,255,.45)" stroke-width="1.2">${marcas}</g>
    <path d="${b}" fill="none" stroke="rgba(220,240,255,.8)" stroke-width="2"/><path d="M24 56v86" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-linecap="round"/>
    <rect x="38" y="0" width="24" height="9" rx="3" fill="#29b6f6"/></svg>
   <div class="gtx"><b id="glit">${S.agua} L</b><small>toque: −1 L<br>arraste: ↕</small></div></div>`;
}
const aguaY = l => 158 - l * 12.6;
function aguaSet(l) {
  l = Math.max(0, Math.min(10, l)); if (l === S.agua) return; S.agua = l; salvar();
  const g = $('#gagua'); if (g) g.style.transform = `translateY(${aguaY(l)}px)`; const t = $('#glit'); if (t) t.textContent = l + ' L';
  if (navigator.vibrate) navigator.vibrate(12);
}
(() => { let y0 = null, l0 = 0, arrastou = false;
  document.addEventListener('pointerdown', ev => { const g = ev.target.closest('#garrafa'); if (!g) return; y0 = ev.clientY; l0 = S.agua; arrastou = false; g.setPointerCapture?.(ev.pointerId); ev.preventDefault(); });
  document.addEventListener('pointermove', ev => { if (y0 === null) return; const d = y0 - ev.clientY; if (Math.abs(d) > 8) arrastou = true; if (arrastou) { const h = $('#garrafa svg').getBoundingClientRect().height; aguaSet(l0 + Math.round(d / Math.max(16, h * 0.0733))); } });
  const fim = () => { if (y0 === null) return; if (!arrastou) aguaSet(S.agua - 1); y0 = null; };
  document.addEventListener('pointerup', fim); document.addEventListener('pointercancel', () => { y0 = null; });
})();

/* ---------- CASAL ---------- */
const avatar = () => S.perfil.foto ? `<img class="av" src="${S.perfil.foto}" alt="">` : `<span class="av">👤</span>`;
V.casal = () => {
  const i = idxSeg(), c = calc(i), m = c.m;
  const ys = [39.8, 47.3, 54.8, 62.3, 69.8, 77.3, 84.8];
  return `<div class="arte"><img src="img/casal.jpg" alt="Casal">${volta()}
   <a class="casal-top" href="#/perfil" style="left:auto;right:3%">${avatar()}<span><b>${esc(S.perfil.nome)}</b> ⚙️<br><span class="obj">${OBJ[S.perfil.objetivo]}</span></span></a>
   <div class="meta" style="left:5%;top:26%;width:90%;height:12%;grid-template-columns:1fr 1fr 1fr">
    ${[['Calorias', m.kcal, 'kcal'], ['Proteína', m.ptn, 'g'], ['Carbo', m.carb, 'g'], ['Gordura', m.gord, 'g'], ['Fibras', m.fibra, 'g'], ['Água', m.agua, 'L']].map(([n, v, u]) => `<div class="m"><span>${n}</span><br><b>${nf(v, u === 'L' ? 1 : 0)} ${u}</b></div>`).join('')}
   </div>
   ${DIAS.map((d, j) => hotA('dia', j, 7, ys[j], 86, 6.4, d) + `<span class="dia-lbl" style="top:${ys[j] + 1.8}%">${treinosDia(j).map(t => TNOME[t.k].split(' ')[0]).join(' · ') || ''}${j === i ? ' · hoje' : ''}</span>`).join('')}
  </div>
  <div class="pag a" style="min-height:0;padding-top:12px">
   <label class="btn b">📥 Importar cronograma (PDF)<input type="file" accept="application/pdf,.pdf" hidden data-chg="importar"></label>
   <button class="btn sec" data-act="cronoManual">✏️ Ajustar horários dos treinos</button>
   <button class="btn sec" data-act="pesagem">⚖️ Registrar pesagem</button>
   <div class="cx sub">Hoje: ${c.nota}. Metas estimadas (erro típico de ±10%); a pesagem a cada 2 semanas corrige o cálculo.${Object.keys(S.nutri).length ? '<br><b>Valores do nutricionista em uso.</b>' : ''}</div>
  </div>`;
};
ACT.dia = a => {
  const i = +a, c = calc(i), m = c.m;
  const ed = (k, n, u, d = 0) => `<div class="ref"><span>${n}${S.nutri[k] != null ? ' <span class="tag">nutricionista</span>' : ''}</span><b>${nf(m[k], d)} ${u}</b></div>`;
  abrir(`<button class="x" data-act="fechar">×</button><h2>${DIAS[i]}</h2>
   <div class="cx"><b>Treinos</b>${c.tr.length ? c.tr.map(t => `<div class="ref"><span>${TNOME[t.k]} ${t.ini ? t.ini + '–' + t.fim : ''} · ${S.perfil.treinos[t.k]}</span><span>${t.min} min · ≈${nf(t.kcal)} kcal</span></div>`).join('') : '<div class="sub">Sem treino</div>'}</div>
   <div class="cx"><b>Meta do dia</b>${ed('kcal', 'Calorias', 'kcal')}${ed('ptn', 'Proteína', 'g')}${ed('carb', 'Carboidrato', 'g')}${ed('gord', 'Gordura', 'g')}${ed('fibra', 'Fibras', 'g')}${ed('agua', 'Água', 'L', 1)}
    <div class="sub" style="margin-top:6px">Gasto estimado: ${nf(c.gasto)} kcal (repouso ${nf(c.tmb)} kcal)</div>
    <button class="btn p sec" data-act="nutri">🩺 Valores do nutricionista</button></div>
   <div class="cx"><b>Refeições</b>${refeicoes(i, m).map(r => `<div class="ref"><span>${r.h} · ${r.n}</span><span>${nf(r.kcal)} kcal · P ${nf(r.ptn)} · C ${nf(r.carb)} · G ${nf(r.gord)}</span></div>`).join('')}
    <div class="sub" style="margin-top:6px">Proteína dividida igualmente entre as refeições, a cada 3–4 h. Nos dias de treino, faça uma das refeições 1–2 h antes e outra logo depois.</div></div>`, 'a');
};
ACT.nutri = () => {
  const c = calc(idxSeg()).auto, n = S.nutri;
  const f = (k, l) => `<label class="f">${l} (recomendado: ${nf(c[k], k === 'agua' ? 1 : 0)})</label><input type="number" step="any" id="n_${k}" value="${n[k] ?? ''}" placeholder="automático">`;
  abrir(`<button class="x" data-act="fechar">×</button><h2>Valores do nutricionista</h2><div class="sub">Deixe em branco para usar o cálculo automático. Estes valores não mudam com a pesagem.</div>
   ${f('kcal', 'Calorias (kcal)')}${f('ptn', 'Proteína (g)')}${f('carb', 'Carboidrato (g)')}${f('gord', 'Gordura (g)')}${f('fibra', 'Fibras (g)')}${f('agua', 'Água (L)')}
   <button class="btn b" data-act="nutriSalvar">Salvar</button><button class="btn sec" data-act="nutriLimpar">Voltar ao recomendado</button>`, 'a');
};
ACT.nutriSalvar = () => { S.nutri = {}; for (const k of ['kcal', 'ptn', 'carb', 'gord', 'fibra', 'agua']) { const v = $('#n_' + k).value; if (v !== '') S.nutri[k] = +v; } salvar(); toast('Valores salvos'); rerender(); };
ACT.nutriLimpar = () => { S.nutri = {}; salvar(); toast('Voltou ao recomendado'); rerender(); };
ACT.importar = (_, el) => {
  const f = el.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { const m = /%DADOS-APP-TREINO:([A-Za-z0-9+/=]+)/.exec(r.result); if (!m) return toast('Este PDF não tem um cronograma do App de Treino');
    try { const d = JSON.parse(decodeURIComponent(escape(atob(m[1])))); if (d.tipo !== 'cronograma') throw 0;
      S.crono = Object.assign({ karate: {}, natacao: {}, musculacao: {}, yoga: {} }, d.crono); salvar(); toast('Cronograma importado; metas recalculadas'); rerender(); } catch (e) { toast('Não consegui ler o PDF'); } };
  r.readAsBinaryString(f); el.value = '';
};
ACT.cronoManual = () => {
  const lin = DIAS.map((d, i) => `<tr><td>${d.slice(0, 3)}</td>${['karate', 'musculacao', 'natacao', 'yoga'].map(k => { const t = S.crono[k][i] || ['', '']; return `<td><input type="time" value="${t[0]}" data-chg="cronoH" data-arg="${k}|${i}|0" style="padding:4px;font-size:12px"><input type="time" value="${t[1]}" data-chg="cronoH" data-arg="${k}|${i}|1" style="padding:4px;font-size:12px"></td>`; }).join('')}</tr>`).join('');
  abrir(`<button class="x" data-act="fechar">×</button><h2>Horários dos treinos</h2><div class="sub">Início e fim. O normal é importar o PDF do App de Treino.</div>
   <div style="overflow-x:auto"><table class="tb"><tr><td></td><td>Karatê</td><td>Musc.</td><td>Natação</td><td>Yoga</td></tr>${lin}</table></div><button class="btn b" data-act="fecharRe">Pronto</button>`, 'a');
};
ACT.cronoH = (a, el) => { const [k, i, c] = a.split('|'); const o = S.crono[k]; o[i] = o[i] || ['', '']; o[i][c] = el.value; if (!o[i][0] && !o[i][1]) delete o[i]; salvar(); };
ACT.fecharRe = () => { fechar(); rerender(); };
ACT.pesagem = () => {
  const L = S.pesagens.slice(-6).reverse().map(p => `<div class="ref"><span>${fmtD(p.d)}</span><b>${nf(p.kg, 1)} kg</b></div>`).join('');
  abrir(`<button class="x" data-act="fechar">×</button><h2>Pesagem</h2><div class="sub">Pese-se a cada 2 semanas, em jejum, logo ao acordar. O app ajusta as calorias pelo resultado real.</div>
   <label class="f">Peso de hoje (kg)</label><input type="number" step="0.1" id="pesoN" value="${S.perfil.peso}"><button class="btn b" data-act="pesoSalvar">Salvar</button>${L}
   ${S.perfil.ajuste ? `<div class="aviso">Ajuste atual pela pesagem: ${S.perfil.ajuste > 0 ? '+' : ''}${S.perfil.ajuste} kcal/dia</div>` : ''}`, 'a');
};
ACT.pesoSalvar = () => {
  const kg = +$('#pesoN').value; if (!kg) return toast('Digite o peso'); const P = S.pesagens, ant = [...P].reverse().find(p => (new Date(hoje()) - new Date(p.d)) / 864e5 >= 10);
  P.push({ d: hoje(), kg }); let msg = 'Peso salvo';
  if (ant && !Object.keys(S.nutri).length) {
    const sem = (new Date(hoje()) - new Date(ant.d)) / 6048e5, pct = (kg - ant.kg) / ant.kg * 100 / sem, o = S.perfil.objetivo, rit = { lento: 0, moderado: 1, rapido: 2 }[S.perfil.ritmo] ?? 1;
    let alvo = 0; if (o === 'perder') alvo = -[0.5, 0.75, 1][rit]; else if (o === 'ganhar') alvo = [0.25, 0.375, 0.5][rit]; else if (o === 'definicao') alvo = -0.25;
    const dif = pct - alvo, tol = o === 'manter' || o === 'forca' ? 0.25 : 0.2;
    if (dif > tol) { S.perfil.ajuste -= 150; msg = 'Ritmo acima da meta: −150 kcal/dia'; } else if (dif < -tol) { S.perfil.ajuste += 150; msg = 'Ritmo abaixo da meta: +150 kcal/dia'; } else msg = 'Ritmo dentro da meta';
  }
  S.perfil.peso = kg; salvar(); toast(msg); fechar(); rerender();
};

/* ---------- perfil ---------- */
V.perfil = () => {
  const p = S.perfil, sel = (id, o, v) => `<select id="${id}">${Object.entries(o).map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  const INT = { leve: 'Leve', moderada: 'Moderada', intensa: 'Intensa' };
  return `<div class="pag a">${S.novo ? '' : volta('#/casal')}<h1>Perfil</h1>
  <div class="cx" style="text-align:center"><label style="cursor:pointer">${p.foto ? `<img class="av" style="width:90px;height:90px" src="${p.foto}">` : '<span class="av" style="width:90px;height:90px;margin:auto;font-size:40px">📷</span>'}<input type="file" accept="image/*" hidden data-chg="foto"></label><div class="sub">Toque para escolher a foto</div></div>
  <div class="cx"><label class="f">Nome</label><input id="p_nome" value="${esc(p.nome)}">
   <div class="g2"><div><label class="f">Sexo</label>${sel('p_sexo', { M: 'Masculino', F: 'Feminino' }, p.sexo)}</div><div><label class="f">Idade</label><input type="number" id="p_idade" value="${p.idade}"></div>
   <div><label class="f">Peso (kg)</label><input type="number" step="0.1" id="p_peso" value="${p.peso}"></div><div><label class="f">Altura (cm)</label><input type="number" id="p_altura" value="${p.altura}"></div>
   <div><label class="f">Cintura (cm, opcional)</label><input type="number" id="p_cintura" value="${p.cintura}"></div><div><label class="f">% de gordura (opcional)</label><input type="number" step="0.1" id="p_gordura" value="${p.gordura}"></div></div></div>
  <div class="cx"><label class="f">Objetivo</label>${sel('p_objetivo', OBJ, p.objetivo)}<label class="f">Ritmo</label>${sel('p_ritmo', { lento: 'Lento', moderado: 'Moderado', rapido: 'Rápido' }, p.ritmo)}
   <div class="g2"><div><label class="f">Acordo às</label><input type="time" id="p_acordar" value="${p.acordar}"></div><div><label class="f">Durmo às</label><input type="time" id="p_dormir" value="${p.dormir}"></div></div></div>
  <div class="cx"><b>Meus treinos</b><div class="sub">A intensidade usada em todos os cálculos.</div>
   ${Object.keys(TNOME).map(k => `<label class="f">${TNOME[k]} <span class="sub">(${MET[k][p.treinos[k]]} MET ≈ ${nf((MET[k][p.treinos[k]] - 1) * (p.peso || 70))} kcal/h)</span></label>${sel('t_' + k, INT, p.treinos[k])}`).join('')}
   <label class="f">Duração do treino de sábado (min; 0 = não faço)</label><input type="number" id="p_sabadoMin" value="${p.sabadoMin}"></div>
  <div class="cx"><label class="f">Restrições alimentares</label><input id="p_restricoes" value="${esc(p.restricoes)}"><label class="f">Saúde (condições, histórico)</label><input id="p_saude" value="${esc(p.saude)}"><label class="f">Suplementos</label><input id="p_suplementos" value="${esc(p.suplementos)}"></div>
  <button class="btn b" data-act="perfilSalvar">Salvar perfil</button></div>`;
};
ACT.foto = (_, el) => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), s = 300 / Math.max(im.width, im.height); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); S.perfil.foto = c.toDataURL('image/jpeg', .8); salvar(); rerender(); }; im.src = r.result; }; r.readAsDataURL(f); };
ACT.perfilSalvar = () => {
  const p = S.perfil, g = id => $('#' + id).value; if (!g('p_nome').trim()) return toast('Digite o nome');
  for (const k of ['nome', 'sexo', 'idade', 'peso', 'altura', 'cintura', 'gordura', 'objetivo', 'ritmo', 'acordar', 'dormir', 'restricoes', 'saude', 'suplementos', 'sabadoMin']) p[k] = g('p_' + k);
  for (const k of ['idade', 'peso', 'altura', 'sabadoMin']) p[k] = +p[k];
  for (const k in TNOME) p.treinos[k] = g('t_' + k);
  const era = S.novo; delete S.novo; salvar(); toast('Perfil salvo; metas recalculadas'); location.hash = era ? '#/' : '#/casal';
};

/* ---------- DIETA ---------- */
V.dieta = () => {
  const m = calc(idxSeg()).m, c = consumoHoje();
  const it = (n, v, t, u, d = 0) => { const p = t ? v / t * 100 : 0; return `<div class="m"><span>${n}</span> <b>${nf(v, d)}/${nf(t, d)}${u}</b><div class="bar"><i class="${p > 105 ? 'over' : ''}" style="width:${Math.min(p, 100)}%"></i></div></div>`; };
  return `<div class="arte"><img src="img/dieta.jpg" alt="Dieta">${volta()}
   <div class="meta big" style="left:7%;top:20.2%;width:86%;height:27%">
    ${it('Calorias', c.kcal, m.kcal, '')}${it('Gordura', c.gord, m.gord, 'g')}${it('Proteína', c.ptn, m.ptn, 'g')}${it('Fibras', c.fibra, m.fibra, 'g')}${it('Carbo', c.carb, m.carb, 'g')}<div class="m"><span>Água</span> <b>${nf(m.agua, 1)} L</b><div class="sub" style="font-size:10px">${OBJ[S.perfil.objetivo]}</div></div>
    ${(() => { const k = comidoHoje(), p = m.kcal ? k / m.kcal * 100 : 0; return `<div class="m comido"><span>✅ Consumido</span> <b>${nf(k)}/${nf(m.kcal)} kcal</b><div class="bar"><i class="${p > 105 ? 'over' : ''}" style="width:${Math.min(p, 100)}%"></i></div></div>`; })()}
   </div>
   ${hot('#/ingredientes', 3.5, 63.5, 93, 14.3, 'Ingredientes')}${hot('#/pratos', 3.5, 79.8, 93, 15.2, 'Pratos prontos')}</div>${planoDia()}`;
};
function planoDia() {
  const L = S.consumo.ids.map(id => S.receitas.find(r => r.id === id)).filter(Boolean);
  if (!S.consumo.plano || !L.length) return '';
  const A = horariosAuto(idxSeg()), E = S.consumo.horas || {}; const g = REF.map(ref => ({ ref, h: E[ref] || A[ref].h, ed: !!E[ref], por: A[ref].por, R: L.filter(r => r.refeicao === ref) })).filter(x => x.R.length).sort((a, b) => min(a.h) - min(b.h));
  const T = totais(L.flatMap(r => r.ingredientes));
  return `<div class="pag v" id="plano" style="padding-top:8px"><h1>📋 Refeições do dia</h1>
   <div class="cx sub">Total planejado: <b>${nf(T.kcal)} kcal</b> · P ${nf(T.proteina_g)} g · C ${nf(T.carbo_g)} g · G ${nf(T.gordura_g)} g · F ${nf(T.fibra_g)} g</div>
   ${g.map(x => `<div class="cx"><div class="ref" style="align-items:center"><b>${x.ref}</b><span>🕒 <input type="time" value="${x.h}" data-chg="horaRef" data-arg="${x.ref}" style="width:105px;padding:4px">${x.ed ? `<button class="ed" data-act="horaAuto" data-arg="${x.ref}" title="Voltar ao automático">↺</button>` : ''}</span></div><div class="sub" style="font-size:11px">${x.ed ? '✏️ Horário editado por você' : '⚙️ ' + x.por}</div>${x.R.map(r => { const t = totais(r.ingredientes), ok = (S.consumo.comidos || []).includes(r.id); return `<div class="pr ${ok ? 'comi' : ''}" style="margin-top:8px"><div class="ref" style="align-items:center"><span style="display:flex;gap:8px;align-items:center"><button class="chk ${ok ? 'on' : ''}" data-act="comido" data-arg="${r.id}" aria-label="Já comi">${ok ? '✓' : ''}</button><b>${esc(r.nome)}</b></span><span>${nf(t.kcal)} kcal</span></div><div class="sub">${r.ingredientes.map(i => esc(i.alimento) + ' ' + nf(i.g) + ' g' + unTxt(i.alimento, i.g)).join(' · ')}</div><div class="sub">P ${nf(t.proteina_g)} g · C ${nf(t.carbo_g)} g · G ${nf(t.gordura_g)} g · F ${nf(t.fibra_g)} g</div></div>`; }).join('')}</div>`).join('')}
   <button class="btn sec" onclick="location.hash='#/pratos'">✏️ Alterar refeições</button></div>`;
}

/* ingredientes + montar prato */
const CATS = ['Carnes e ovos', 'Laticínios', 'Grãos e cereais', 'Leguminosas', 'Legumes e verduras', 'Frutas', 'Gorduras e oleaginosas', 'Temperos e outros', 'Suplementos'];
let filtroCat = '', busca = '', prato = [];
V.ingredientes = () => {
  const L = S.alimentos.filter(a => (!filtroCat || a.c === filtroCat) && (!busca || a.n.toLowerCase().includes(busca.toLowerCase()))).sort((a, b) => a.n.localeCompare(b.n));
  const t = totais(prato.map(p => ({ alimento: p.n, g: p.g })));
  return `<div class="pag v">${volta('#/dieta')}<h1>Ingredientes</h1>
   <input placeholder="🔍 Buscar alimento" value="${esc(busca)}" data-inp="busca" id="bus" style="margin-bottom:8px">
   <div class="chips"><button class="chip ${!filtroCat ? 'on' : ''}" data-act="cat" data-arg="">Todos</button>${CATS.map(c => `<button class="chip ${filtroCat === c ? 'on' : ''}" data-act="cat" data-arg="${c}">${c}</button>`).join('')}</div>
   <button class="btn p g" data-act="alimEdit" data-arg="">+ Novo ingrediente</button>
   <div id="lst">${L.map(a => `<div class="it" data-act="addPrato" data-arg="${esc(a.n)}"><div class="n"><b>${esc(a.n)}</b><small>${a.u ? `1 un. ≈ ${nf(a.u)} g · ` : ''}100 g: ${nf(a.kcal)} kcal · P ${nf(a.proteina_g, 1)} · C ${nf(a.carbo_g, 1)} · G ${nf(a.gordura_g, 1)} · F ${nf(a.fibra_g, 1)}</small></div><button class="ed" data-act="alimEdit" data-arg="${esc(a.n)}" aria-label="Editar">✏️</button></div>`).join('')}</div>
   <div style="height:${prato.length ? 160 : 0}px"></div>
   ${prato.length ? `<div class="mont"><b>Meu prato</b> <span class="sub">(${prato.length} itens)</span><div style="max-height:90px;overflow-y:auto">${prato.map((p, i) => `<div style="display:flex;gap:6px;align-items:center;margin:3px 0"><span style="flex:1;font-size:13px">${esc(p.n)}</span>${AL(p.n)?.u ? `<input type="number" inputmode="decimal" step="0.5" min="0" value="${unQ(p.n, p.g)}" data-chg="pratoU" data-arg="${i}" style="width:54px;padding:5px">un` : ''}<input type="number" value="${p.g}" data-chg="pratoG" data-arg="${i}" style="width:66px;padding:5px">g<button class="ed" data-act="pratoDel" data-arg="${i}">✕</button></div>`).join('')}</div>
    <div style="font-size:13px;margin:4px 0"><b>${nf(t.kcal)} kcal</b> · P ${nf(t.proteina_g)} g · C ${nf(t.carbo_g)} g · G ${nf(t.gordura_g)} g · F ${nf(t.fibra_g)} g</div>
    <div class="g2"><button class="btn sec" data-act="pratoLimpar" style="margin:0">Limpar</button><button class="btn g" data-act="pratoSalvar" style="margin:0">Salvar prato</button></div></div>` : ''}</div>`;
};
ACT.cat = a => { filtroCat = a; rerender(); };
ACT.busca = (_, el) => { busca = el.value; const pos = el.selectionStart; rerender(); const n = $('#bus'); n.focus(); n.setSelectionRange(pos, pos); };
ACT.addPrato = (n, el, ev) => { if (ev.target.closest('.ed')) return; const u = AL(n)?.u; prato.push({ n, g: u || 100 }); toast(u ? `${n}: 1 unidade (≈ ${u} g) no prato` : `${n}: 100 g no prato (ajuste as gramas)`); rerender(); };
ACT.pratoU = (i, el) => { prato[i].g = Math.round((+el.value || 0) * AL(prato[i].n).u); rerender(); };
ACT.pratoG = (i, el) => { prato[i].g = +el.value || 0; rerender(); };
ACT.pratoDel = i => { prato.splice(i, 1); rerender(); };
ACT.pratoLimpar = () => { prato = []; rerender(); };
ACT.pratoSalvar = () => abrir(`<button class="x" data-act="fechar">×</button><h2>Salvar prato</h2><label class="f">Nome do prato</label><input id="pr_nome"><label class="f">Categoria</label><select id="pr_cat">${REF.map(r => `<option>${r}</option>`).join('')}</select>
  <label class="f">Modo de preparo (opcional)</label><textarea id="pr_passos"></textarea><label class="f">Link do vídeo (opcional)</label><input id="pr_link" placeholder="https://">
  <button class="btn g" data-act="pratoOk">Salvar em Pratos prontos e Receitas</button>`, 'v');
ACT.pratoOk = () => {
  const n = $('#pr_nome').value.trim(); if (!n) return toast('Dê um nome ao prato');
  S.receitas.push({ id: 'u' + Date.now(), nome: n, refeicao: $('#pr_cat').value, ingredientes: prato.map(p => ({ alimento: p.n, g: p.g })), passos: $('#pr_passos').value.split('\n').filter(Boolean), modos: [], temperos: [], dica: '', link_youtube: $('#pr_link').value.trim(), meu: true });
  prato = []; salvar(); toast('Prato salvo'); fechar(); rerender();
};
ACT.alimEdit = (n, el, ev) => {
  ev && ev.stopPropagation(); const a = n ? AL(n) : { n: '', c: CATS[0], kcal: '', proteina_g: '', carbo_g: '', gordura_g: '', fibra_g: '' };
  const f = (k, l) => `<div><label class="f">${l}</label><input type="number" step="any" id="a_${k}" value="${a[k]}"></div>`;
  abrir(`<button class="x" data-act="fechar">×</button><h2>${n ? 'Editar' : 'Novo'} ingrediente</h2><div class="sub">Valores por 100 g.</div>
   <label class="f">Nome</label><input id="a_n" value="${esc(a.n)}"><label class="f">Categoria</label><select id="a_c">${CATS.map(c => `<option ${c === a.c ? 'selected' : ''}>${c}</option>`).join('')}</select>
   <div class="g2">${f('kcal', 'Calorias')}${f('proteina_g', 'Proteína (g)')}${f('carbo_g', 'Carboidrato (g)')}${f('gordura_g', 'Gordura (g)')}${f('fibra_g', 'Fibra (g)')}<div><label class="f">Peso de 1 unidade (g)</label><input type="number" step="any" id="a_u" value="${a.u || ''}" placeholder="não se conta"></div></div>
   <button class="btn g" data-act="alimOk" data-arg="${esc(n)}">Salvar</button>${n ? `<button class="btn sec" data-act="alimDel" data-arg="${esc(n)}">Apagar</button>` : ''}`, 'v');
};
ACT.alimOk = ant => {
  const nn = $('#a_n').value.trim(); if (!nn) return toast('Digite o nome'); if (nn !== ant && AL(nn)) return toast('Já existe um ingrediente com esse nome');
  const o = { n: nn, c: $('#a_c').value }; for (const k of ['kcal', 'proteina_g', 'carbo_g', 'gordura_g', 'fibra_g']) o[k] = +$('#a_' + k).value || 0; o.u = +$('#a_u').value || 0; if (!o.u) delete o.u;
  if (ant) { const A0 = AL(ant); delete A0.u; Object.assign(A0, o); if (nn !== ant) S.receitas.forEach(r => r.ingredientes.forEach(i => { if (i.alimento === ant) i.alimento = nn; })); } else S.alimentos.push(o);
  salvar(); toast('Ingrediente salvo'); fechar(); rerender();
};
ACT.alimDel = n => { if (S.receitas.some(r => r.ingredientes.some(i => i.alimento === n))) return toast('Está em uma receita; edite a receita antes'); if (!confirm('Apagar ' + n + '?')) return; S.alimentos = S.alimentos.filter(a => a.n !== n); salvar(); fechar(); rerender(); };

/* pratos prontos */
let buscaP = '', catP = '';
const REF = ['Café da manhã', 'Almoço', 'Jantar', 'Lanche / pré-treino', 'Ceia'];
V.pratos = () => {
  const c = consumoHoje(), m = calc(idxSeg()).m;
  const L = S.receitas.filter(r => (!catP || r.refeicao === catP) && (!buscaP || r.nome.toLowerCase().includes(buscaP.toLowerCase())));
  return `<div class="pag v">${volta('#/dieta')}<h1>Pratos prontos</h1>
   <div class="cx sub">Hoje: <b>${nf(c.kcal)}/${nf(m.kcal)} kcal</b> · P ${nf(c.ptn)}/${nf(m.ptn)} g · C ${nf(c.carb)}/${nf(m.carb)} g · G ${nf(c.gord)}/${nf(m.gord)} g. Toque nos pratos que vai comer hoje (toque de novo para desmarcar) e depois gere as refeições do dia.</div>
   ${S.consumo.ids.length ? `<button class="btn g" data-act="gerarDia">📋 Gerar refeições do dia (${S.consumo.ids.length})</button>` : ''}
   <input placeholder="🔍 Buscar prato" value="${esc(buscaP)}" data-inp="buscaP" id="bus" style="margin-bottom:8px">
   <div class="chips"><button class="chip ${!catP ? 'on' : ''}" data-act="catP" data-arg="">Todos</button>${REF.map(r => `<button class="chip ${catP === r ? 'on' : ''}" data-act="catP" data-arg="${r}">${r}</button>`).join('')}</div>
   ${L.map(r => { const t = totais(r.ingredientes), on = S.consumo.ids.includes(r.id); return `<div class="it ${on ? 'on' : ''}" data-act="comer" data-arg="${r.id}"><div class="n"><b>${on ? '✓ ' : ''}${esc(r.nome)}</b><small>${nf(t.kcal)} kcal · P ${nf(t.proteina_g)} g · C ${nf(t.carbo_g)} g · G ${nf(t.gordura_g)} g · F ${nf(t.fibra_g)} g</small></div><button class="ed" data-act="recEdit" data-arg="${r.id}" aria-label="Editar">✏️</button></div>`; }).join('')}</div>`;
};
ACT.buscaP = (_, el) => { buscaP = el.value; const pos = el.selectionStart; rerender(); const n = $('#bus'); n.focus(); n.setSelectionRange(pos, pos); };
ACT.horaRef = (ref, el) => { consumoHoje(); (S.consumo.horas ||= {})[ref] = el.value; if (!el.value) delete S.consumo.horas[ref]; salvar(); rerender(); setTimeout(() => $('#plano')?.scrollIntoView(), 50); };
ACT.horaAuto = ref => { delete (S.consumo.horas || {})[ref]; salvar(); rerender(); setTimeout(() => $('#plano')?.scrollIntoView(), 50); };
/* Horários automáticos (ISSN Position Stands: Nutrient Timing 2017 e Protein and Exercise 2017; Snijders et al. 2019):
   café até ~30 min após acordar; refeição 1–3 h antes do treino (usamos 1h30); refeição com proteína até ~2 h após (usamos 1 h);
   intervalos de 3–4 h entre refeições com proteína; ceia proteica 30–90 min antes de dormir. */
function horariosAuto(i) {
  const W = min(S.perfil.acordar || '07:00'); let D = min(S.perfil.dormir || '23:00'); if (D <= W) D += 1440;
  const H = { 'Café da manhã': [W + 30, '30 min depois de acordar'], 'Almoço': [Math.max(750, W + 270), 'intervalo de 3–4 h entre refeições'],
    'Jantar': [Math.max(1080, D - 180), '3 h antes de dormir'], 'Ceia': [D - 60, '1 h antes de dormir (proteína lenta ajuda a recuperação noturna)'] };
  H['Lanche / pré-treino'] = [Math.round((H['Almoço'][0] + H['Jantar'][0]) / 2), 'entre o almoço e o jantar'];
  const TN = { karate: 'do karatê', musculacao: 'da musculação', natacao: 'da natação', sabado: 'do treino de sábado' };
  const T = treinosDia(i).filter(t => t.k !== 'yoga' && t.ini).map(t => ({ n: TN[t.k], s: min(t.ini), e: t.fim ? min(t.fim) : min(t.ini) + t.min })).sort((a, b) => a.s - b.s);
  const usado = new Set();
  for (const t of T) {
    const pos = ['Almoço', 'Jantar', 'Ceia'].find(r => !usado.has(r) && H[r][0] > t.s);
    if (pos) { H[pos] = [Math.min(t.e + 60, pos === 'Ceia' ? D - 30 : 1e9), `1 h depois ${t.n} (recuperação)`]; usado.add(pos); }
    const ant = Object.keys(H).filter(r => H[r][0] < t.s).sort((a, b) => H[b][0] - H[a][0])[0];
    const gap = ant ? t.s - H[ant][0] : 0, pre = t.n.replace(/^d[oa] /, '');
    if (t.s < W + 150) { H['Café da manhã'] = [W + 30, `30 min depois de acordar · leve, pois é o pré-treino (${pre})`]; }
    else if (ant && gap >= 60 && gap <= 180) H[ant] = [H[ant][0], H[ant][1] + ` · também serve de pré-treino (${pre})`];
    else if (!usado.has('Lanche / pré-treino')) { H['Lanche / pré-treino'] = [t.s - 90, `1h30 antes ${t.n} (energia para o treino)`]; usado.add('Lanche / pré-treino'); }
  }
  const R = {}; for (const r in H) R[r] = { h: hm(H[r][0]), por: H[r][1] }; return R;
}
ACT.comido = id => { consumoHoje(); const C = (S.consumo.comidos ||= []), i = C.indexOf(id); i < 0 ? C.push(id) : C.splice(i, 1); salvar(); if (navigator.vibrate) navigator.vibrate(15); rerender(); };
ACT.gerarDia = () => { S.consumo.plano = true; salvar(); location.hash = '#/dieta'; setTimeout(() => $('#plano')?.scrollIntoView({ behavior: 'smooth' }), 350); };
ACT.catP = a => { catP = a; rerender(); };
ACT.comer = (id, el, ev) => { if (ev.target.closest('.ed')) return; consumoHoje(); const L = S.consumo.ids, i = L.indexOf(id); i < 0 ? L.push(id) : L.splice(i, 1); salvar(); rerender(); };

/* receitas */
V.receitas = (cat, q) => {
  if (cat === undefined) return `<div class="arte"><img src="img/receitas.jpg" alt="Receitas">${volta('#/dieta')}
   ${REF.map((r, i) => hot('#/receitas/' + i, 4.2, [28.1, 41.8, 55.2, 68.4, 81.8][i], 91.7, 12, r)).join('')}</div>`;
  const nome = REF[+cat], L = S.receitas.filter(r => r.refeicao === nome && (!buscaR || r.nome.toLowerCase().includes(buscaR.toLowerCase()))).sort((a, b) => a.nome.localeCompare(b.nome));
  return `<div class="pag l">${volta('#/receitas')}<h1>${nome}</h1>
   <input placeholder="🔍 Buscar receita" value="${esc(buscaR)}" data-inp="buscaR" id="bus" style="margin-bottom:8px">
   <button class="btn p o" data-act="recEdit" data-arg="novo|${cat}">+ Nova receita</button>
   ${L.map(r => `<div class="it" data-act="recVer" data-arg="${r.id}"><div class="n"><b>${esc(r.nome)}</b><small>${r.tempo_min ? r.tempo_min + ' min · ' : ''}${nf(totais(r.ingredientes).kcal)} kcal${r.link_youtube ? ' · 🎬 vídeo' : ''}${r.meu ? ' · minha' : ''}</small></div><span>›</span></div>`).join('') || '<div class="cx sub">Nenhuma receita.</div>'}</div>`;
};
let buscaR = '';
ACT.buscaR = (_, el) => { buscaR = el.value; const pos = el.selectionStart; rerender(); const n = $('#bus'); n.focus(); n.setSelectionRange(pos, pos); };
ACT.recVer = id => {
  const r = S.receitas.find(x => x.id === id), t = totais(r.ingredientes);
  abrir(`<button class="x" data-act="fechar">×</button><h2>${esc(r.nome)}</h2><div class="sub">${r.refeicao} · porção para 1 pessoa${r.tempo_min ? ' · ' + r.tempo_min + ' min' : ''}</div>
   <div class="cx"><b>${nf(t.kcal)} kcal</b> · P ${nf(t.proteina_g)} g · C ${nf(t.carbo_g)} g · G ${nf(t.gordura_g)} g · F ${nf(t.fibra_g)} g</div>
   <div class="cx"><b>Ingredientes</b>${r.ingredientes.map(i => `<div class="ref"><span>${esc(i.alimento)}</span><span>${nf(i.g)} g${unTxt(i.alimento, i.g)}</span></div>`).join('')}</div>
   ${r.passos?.length ? `<div class="cx"><b>Modo de preparo</b><ol style="padding-left:20px;margin:6px 0">${r.passos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>${(r.modos || []).map(m => `<div class="sub"><b>${esc(m.modo)}:</b> ${esc(m.como)}</div>`).join('')}</div>` : ''}
   ${r.dica ? `<div class="aviso">💡 ${esc(r.dica)}</div>` : ''}
   <div class="cx"><b>🎬 Link do vídeo</b><input id="lk" value="${esc(r.link_youtube || '')}" placeholder="YouTube, Reels, TikTok…" style="margin-top:6px"><div class="g2"><button class="btn p sec" data-act="linkSalvar" data-arg="${id}">Salvar link</button>${r.link_youtube ? `<a class="btn p o" href="${esc(r.link_youtube)}" target="_blank" rel="noopener">Abrir vídeo</a>` : ''}</div></div>
   <button class="btn sec" data-act="recEdit" data-arg="${id}">✏️ Editar receita</button>`, 'r');
};
ACT.linkSalvar = id => { S.receitas.find(x => x.id === id).link_youtube = $('#lk').value.trim(); salvar(); toast('Link salvo'); ACT.recVer(id); };
let edIng = [];
ACT.recEdit = (a, el, ev) => {
  ev && ev.stopPropagation(); const [id, cat] = a.split('|'); const r = id === 'novo' ? { id: '', nome: '', refeicao: REF[+cat], ingredientes: [], passos: [], link_youtube: '', tempo_min: '' } : S.receitas.find(x => x.id === id);
  edIng = r.ingredientes.map(i => ({ ...i })); recForm(r);
};
function recForm(r) {
  const opts = S.alimentos.map(a => a.n).sort((a, b) => a.localeCompare(b));
  abrir(`<button class="x" data-act="fechar">×</button><h2>${r.id ? 'Editar' : 'Nova'} receita</h2>
   <label class="f">Nome</label><input id="r_nome" value="${esc(r.nome)}"><div class="g2"><div><label class="f">Categoria</label><select id="r_cat">${REF.map(x => `<option ${x === r.refeicao ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div><label class="f">Tempo (min)</label><input type="number" id="r_tempo" value="${r.tempo_min || ''}"></div></div>
   <label class="f">Ingredientes (gramas para 1 pessoa)</label><div id="r_ings">${edIng.map((i, k) => `<div style="display:flex;gap:4px;margin:3px 0"><select data-chg="ingN" data-arg="${k}" style="flex:1">${opts.map(o => `<option ${o === i.alimento ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${AL(i.alimento)?.u ? `<input type="number" inputmode="decimal" step="0.5" min="0" value="${unQ(i.alimento, i.g)}" data-chg="ingU" data-arg="${k}" style="width:60px" title="unidades"><span style="align-self:center;font-size:12px">un</span>` : ''}<input type="number" value="${i.g}" data-chg="ingG" data-arg="${k}" style="width:64px"><span style="align-self:center;font-size:12px">g</span><button class="ed" data-act="ingDel" data-arg="${k}">✕</button></div>`).join('')}</div>
   <button class="btn p sec" data-act="ingAdd">+ Ingrediente</button>
   <label class="f">Modo de preparo (um passo por linha)</label><textarea id="r_passos">${esc((r.passos || []).join('\n'))}</textarea>
   <label class="f">Link do vídeo</label><input id="r_link" value="${esc(r.link_youtube || '')}">
   <button class="btn o" data-act="recOk" data-arg="${r.id}">Salvar</button>${r.id ? `<button class="btn sec" data-act="recDel" data-arg="${r.id}">Apagar receita</button>` : ''}`, 'r');
  recForm.r = r;
}
ACT.ingN = (k, el) => { snap(); edIng[k].alimento = el.value; setTimeout(() => recForm(recForm.r)); };
ACT.ingU = (k, el) => { snap(); edIng[k].g = Math.round((+el.value || 0) * AL(edIng[k].alimento).u); setTimeout(() => recForm(recForm.r)); };
ACT.ingG = (k, el) => { snap(); edIng[k].g = +el.value || 0; setTimeout(() => recForm(recForm.r)); };
ACT.ingDel = k => { snap(); edIng.splice(k, 1); recForm(recForm.r); };
ACT.ingAdd = () => { snap(); edIng.push({ alimento: S.alimentos[0].n, g: 100 }); recForm(recForm.r); };
function snap() { const r = recForm.r; recForm.r = { ...r, nome: $('#r_nome').value, refeicao: $('#r_cat').value, tempo_min: $('#r_tempo').value, passos: $('#r_passos').value.split('\n'), link_youtube: $('#r_link').value }; }
ACT.recOk = id => {
  const n = $('#r_nome').value.trim(); if (!n) return toast('Digite o nome'); if (!edIng.length) return toast('Adicione ingredientes');
  const o = { nome: n, refeicao: $('#r_cat').value, tempo_min: +$('#r_tempo').value || '', ingredientes: edIng.filter(i => i.g > 0), passos: $('#r_passos').value.split('\n').map(s => s.trim()).filter(Boolean), link_youtube: $('#r_link').value.trim() };
  if (id) Object.assign(S.receitas.find(x => x.id === id), o); else S.receitas.push({ id: 'u' + Date.now(), modos: [], temperos: [], dica: '', meu: true, ...o });
  salvar(); toast('Receita salva'); fechar(); rerender();
};
ACT.recDel = id => { if (!confirm('Apagar esta receita?')) return; S.receitas = S.receitas.filter(x => x.id !== id); S.consumo.ids = S.consumo.ids.filter(x => x !== id); salvar(); fechar(); rerender(); };

/* ---------- MERCADO ---------- */
const SETORES = ['Hortifrúti', 'Padaria', 'Açougue', 'Frios e laticínios', 'Congelados', 'Mercearia básica', 'Massas e molhos', 'Temperos e condimentos', 'Biscoitos e snacks', 'Doces e sobremesas', 'Saudáveis e naturais', 'Bebidas', 'Higiene pessoal', 'Limpeza', 'Utilidades domésticas', 'Pet'];
const ORDEM_ARTE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // esquerda/direita, linha a linha
V.mercado = () => `<div class="arte"><img src="img/mercado.jpg" alt="Mercado">${volta()}
  ${hot('#/lista/bruto', 2.6, 43.4, 94.6, 14.8, 'Bruto')}${hot('#/lista/semanal', 2.6, 60, 94.6, 14.8, 'Semanal')}${hot('#/orcamento', 2.6, 76.9, 94.6, 14.8, 'Orçamento')}</div>`;
const itens = t => S.listas[t];
function totalLista(t) { let s = 0, n = 0; for (const k in itens(t)) for (const x of itens(t)[k]) if (x.ok) { s += (+x.q || 0) * (+x.p || 0); n++; } return { s, n }; }
V.lista = (t, setor) => {
  const T = totalLista(t), nome = t === 'bruto' ? 'Bruto' : 'Semanal';
  if (setor !== undefined) {
    const L = itens(t)[setor] || [];
    return `<div class="pag r couro" style="background-attachment:scroll">${volta('#/lista/' + t)}<h1>${SETORES[setor]}</h1>
     <div style="display:flex;gap:6px;margin-bottom:10px"><input id="novoItem" placeholder="Nome do item (ex.: Pano de chão)"><button class="btn p" data-act="itemAdd" data-arg="${t}|${setor}" style="margin:0;font-size:20px">+</button></div>
     ${L.length ? '<div class="cab"><span>Item</span><span>Qtd</span><span>R$ un.</span><span style="text-align:right">Soma</span><span></span></div>' : '<div class="cx sub">Adicione os itens antes de ir ao mercado. No mercado, preencha a quantidade e o preço da unidade e toque em OK.</div>'}
     ${L.map((x, i) => { const s = (+x.q || 0) * (+x.p || 0); return `<div class="linha ${x.ok ? 'ok' : ''}"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-act="itemDel" data-arg="${t}|${setor}|${i}">${esc(x.n)}</span>
       <input type="number" inputmode="decimal" min="0" step="any" value="${x.q}" data-chg="itemV" data-arg="${t}|${setor}|${i}|q"><input type="number" inputmode="decimal" min="0" step="any" value="${x.p}" data-chg="itemV" data-arg="${t}|${setor}|${i}|p">
       <span class="s">${s ? rs(s) : '—'}</span><button class="okb" data-act="itemOk" data-arg="${t}|${setor}|${i}">${x.ok ? '✓' : 'OK'}</button></div>`; }).join('')}
     ${L.length ? '<div class="sub">Toque no nome do item para apagá-lo.</div>' : ''}
     <div class="rodape"><span>🛒 Total da compra</span><span>${rs(T.s)}</span></div></div>`;
  }
  const H = 83.5, y0 = 16.5;
  const resumo = Object.keys(itens(t)).map(k => [k, itens(t)[k].filter(x => x.ok)]).filter(([, v]) => v.length);
  return `<div style="background:#3a0c08;min-height:100vh;padding-bottom:70px">${volta('#/mercado')}
   <div class="fatia" style="background-image:url(img/${t}.jpg);aspect-ratio:900/${1405 * y0 / 100}"></div>
   <div class="resumo"><div style="text-align:center;font-family:Georgia,serif;font-size:19px;font-weight:700;margin-bottom:6px">🧾 Resumo da compra</div>
    <div class="l"><span>Itens marcados</span><b>${T.n}</b></div><div class="l"><span>Gasto nesta compra</span><b>${rs(T.s)}</b></div>
    <div class="l"><span>Saldo do orçamento</span><span>${rs(S.orc.saldo)}</span></div><div class="l"><span>Saldo após a compra</span><b>${rs(S.orc.saldo - T.s)}</b></div>
    ${resumo.length ? `<div style="max-height:150px;overflow-y:auto;font-size:12.5px;margin-top:6px;border-top:1px solid #e9b65c66;padding-top:6px">${resumo.map(([k, v]) => `<b>${SETORES[k]}</b>${v.map(x => `<div class="l"><span>${esc(x.n)} ${nf(x.q, 2)} × ${rs(x.p)}</span><span>${rs(x.q * x.p)}</span></div>`).join('')}`).join('')}</div>` : ''}
    <div class="g2" style="margin-top:8px"><button class="btn p sec" data-act="compraPdf" data-arg="${t}" style="margin:0;width:100%">📄 Baixar PDF</button><button class="btn p g" data-act="compraOk" data-arg="${t}" style="margin:0;width:100%">✔ Compra concluída</button></div>
    <button class="btn p sec" data-act="zerar" data-arg="${t}" style="width:100%;margin:6px 0 0">🗑 Zerar compras</button></div>
   <div class="fatia" style="background-image:url(img/${t}.jpg);background-position:0 100%;aspect-ratio:900/${1405 * H / 100}">
    ${ORDEM_ARTE.map((s, j) => { const col = j % 2, lin = Math.floor(j / 2), n = (itens(t)[s] || []).length;
      return `<a class="hot" href="#/lista/${t}/${s}" style="left:${col ? 50.8 : 2.8}%;top:${(17.6 + 10 * lin - y0) / H * 100}%;width:46.4%;height:${9.3 / H * 100}%">${n ? `<span class="tag" style="position:absolute;right:6px;top:4px;background:#2f5d12">${(itens(t)[s]).filter(x => x.ok).length}/${n}</span>` : ''}</a>`; }).join('')}
   </div>
   <div class="rodape"><span>🛒 Total da compra</span><span>${rs(T.s)}</span></div></div>`;
};
const parte = a => a.split('|');
ACT.itemAdd = a => { const [t, s] = parte(a), n = $('#novoItem').value.trim(); if (!n) return toast('Digite o nome do item'); (itens(t)[s] = itens(t)[s] || []).push({ n, q: '', p: '', ok: false }); salvar(); rerender(); setTimeout(() => $('#novoItem')?.focus(), 50); };
ACT.itemV = (a, el) => { const [t, s, i, k] = parte(a); itens(t)[s][i][k] = el.value.replace(',', '.'); salvar(); rerender(); };
ACT.itemOk = a => { const [t, s, i] = parte(a), x = itens(t)[s][i]; if (!x.ok && (!(+x.q) || !(+x.p))) return toast('Preencha a quantidade e o preço'); x.ok = !x.ok; salvar(); rerender(); };
ACT.itemDel = a => { const [t, s, i] = parte(a); if (!confirm(`Apagar "${itens(t)[s][i].n}"?`)) return; itens(t)[s].splice(i, 1); salvar(); rerender(); };
ACT.zerar = t => { if (!confirm('Tem certeza? Todos os itens desta lista serão apagados.')) return; S.listas[t] = {}; salvar(); toast('Lista zerada'); rerender(); };
ACT.compraOk = t => {
  const T = totalLista(t); if (!T.n) return toast('Nenhum item marcado com OK');
  const nome = t === 'bruto' ? 'Bruto' : 'Semanal';
  abrir(`<button class="x" data-act="fechar">×</button><h2>Concluir compra · ${nome}</h2>
   <div class="ref"><span>Gasto</span><b>${rs(T.s)}</b></div><div class="ref"><span>Saldo antes</span><span>${rs(S.orc.saldo)}</span></div><div class="ref"><span>Saldo restante</span><b>${rs(S.orc.saldo - T.s)}</b></div>
   <button class="btn sec" data-act="compraPdf" data-arg="${t}">📄 Baixar PDF</button><button class="btn g" data-act="compraConf" data-arg="${t}">Confirmar e descontar do orçamento</button>`, 'r');
};
ACT.compraConf = t => {
  const T = totalLista(t); S.orc.saldo -= T.s; S.orc.hist.push({ d: hoje(), tipo: t === 'bruto' ? 'Compra Bruto' : 'Compra Semanal', v: -T.s, saldo: S.orc.saldo });
  salvar(); fechar(); toast('Compra registrada no orçamento'); rerender();
};

/* PDF simples (texto) */
const latin1 = t => String(t).normalize('NFC').replace(/[^\x00-\xff]/g, c => ({ '—': '-', '–': '-', '×': 'x', '“': '"', '”': '"', '’': "'" }[c] || '?'));
function pdfTexto(linhas) {
  const pe = t => latin1(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const pags = []; let st = 'BT\n', y = 800;
  for (const [txt, tam = 11, cor = '0 0 0'] of linhas) { if (y < 50) { pags.push(st + 'ET'); st = 'BT\n'; y = 800; } st += `/F1 ${tam} Tf ${cor} rg 1 0 0 1 50 ${y} Tm (${pe(txt)}) Tj\n`; y -= tam + 7; }
  pags.push(st + 'ET');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pags.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pags.length} >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  pags.forEach((s, i) => { objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`); objs.push(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`); });
  let out = '%PDF-1.4\n'; const off = []; objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xr = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  const b = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255; return new Blob([b], { type: 'application/pdf' });
}
function baixar(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
ACT.compraPdf = t => {
  const T = totalLista(t), nome = t === 'bruto' ? 'BRUTO' : 'SEMANAL';
  const L = [[`COMPRA ${nome} - ${fmtD(hoje())}`, 18, '0.5 0.1 0.05'], [`Gasto: ${rs(T.s)}   Saldo antes: ${rs(S.orc.saldo)}   Saldo restante: ${rs(S.orc.saldo - T.s)}`, 11], ['', 6]];
  SETORES.forEach((n, k) => { const v = (itens(t)[k] || []).filter(x => x.ok); if (!v.length) return; L.push([n.toUpperCase(), 12, '0.5 0.1 0.05']); v.forEach(x => L.push([`   ${x.n}   ${nf(x.q, 2)} x ${rs(x.p)} = ${rs(x.q * x.p)}`, 10])); L.push(['', 4]); });
  L.push([`TOTAL: ${rs(T.s)}`, 14]);
  baixar(pdfTexto(L), `compra-${t}-${hoje()}.pdf`);
};

/* orçamento */
V.orcamento = () => {
  const H = S.orc.hist;
  return `<div class="pag r">${volta('#/mercado')}<h1>Orçamento</h1>
   <div class="resumo" style="margin:0 0 10px;text-align:center"><div class="sub">Saldo atual</div><div style="font-size:30px;font-weight:800">${rs(S.orc.saldo)}</div>
    <div class="g3" style="margin-top:8px"><button class="btn p g" data-act="orcAdd" style="margin:0;width:100%">+ Valor</button><button class="btn p sec" data-act="orcEdit" style="margin:0;width:100%">✏️ Editar</button><button class="btn p sec" data-act="orcRedef" style="margin:0;width:100%">↺ Redefinir</button></div></div>
   <div class="cx"><b>Saldo ao longo do tempo</b>${grafico(H)}</div>
   <div class="cx"><b>Histórico</b>${H.length ? [...H].reverse().map(h => `<div class="ref"><span>${fmtD(h.d)} · ${h.tipo}</span><span style="color:${h.v < 0 ? '#ffab91' : '#c5e1a5'}">${h.v < 0 ? '−' : '+'}${rs(Math.abs(h.v))}</span></div>`).join('') : '<div class="sub">Nenhum movimento ainda.</div>'}</div>
   <button class="btn sec" data-act="orcZerar">🗑 Zerar todos os dados do orçamento</button></div>`;
};
ACT.orcZerar = () => { if (!confirm('Apagar o saldo, o histórico e o gráfico do orçamento? Isso não pode ser desfeito.')) return; S.orc = { saldo: 0, hist: [] }; salvar(); toast('Orçamento zerado'); rerender(); };
function grafico(H) {
  if (H.length < 2) return '<div class="sub">O gráfico aparece a partir de 2 movimentos.</div>';
  const P = H.slice(-30), v = P.map(h => h.saldo), mx = Math.max(...v) + 1, mn = Math.min(...v) - 1, W = 320, A = 150, k = (mx - mn) || 1;
  const pt = P.map((h, i) => [20 + i * (W - 30) / (P.length - 1), 10 + (mx - h.saldo) / k * (A - 30)]);
  return `<svg viewBox="0 0 ${W} ${A}" style="width:100%;margin-top:8px">
   <polyline fill="none" stroke="#e9b65c" stroke-width="2.5" points="${pt.map(p => p.join(',')).join(' ')}"/>${pt.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${P[i].v < 0 ? '#ff8a65' : '#9ccc65'}"/>`).join('')}
   <text x="20" y="${A - 4}" fill="#fffb" font-size="10">${fmtD(P[0].d)}</text><text x="${W - 10}" y="${A - 4}" fill="#fffb" font-size="10" text-anchor="end">${fmtD(P.at(-1).d)}</text>
   <text x="22" y="18" fill="#fffb" font-size="10">${rs(mx)}</text></svg>`;
}
const orcForm = (tit, act, lbl) => abrir(`<button class="x" data-act="fechar">×</button><h2>${tit}</h2><label class="f">${lbl}</label><input type="number" step="0.01" id="orcV" inputmode="decimal"><button class="btn g" data-act="${act}">Salvar</button>`, 'r');
ACT.orcAdd = () => orcForm('Adicionar valor', 'orcAddOk', 'Valor a somar (R$)');
ACT.orcEdit = () => orcForm('Corrigir saldo', 'orcEditOk', 'Saldo correto (R$)');
ACT.orcRedef = () => orcForm('Redefinir orçamento', 'orcRedefOk', 'Novo valor inicial (R$)');
const orcMov = (tipo, v, novo) => { S.orc.saldo = novo; S.orc.hist.push({ d: hoje(), tipo, v, saldo: novo }); salvar(); fechar(); rerender(); };
ACT.orcAddOk = () => { const v = +$('#orcV').value; if (!v) return toast('Digite o valor'); orcMov('Depósito', v, S.orc.saldo + v); };
ACT.orcEditOk = () => { const v = $('#orcV').value; if (v === '') return toast('Digite o valor'); orcMov('Correção', +v - S.orc.saldo, +v); };
ACT.orcRedefOk = () => { const v = $('#orcV').value; if (v === '') return toast('Digite o valor'); if (!confirm('Redefinir o saldo para ' + rs(+v) + '?')) return; orcMov('Redefinição', +v - S.orc.saldo, +v); };

/* ---------- configurações / backup ---------- */
V.config = () => `<div class="pag a">${volta()}<h1>Configurações</h1>
  <div class="cx"><b>Backup</b><div class="sub">Os dados ficam só neste aparelho. Faça backup antes de atualizar o app ou trocar de celular.</div>
   <button class="btn b" data-act="backup">💾 Baixar backup</button><label class="btn sec">📥 Restaurar backup<input type="file" accept=".json,application/json" hidden data-chg="restaurar"></label></div>
  <a class="btn sec" href="#/perfil">👤 Editar perfil</a>
  <div class="cx sub"><b>Fontes dos cálculos</b><br>Gasto em repouso: equação de Mifflin-St Jeor (revisão sistemática, Frankenfield et al., J Am Diet Assoc 2005).<br>Gasto dos treinos: 2024 Adult Compendium of Physical Activities (MET líquido × peso × horas).<br>Perda de gordura: 0,5–1% do peso/semana e proteína 2,3–3,1 g/kg de massa magra (Helms et al., JISSN 2014; ISSN 2017).<br>Ganho de massa: superávit de 10–20%, proteína 1,6–2,2 g/kg (Iraki et al., Sports 2019).<br>Gordura 20–35% e fibras 14 g/1000 kcal (DRIs/EFSA); água 2,0–2,5 L/dia (EFSA) + reposição nos treinos.<br>Nutrientes dos alimentos: TACO/NEPA-UNICAMP (alguns itens: USDA). Estimativas: confirme com um nutricionista.</div>
  <button class="btn sec" data-act="apagarTudo" style="opacity:.7">Apagar todos os dados</button></div>`;
ACT.backup = () => baixar(new Blob([JSON.stringify(S)], { type: 'application/json' }), `backup-dieta-${hoje()}.json`);
ACT.restaurar = (_, el) => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d.perfil || !d.receitas) throw 0; if (!confirm('Substituir os dados atuais pelo backup?')) return; S = d; salvar(); toast('Backup restaurado'); location.hash = '#/'; render(); } catch (e) { toast('Arquivo de backup inválido'); } }; r.readAsText(f); };
ACT.apagarTudo = () => { if (!confirm('Apagar TODOS os dados deste aparelho?')) return; localStorage.removeItem(CHAVE); S = padrao(); location.hash = '#/perfil'; render(); };

/* ---------- início ---------- */
carregar(); render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
