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

function mediaEscala(resps, campo, indice) {
  const vals = resps.map((r) => (r[campo] || [])[indice]).filter((v) => typeof v === "number");
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

  // expectativas
  const expect = contar(resps, "expectativas");
  const ordemExpect = ["Muito abaixo", "Abaixo", "Atendeu", "Superou"].filter((k) => expect[k]);
  grafico("graf-expectativas", "bar", ordemExpect, ordemExpect.map((k) => expect[k]), { scales: { x: { beginAtZero: true } } });

  // respostas abertas
  const lista = document.getElementById("lista-abertas");
  lista.innerHTML = resps.flatMap((r) => ABERTAS.map(([campo, rotulo]) => r[campo] ? `<div class="item"><b>${rotulo}</b>${String(r[campo]).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</div>` : "")).join("") || `<p style="color:var(--cinza-medio);font-size:.85rem">Nenhuma resposta aberta ainda.</p>`;
}

document.querySelectorAll(".filtros button").forEach((b) => b.onclick = () => {
  document.querySelectorAll(".filtros button").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  filtro = b.dataset.filtro;
  render();
});

onValue(ref(db, "respostas"), (snap) => {
  const val = snap.val() || {};
  todas = Object.values(val);
  render();
});
