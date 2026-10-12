/**
 * Espelho da pesquisa de satisfação Overflow 2026 na planilha do Google Sheets.
 * Publicar como Web App (Extensões → Apps Script → Implantar → Nova implantação →
 * App da Web, "Executar como: eu", "Quem pode acessar: qualquer pessoa").
 *
 * Cada envio da pesquisa chega aqui como uma linha nova — não há upsert, pois a
 * pesquisa é anônima e de resposta única por pessoa. O Firebase é a fonte de
 * verdade (dashboard ao vivo); esta planilha é só o espelho pra tabulação.
 */

var SHEET_ID = "1drU_S1UlxskQLTP0eM0jfejmB_3ernJTi43uhwwJMQk";
var NOME_ABA = "Respostas";
var SEGREDO = "overflow2026";

function doPost(e) {
  var resposta;
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SEGREDO) return saida_({ ok: false, erro: "segredo inválido" });

    var colunas = (body.colunas || []).map(escaparFormula_);
    var valores = (body.valores || []).map(escaparFormula_);

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var aba = ss.getSheetByName(NOME_ABA) || ss.insertSheet(NOME_ABA);

    if (aba.getLastRow() === 0) {
      aba.getRange(1, 1, 1, colunas.length + 1).setValues([["Enviado em"].concat(colunas)]);
      aba.setFrozenRows(1);
    }

    var agora = Utilities.formatDate(new Date(), "America/Campo_Grande", "dd/MM/yyyy HH:mm");
    aba.getRange(aba.getLastRow() + 1, 1, 1, valores.length + 1).setValues([[agora].concat(valores)]);

    resposta = { ok: true };
  } catch (err) {
    resposta = { ok: false, erro: String(err) };
  }
  return saida_(resposta);
}

/** Impede que resposta aberta vire fórmula (texto livre vindo de qualquer pessoa, sem sanitização). */
function escaparFormula_(v) {
  if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function saida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
