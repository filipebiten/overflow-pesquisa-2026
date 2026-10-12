import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const fbApp = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(fbApp);

const CULTOS = [
  { id: "culto1_notas", titulo: "Culto 1 — Sexta" },
  { id: "culto2_notas", titulo: "Culto 2 — Sáb. manhã" },
  { id: "culto3_notas", titulo: "Culto 3 — Sáb. noite" },
  { id: "culto4_notas", titulo: "Culto 4 — Domingo" },
];
const LOGISTICA_ITENS = ["Check-in", "Decoração", "Kit", "Quartos", "Banheiros", "Alimentação", "Comunicação", "Dinâmicas", "Mídia", "Segurança", "Hospitalidade"];
const ABERTAS = [
  ["aberta_deus_falou", "Algo que Deus falou"],
  ["aberta_adicionar", "O que adicionar"],
  ["aberta_nao_funcionou", "O que não funcionou"],
  ["aberta_deu_certo", "O que deu certo"],
  ["aberta_temas", "Temas/ideias"],
  ["aberta_outra_coisa", "Algo que não perguntamos"],
];

const TEAL = "#186678", TEAL_LIGHT = "#2589A0", PRETO = "#0A0A0A", CINZA = "#7A7A7A";
const PALETA = ["#186678", "#2589A0", "#0F4856", "#7A7A7A", "#D8D4CA", "#0A0A0A"];

let todas = [];
let filtro = "todos";
const charts = {};

// Itens de escala_grade guardam "ns", null, ou { v: 1-5, j: "..." } (ver js/responder.js).
function valorDeEscala(entry) { return entry && typeof entry === "object" ? entry.v : entry; }

function mediaEscala(resps, campo, indice) {
  const vals = resps.map((r) => valorDeEscala((r[campo] || [])[indice])).filter((v) => typeof v === "number");
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function contar(resps, campo) {
  const mapa = {};
  resps.forEach((r) => {
    const v = r[campo];
    if (v == null) return;
    (Array.isArray(v) ? v : [v]).forEach((x) => { mapa[x] = (mapa[x] || 0) + 1; });
  });
  return mapa;
}

function grafico(id, tipo, labels, dados, opts) {
  const ctx = document.getElementById(id).getContext("2d");
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: tipo,
    data: { labels, datasets: [{ data: dados, backgroundColor: tipo === "bar" ? TEAL : PALETA, borderRadius: tipo === "bar" ? 8 : 0, borderWidth: tipo === "pie" ? 2 : 0, borderColor: "#fff" }] },
    options: Object.assign({
      responsive: true,
      plugins: { legend: { display: tipo === "pie", position: "bottom", labels: { font: { family: "Plus Jakarta Sans" } } } },
      scales: tipo === "bar" ? { x: { beginAtZero: true, max: 5 } } : undefined,
    }, opts || {}),
  });
}

function render() {
  const resps = filtro === "todos" ? todas : todas.filter((r) => r.tipo === filtro);

  document.getElementById("total").textContent = resps.length;

  const npsVals = resps.map((r) => r.nps).filter((v) => typeof v === "number");
  let nps = "—";
  if (npsVals.length) {
    const promotores = npsVals.filter((v) => v >= 9).length;
    const detratores = npsVals.filter((v) => v <= 6).length;
    nps = Math.round(((promotores - detratores) / npsVals.length) * 100);
  }
  document.getElementById("nps").textContent = nps;

  const satVals = resps.map((r) => r.satisfacao_geral).filter((v) => typeof v === "number");
  document.getElementById("satisfacao").textContent = satVals.length ? (satVals.reduce((a, b) => a + b, 0) / satVals.length).toFixed(1) : "—";

  // avaliação por culto (média geral dos 5 itens, por culto)
  const mediasCulto = CULTOS.map((c) => {
    const medias = [0, 1, 2, 3, 4].map((i) => mediaEscala(resps, c.id, i)).filter((v) => v != null);
    return medias.length ? medias.reduce((a, b) => a + b, 0) / medias.length : 0;
  });
  grafico("graf-cultos", "bar", CULTOS.map((c) => c.titulo), mediasCulto.map((v) => +v.toFixed(2)));

  // logística
  const mediasLog = LOGISTICA_ITENS.map((_, i) => mediaEscala(resps, "logistica", i) || 0);
  grafico("graf-logistica", "bar", LOGISTICA_ITENS, mediasLog.map((v) => +v.toFixed(2)));

  // faixa etária
  const idades = contar(resps, "idade");
  grafico("graf-idade", "pie", Object.keys(idades), Object.values(idades));

  // primeira vez em retiro
  const primeiraVez = contar(resps, "primeira_vez_retiro");
  grafico("graf-primeira-vez", "pie", Object.keys(primeiraVez), Object.values(primeiraVez));

  // primeira vez no Overflow (quem nunca foi em retiro nenhum conta como "Sim" aqui também)
  const primeiraOverflow = { Sim: 0, Não: 0 };
  resps.forEach((r) => {
    const v = r.primeira_vez_retiro === "Sim, nunca fui em nenhum retiro" ? "Sim" : r.primeira_vez_overflow;
    if (v === "Sim" || v === "Não") primeiraOverflow[v]++;
  });
  grafico("graf-primeira-overflow", "pie", Object.keys(primeiraOverflow), Object.values(primeiraOverflow));

  // expectativas
  const expect = contar(resps, "expectativas");
  const ordemExpect = ["Muito abaixo", "Abaixo", "Atendeu", "Superou"].filter((k) => expect[k]);
  grafico("graf-expectativas", "bar", ordemExpect, ordemExpect.map((k) => expect[k]), { scales: { x: { beginAtZero: true } } });

  // respostas abertas
  const lista = document.getElementById("lista-abertas");
  lista.innerHTML = resps.flatMap((r) => ABERTAS.map(([campo, rotulo]) => r[campo] ? `<div class="item"><b>${rotulo}</b>${String(r[campo]).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</div>` : "")).join("") || `<p style="color:var(--cinza-medio);font-size:.85rem">Nenhuma resposta aberta ainda.</p>`;
}

// ---------- aba "por pergunta" ----------
const PERGUNTAS_SELECIONAVEIS = PESQUISA.perguntas.filter((q) => q.tipo !== "conteudo");
const escPergunta = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function montarSelectPerguntas() {
  const select = document.getElementById("select-pergunta");
  let secaoAtual = null, html = "";
  PERGUNTAS_SELECIONAVEIS.forEach((q) => {
    if (q.secao !== secaoAtual) {
      if (secaoAtual !== null) html += "</optgroup>";
      html += `<optgroup label="${escPergunta(q.secao || "Outras")}">`;
      secaoAtual = q.secao;
    }
    html += `<option value="${q.id}">${escPergunta(q.pergunta)}</option>`;
  });
  html += "</optgroup>";
  select.innerHTML = html;
}

function renderPergunta() {
  const id = document.getElementById("select-pergunta").value;
  const q = PERGUNTAS_SELECIONAVEIS.find((x) => x.id === id);
  if (!q) return;
  const resps = filtro === "todos" ? todas : todas.filter((r) => r.tipo === filtro);
  const cardGrafico = document.getElementById("card-grafico-pergunta");
  const cardLista = document.getElementById("card-lista-pergunta");
  const lista = document.getElementById("lista-pergunta");
  const tituloLista = document.getElementById("titulo-lista-pergunta");

  if (q.tipo === "aberta") {
    cardGrafico.style.display = "none";
    cardLista.style.display = "block";
    tituloLista.textContent = "Respostas";
    const textos = resps.map((r) => r[q.id]).filter((v) => v && String(v).trim());
    lista.innerHTML = textos.length
      ? textos.map((t) => `<div class="item">${escPergunta(t)}</div>`).join("")
      : `<p style="color:var(--cinza-medio);font-size:.85rem">Nenhuma resposta ainda.</p>`;
    return;
  }

  cardGrafico.style.display = "block";

  if (q.tipo === "escala_grade") {
    const medias = q.itens.map((_, i) => +((mediaEscala(resps, q.id, i) || 0).toFixed(2)));
    grafico("graf-pergunta", "bar", q.itens, medias, { indexAxis: "y" });
    const motivos = [];
    resps.forEach((r) => (r[q.id] || []).forEach((entry, i) => {
      if (entry && typeof entry === "object" && entry.j && entry.j.trim()) motivos.push({ item: q.itens[i], texto: entry.j });
    }));
    cardLista.style.display = "block";
    tituloLista.textContent = "Justificativas (nota 3 ou menos)";
    lista.innerHTML = motivos.length
      ? motivos.map((m) => `<div class="item"><b>${escPergunta(m.item)}</b>${escPergunta(m.texto)}</div>`).join("")
      : `<p style="color:var(--cinza-medio);font-size:.85rem">Nenhuma justificativa ainda.</p>`;
    return;
  }

  cardLista.style.display = "none";
  const contagem = contar(resps, q.id);
  let labels;
  if (q.opcoes) labels = q.opcoes;
  else if (q.tipo === "nps") labels = Array.from({ length: 11 }, (_, n) => String(n));
  else if (q.tipo === "estrela") labels = ["1", "2", "3", "4", "5"];
  else labels = Object.keys(contagem);
  grafico("graf-pergunta", "bar", labels, labels.map((l) => contagem[l] || 0), { scales: { x: { beginAtZero: true } } });
}

document.querySelectorAll(".filtros button").forEach((b) => b.onclick = () => {
  document.querySelectorAll(".filtros button").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  filtro = b.dataset.filtro;
  render();
  if (document.getElementById("aba-pergunta").style.display !== "none") renderPergunta();
});

document.querySelectorAll(".abas button").forEach((b) => b.onclick = () => {
  document.querySelectorAll(".abas button").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  const ehGeral = b.dataset.aba === "geral";
  document.getElementById("aba-geral").style.display = ehGeral ? "block" : "none";
  document.getElementById("aba-pergunta").style.display = ehGeral ? "none" : "block";
  if (!ehGeral) renderPergunta();
});

montarSelectPerguntas();
document.getElementById("select-pergunta").onchange = renderPergunta;

onValue(ref(db, "respostas"), (snap) => {
  const val = snap.val() || {};
  todas = Object.values(val);
  render();
  if (document.getElementById("aba-pergunta").style.display !== "none") renderPergunta();
});
