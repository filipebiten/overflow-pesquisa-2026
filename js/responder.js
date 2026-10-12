// Fluxo do celular: uma pergunta por tela, progresso salvo em localStorage
// (retoma se a pessoa fechar e voltar), grava no Firebase só no envio final.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const CHAVE_RASCUNHO = "overflow2026_rascunho";
const CHAVE_ENVIADO = "overflow2026_enviado";

function visiveis(ans) {
  return PESQUISA.perguntas.filter((q) => {
    if (!q.mostrarSe) return true;
    const v = ans[q.mostrarSe.pergunta];
    if (v == null) return false;
    const arr = Array.isArray(v) ? v : [v];
    return q.mostrarSe.opcoes.some((o) => arr.includes(o));
  });
}

// Itens de escala_grade guardam "ns", null, ou { v: 1-5, j: "justificativa opcional" }.
function valorDeEscala(entry) { return entry && typeof entry === "object" ? entry.v : entry; }
function justificativaDeEscala(entry) { return entry && typeof entry === "object" ? entry.j || "" : ""; }

function carregarRascunho() {
  try { return JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || "null"); } catch (_) { return null; }
}
function salvarRascunho(st) {
  try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ ans: st.ans, idx: st.idx, sub: st.sub })); } catch (_) {}
}
function limparRascunho() {
  try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (_) {}
}
function jaEnviou() {
  try { return localStorage.getItem(CHAVE_ENVIADO) === "1"; } catch (_) { return false; }
}
function marcarEnviado() {
  try { localStorage.setItem(CHAVE_ENVIADO, "1"); } catch (_) {}
}

// Monta as colunas (rótulo + valor) na ordem das perguntas, achatando escala_grade.
function colunasParaSheets(ans) {
  const linha = [];
  PESQUISA.perguntas.forEach((q) => {
    if (q.tipo === "conteudo") return;
    if (q.tipo === "escala_grade") {
      const arr = ans[q.id] || [];
      q.itens.forEach((item, i) => {
        const entry = arr[i];
        const v = valorDeEscala(entry);
        linha.push({ coluna: `${q.pergunta} — ${item}`, valor: entry === "ns" ? q.naoSei : v == null ? "" : String(v) });
        linha.push({ coluna: `${q.pergunta} — ${item} — motivo (se nota baixa)`, valor: justificativaDeEscala(entry) });
      });
      return;
    }
    const v = ans[q.id];
    if (v == null) { linha.push({ coluna: q.pergunta, valor: "" }); return; }
    linha.push({ coluna: q.pergunta, valor: Array.isArray(v) ? v.join("; ") : String(v) });
  });
  return linha;
}

async function enviarSheets(ans) {
  if (!SHEETS_WEBAPP_URL) return;
  const linha = colunasParaSheets(ans);
  try {
    await fetch(SHEETS_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS no Apps Script
      body: JSON.stringify({ secret: SHEETS_SECRET, colunas: linha.map((c) => c.coluna), valores: linha.map((c) => c.valor) }),
    });
  } catch (_) {
    // Firebase já tem o dado; o Sheets pode ser resincronizado manualmente depois se falhar.
  }
}

export async function init(ctx) {
  const { db, ref, push, set, serverTimestamp, el } = ctx;

  if (jaEnviou()) {
    el.innerHTML = telaFim();
    return;
  }

  const rascunho = carregarRascunho();
  const st = rascunho || { ans: {}, idx: 0, sub: 0 };

  function telaFim() {
    return `<div class="fim-cel"><div class="circ"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg></div><h2>Respostas enviadas</h2><p>${esc(PESQUISA.encerramento)}</p></div>`;
  }

  async function concluir() {
    const payload = { ...st.ans, tipo: st.ans.tipo_participante === "Participei liderando ou organizando uma equipe" ? "lideranca" : "retirante", enviadoEm: serverTimestamp() };
    el.innerHTML = `<div class="fim-cel"><h2>Enviando…</h2></div>`;
    try {
      await set(push(ref(db, "respostas")), payload);
    } catch (_) {
      // mesmo se a escrita falhar (ex.: sem internet), não trava a pessoa na tela de envio.
    }
    enviarSheets(st.ans);
    marcarEnviado();
    limparRascunho();
    el.innerHTML = telaFim();
  }

  function render() {
    const lista = visiveis(st.ans);
    if (st.idx >= lista.length) st.idx = lista.length - 1;
    const q = lista[st.idx];
    const numeradas = lista.filter((x) => x.numero).length;
    const feitas = lista.slice(0, st.idx + 1).filter((x) => x.numero).length;
    const pct = Math.round((feitas / Math.max(1, numeradas)) * 100);
    let podeAvancar = true, textoProx = "Próxima", mostrarBotao = true;
    const atual = st.ans[q.id];

    let corpo = "";
    const cabecalho = q.secao ? `<span class="tag-line">${esc(q.secao)}</span>` : "";
    const contagem = q.tipo === "conteudo" ? "" : (q.numero ? `<div class="contagem">Pergunta ${feitas} de ${numeradas}</div>` : `<div class="contagem">Complemento</div>`);

    if (q.tipo === "conteudo") {
      corpo = `${cabecalho}<h2 class="perg">${esc(q.titulo)}</h2><p class="instr">${esc(q.texto)}</p>`;
      textoProx = "Continuar";
    } else if (q.tipo === "unica") {
      corpo = `${cabecalho}${contagem}<h2 class="perg">${esc(q.pergunta)}</h2>${q.instrucao ? `<p class="instr">${esc(q.instrucao)}</p>` : ""}
        <div class="opcs ${q.opcoes.length > 4 ? "compacta" : ""}">` + q.opcoes.map((o) => `<button class="opc ${atual === o ? "on" : ""}" data-o="${esc(o)}">${esc(o)}</button>`).join("") + `</div>`;
      podeAvancar = atual != null;
      mostrarBotao = false; // avança sozinho ao escolher
    } else if (q.tipo === "multipla") {
      const sel = atual || [];
      corpo = `${cabecalho}${contagem}<h2 class="perg">${esc(q.pergunta)}</h2>${q.instrucao ? `<p class="instr">${esc(q.instrucao)}</p>` : ""}
        <div class="opcs compacta">` + q.opcoes.map((o) => `<button class="opc ${sel.includes(o) ? "on" : ""}" data-o="${esc(o)}">${esc(o)}</button>`).join("") + `</div>`;
      podeAvancar = sel.length > 0;
    } else if (q.tipo === "escala_grade") {
      const arr = atual || Array(q.itens.length).fill(null);
      const entry = arr[st.sub];
      const v = valorDeEscala(entry);
      const j = justificativaDeEscala(entry);
      corpo = `${cabecalho}<div class="contagem">Item ${st.sub + 1} de ${q.itens.length}</div>
        <h2 class="perg">${esc(q.itens[st.sub])}</h2>
        <p class="instr">${esc(q.pergunta)}</p>
        <div class="escala">` + [1, 2, 3, 4, 5].map((n) => `<button class="opc ${v === n ? "on" : ""}" data-n="${n}">${n}</button>`).join("") + `</div>
        <div class="rot-escala">${v && v !== "ns" ? esc(q.rotulos[v]) : "&nbsp;"}</div>
        <button class="opc naosei ${entry === "ns" ? "on" : ""}" data-n="ns">${esc(q.naoSei)}</button>
        ${typeof v === "number" && v <= 3 ? `<textarea id="just" class="justificativa" maxlength="300" placeholder="Por que você avaliou assim? (opcional)">${esc(j)}</textarea>` : ""}`;
      podeAvancar = entry != null;
    } else if (q.tipo === "estrela") {
      corpo = `${cabecalho}${contagem}<h2 class="perg">${esc(q.pergunta)}</h2>${q.instrucao ? `<p class="instr">${esc(q.instrucao)}</p>` : ""}
        <div class="estrelas">` + [1, 2, 3, 4, 5].map((n) => `<button class="estrela ${atual >= n ? "on" : ""}" data-n="${n}">★</button>`).join("") + `</div>`;
      podeAvancar = atual != null;
    } else if (q.tipo === "nps") {
      corpo = `${cabecalho}${contagem}<h2 class="perg">${esc(q.pergunta)}</h2>${q.instrucao ? `<p class="instr">${esc(q.instrucao)}</p>` : ""}
        <div class="nps-grid">` + Array.from({ length: 11 }, (_, n) => n).map((n) => `<button class="opc nps-btn ${atual === n ? "on" : ""}" data-n="${n}">${n}</button>`).join("") + `</div>`;
      podeAvancar = atual != null;
    } else if (q.tipo === "aberta") {
      corpo = `${cabecalho}${contagem}<h2 class="perg">${esc(q.pergunta)}</h2>` + (q.longa
        ? `<textarea id="txt" maxlength="1000" placeholder="Escreva aqui">${esc(atual || "")}</textarea>`
        : `<input class="txt" id="txt" maxlength="200" placeholder="Escreva aqui" value="${esc(atual || "")}">`);
      textoProx = atual && atual.trim() ? "Próxima" : "Pular";
    }

    const ultimo = st.idx === lista.length - 1 && (q.tipo !== "escala_grade" || st.sub === q.itens.length - 1);
    if (ultimo) textoProx = "Enviar";

    el.innerHTML = `<div class="prog"><i style="width:${pct}%"></i></div>
      <div class="corpo-cel">${corpo}</div>
      <div class="rodape-cel">${st.idx > 0 || st.sub > 0 ? `<button class="btn btn-out" id="volta">Voltar</button>` : ""}${mostrarBotao ? `<button class="btn btn-flow" id="prox" ${podeAvancar ? "" : "disabled"}>${textoProx}</button>` : ""}</div>`;

    function avancar() {
      if (q.tipo === "escala_grade" && st.sub < q.itens.length - 1) { st.sub++; salvarRascunho(st); render(); return; }
      // limpa respostas condicionais que deixaram de valer
      PESQUISA.perguntas.filter((x) => x.mostrarSe).forEach((x) => {
        if (!visiveis(st.ans).includes(x)) delete st.ans[x.id];
      });
      const nova = visiveis(st.ans);
      if (st.idx >= nova.length - 1) { concluir(); return; }
      st.idx++; st.sub = 0;
      salvarRascunho(st); render();
    }

    el.querySelectorAll(".opc[data-o]").forEach((b) => (b.onclick = () => {
      const o = b.dataset.o;
      if (q.tipo === "unica") {
        st.ans[q.id] = o;
        salvarRascunho(st); render();
        setTimeout(avancar, 180);
        return;
      }
      let sel = (st.ans[q.id] || []).slice();
      if (sel.includes(o)) sel = sel.filter((x) => x !== o);
      else {
        const ex = q.exclusivas || [];
        if (ex.includes(o)) sel = [o];
        else { sel = sel.filter((x) => !ex.includes(x)); sel.push(o); }
      }
      st.ans[q.id] = sel.length ? sel : undefined;
      salvarRascunho(st); render();
    }));
    el.querySelectorAll(".opc[data-n]").forEach((b) => (b.onclick = () => {
      const n = b.dataset.n === "ns" ? "ns" : +b.dataset.n;
      if (q.tipo === "escala_grade") {
        const arr = (st.ans[q.id] || Array(q.itens.length).fill(null)).slice();
        const jPrevia = justificativaDeEscala(arr[st.sub]);
        arr[st.sub] = n === "ns" ? "ns" : { v: n, j: jPrevia };
        st.ans[q.id] = arr;
      } else {
        st.ans[q.id] = n;
      }
      salvarRascunho(st); render();
    }));
    el.querySelectorAll(".estrela").forEach((b) => (b.onclick = () => {
      st.ans[q.id] = +b.dataset.n; salvarRascunho(st); render();
    }));
    const t = document.getElementById("txt");
    if (t) t.oninput = () => {
      st.ans[q.id] = t.value;
      const btn = document.getElementById("prox");
      if (btn) btn.textContent = t.value.trim() ? (ultimo ? "Enviar" : "Próxima") : "Pular";
      salvarRascunho(st);
    };
    const tj = document.getElementById("just");
    if (tj) tj.oninput = () => {
      const arr = (st.ans[q.id] || Array(q.itens.length).fill(null)).slice();
      const entry = arr[st.sub];
      if (entry && typeof entry === "object") arr[st.sub] = { ...entry, j: tj.value };
      st.ans[q.id] = arr;
      salvarRascunho(st);
    };
    const v = document.getElementById("volta");
    if (v) v.onclick = () => {
      if (q.tipo === "escala_grade" && st.sub > 0) st.sub--;
      else {
        st.idx--;
        const anterior = visiveis(st.ans)[st.idx];
        st.sub = anterior && anterior.tipo === "escala_grade" ? anterior.itens.length - 1 : 0;
      }
      salvarRascunho(st); render();
    };
    const prox = document.getElementById("prox");
    if (prox) prox.onclick = avancar;
  }

  render();
}
