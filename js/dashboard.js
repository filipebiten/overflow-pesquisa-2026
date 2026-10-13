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
const LOGISTICA_ITENS = ["Check-in", "Decoração", "Kit", "Quartos", "Banheiros", "Alimentação", "Comunicação", "Dinâmicas", "Áudio", "Mídia", "Segurança", "Hospitalidade"];
const MOMENTOS_CULTO = ["Louvor", "Palavra/Ministração", "Direção/Fluxo do culto", "Ambiente espiritual/Intercessão", "Duração/Tempo"];
const CAMPOS_NUVEM = ["aberta_deus_falou", "aberta_adicionar", "aberta_nao_funcionou", "aberta_deu_certo"];
const STOPWORDS = new Set(["de","a","o","que","e","do","da","em","um","uma","os","as","para","com","não","por","mais","dos","como","mas","ao","das","foi","ser","está","tá","só","já","pra","muito","isso","essa","esse","meu","minha","seus","suas","seu","sua","eu","se","na","no","nos","nas","foram","era","são","dia","dias","bem","mim","nós","você","vocês","ter","tem","têm","tive","teve","tudo","tão","mesmo","entre","sem","depois","antes","quando","onde","qual","quais","pelo","pela","pelos","pelas","até","aos","às","num","numa","outro","outra","outros","outras","cada","todo","toda","todos","todas","algo","alguem","alguém"]);
const ABERTAS = [
  ["aberta_deus_falou", "Algo que Deus falou"],
  ["aberta_adicionar", "O que adicionar"],
  ["aberta_nao_funcionou", "O que não funcionou"],
  ["aberta_deu_certo", "O que deu certo"],
  ["aberta_temas", "Temas/ideias"],
  ["aberta_outra_coisa", "Algo que não perguntamos"],
];

const TEAL = "#186678", TEAL_LIGHT = "#2589A0", PRETO = "#0A0A0A", CINZA = "#7A7A7A";
const PALETA = ["#186678", "#0A0A0A", "#D8D4CA", "#2589A0", "#7A7A7A", "#0F4856"];

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

function mediaMomentosCulto(resps) {
  return MOMENTOS_CULTO.map((_, i) => {
    const medias = CULTOS.map((c) => mediaEscala(resps, c.id, i)).filter((v) => v != null);
    return medias.length ? medias.reduce((a, b) => a + b, 0) / medias.length : 0;
  });
}

const GINCANAS_ITENS = ["Montagem das Bandeiras", "Gincana Bíblica Indoor", "Pega-Bandeira Noturno", "Circuito Físico", "Batalha Naval"];

function mediaCampoSimples(resps, campo) {
  const vals = resps.map((r) => r[campo]).filter((v) => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function mediasGincanasPorItem(resps) {
  return [
    mediaEscala(resps, "momentos", 0) || 0,
    mediaEscala(resps, "momentos", 1) || 0,
    mediaEscala(resps, "momentos", 2) || 0,
    mediaCampoSimples(resps, "momento_circuito_nota") || 0,
    mediaCampoSimples(resps, "momento_batalha_nota") || 0,
  ];
}

function mediaGincanas(resps) {
  const vals = [];
  resps.forEach((r) => {
    (r.momentos || []).forEach((entry) => {
      const v = valorDeEscala(entry);
      if (typeof v === "number") vals.push(v);
    });
    if (typeof r.momento_circuito_nota === "number") vals.push(r.momento_circuito_nota);
    if (typeof r.momento_batalha_nota === "number") vals.push(r.momento_batalha_nota);
  });
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function nuvemPalavras(resps) {
  const freq = {};
  resps.forEach((r) => CAMPOS_NUVEM.forEach((campo) => {
    const texto = r[campo];
    if (!texto) return;
    (String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{3,}/g) || []).forEach((w) => {
      if (STOPWORDS.has(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });
  }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 40);
}

function renderNuvem(resps) {
  const palavras = nuvemPalavras(resps);
  const el = document.getElementById("nuvem-palavras");
  if (!palavras.length) { el.innerHTML = `<p style="color:var(--cinza-medio);font-size:.85rem">Nenhuma resposta ainda.</p>`; return; }
  const max = palavras[0][1], min = palavras[palavras.length - 1][1];
  el.innerHTML = palavras.map(([w, n]) => {
    const t = max === min ? 1 : (n - min) / (max - min);
    return `<span style="font-size:${(0.85 + t * 1.65).toFixed(2)}rem;opacity:${(0.55 + t * 0.45).toFixed(2)};color:${TEAL};font-weight:700" title="${n}×">${escPergunta(w)}</span>`;
  }).join(" ");
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

  // média total dos cultos (média das médias dos 4 cultos)
  const mediasCultoValidas = mediasCulto.filter((v) => v > 0);
  const mediaCultosGeral = mediasCultoValidas.length ? mediasCultoValidas.reduce((a, b) => a + b, 0) / mediasCultoValidas.length : null;
  document.getElementById("media-cultos").textContent = mediaCultosGeral != null ? mediaCultosGeral.toFixed(1) : "—";

  // avaliação por momento do culto (média de cada momento, juntando os 4 cultos)
  grafico("graf-momentos-culto", "bar", MOMENTOS_CULTO, mediaMomentosCulto(resps).map((v) => +v.toFixed(2)), { indexAxis: "y" });

  // gincanas (média geral de todos os momentos/dinâmicas)
  const gincanas = mediaGincanas(resps);
  document.getElementById("gincanas").textContent = gincanas != null ? gincanas.toFixed(1) : "—";

  // gincanas, uma média por item
  grafico("graf-gincanas", "bar", GINCANAS_ITENS, mediasGincanasPorItem(resps).map((v) => +v.toFixed(2)), { indexAxis: "y" });

  renderNuvem(resps);

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

// ---------- aba "por pergunta" (tudo numa página só, sem dropdown) ----------
const PERGUNTAS_SELECIONAVEIS = PESQUISA.perguntas.filter((q) => q.tipo !== "conteudo");
const escPergunta = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function montarTodasPerguntas() {
  const cont = document.getElementById("todas-perguntas");
  let secaoAtual = null, html = "";
  PERGUNTAS_SELECIONAVEIS.forEach((q) => {
    if (q.secao !== secaoAtual) {
      html += `<h2 class="secao-titulo">${escPergunta(q.secao || "Outras")}</h2>`;
      secaoAtual = q.secao;
    }
    if (q.tipo === "aberta") {
      html += `<div class="abertas card-pergunta"><h3>${escPergunta(q.pergunta)}</h3><div id="lista-q-${q.id}"></div></div>`;
    } else if (q.tipo === "escala_grade") {
      html += `<div class="grafico-card card-pergunta"><h3>${escPergunta(q.pergunta)}</h3><canvas id="graf-q-${q.id}"></canvas></div>
        <div class="abertas card-pergunta"><h3>${escPergunta(q.pergunta)} — justificativas (nota 3 ou menos)</h3><div id="lista-q-${q.id}"></div></div>`;
    } else {
      html += `<div class="grafico-card card-pergunta"><h3>${escPergunta(q.pergunta)}</h3><canvas id="graf-q-${q.id}"></canvas></div>`;
    }
  });
  cont.innerHTML = html;
}

function renderTodasPerguntas() {
  const resps = filtro === "todos" ? todas : todas.filter((r) => r.tipo === filtro);

  PERGUNTAS_SELECIONAVEIS.forEach((q) => {
    if (q.tipo === "aberta") {
      const textos = resps.map((r) => r[q.id]).filter((v) => v && String(v).trim());
      document.getElementById(`lista-q-${q.id}`).innerHTML = textos.length
        ? textos.map((t) => `<div class="item">${escPergunta(t)}</div>`).join("")
        : `<p style="color:var(--cinza-medio);font-size:.85rem">Nenhuma resposta ainda.</p>`;
      return;
    }

    if (q.tipo === "escala_grade") {
      const medias = q.itens.map((_, i) => +((mediaEscala(resps, q.id, i) || 0).toFixed(2)));
      grafico(`graf-q-${q.id}`, "bar", q.itens, medias, { indexAxis: "y" });
      const motivos = [];
      resps.forEach((r) => (r[q.id] || []).forEach((entry, i) => {
        if (entry && typeof entry === "object" && entry.j && entry.j.trim()) motivos.push({ item: q.itens[i], texto: entry.j });
      }));
      document.getElementById(`lista-q-${q.id}`).innerHTML = motivos.length
        ? motivos.map((m) => `<div class="item"><b>${escPergunta(m.item)}</b>${escPergunta(m.texto)}</div>`).join("")
        : `<p style="color:var(--cinza-medio);font-size:.85rem">Nenhuma justificativa ainda.</p>`;
      return;
    }

    const contagem = contar(resps, q.id);
    let labels;
    if (q.opcoes) labels = q.opcoes;
    else if (q.tipo === "nps") labels = Array.from({ length: 11 }, (_, n) => String(n));
    else if (q.tipo === "estrela") labels = ["1", "2", "3", "4", "5"];
    else labels = Object.keys(contagem);
    grafico(`graf-q-${q.id}`, "bar", labels, labels.map((l) => contagem[l] || 0), { scales: { x: { beginAtZero: true } } });
  });
}

document.querySelectorAll(".filtros button").forEach((b) => b.onclick = () => {
  document.querySelectorAll(".filtros button").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  filtro = b.dataset.filtro;
  render();
  if (document.getElementById("aba-pergunta").style.display !== "none") renderTodasPerguntas();
});

document.querySelectorAll(".abas button").forEach((b) => b.onclick = () => {
  document.querySelectorAll(".abas button").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  const ehGeral = b.dataset.aba === "geral";
  document.getElementById("aba-geral").style.display = ehGeral ? "block" : "none";
  document.getElementById("aba-pergunta").style.display = ehGeral ? "none" : "block";
  if (!ehGeral) renderTodasPerguntas();
});

montarTodasPerguntas();

onValue(ref(db, "respostas"), (snap) => {
  const val = snap.val() || {};
  todas = Object.values(val);
  render();
  if (document.getElementById("aba-pergunta").style.display !== "none") renderTodasPerguntas();
});
