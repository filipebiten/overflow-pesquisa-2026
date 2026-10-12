// ============================================================
// PESQUISA DE SATISFAÇÃO — OVERFLOW 2026 (Rede Flow)
// Fonte única das perguntas. Editar aqui, nada de texto espalhado no código.
//
// Tipos:
//   conteudo      → tela informativa (sem resposta), botão "Continuar"
//   unica         → uma opção (avança sozinho ao escolher)
//   multipla      → várias opções; exclusivas: [...] limpa as outras ao marcar
//   escala_grade  → vários itens avaliados 1–5 (+ opção "não sei/não participei").
//                   Nota ≤ 3 abre campo opcional de justificativa.
//   estrela       → uma avaliação única 1–5 (estrelas)
//   nps           → escala única 0–10
//   aberta        → texto livre (longa: true = textarea), sempre opcional
//
// mostrarSe: { pergunta: "id", opcoes: [...] } → só aparece se a pessoa
//            marcou uma dessas opções na pergunta indicada.
// numero: presença (truthy) conta a pergunta na barra de progresso.
// ============================================================

const EQUIPES = [
  "Inscrições/Check-in",
  "Decoração",
  "Kit",
  "Intercessão",
  "Limpeza",
  "Louvor",
  "Dinâmicas",
  "Mídia",
  "Logística",
  "Hospitalidade",
  "Caronas",
  "Organização Geral",
];

const ESCALA_QUALIDADE = { 1: "Ruim", 2: "Regular", 3: "Bom", 4: "Muito bom", 5: "Excelente" };
const ESCALA_CONCORDANCIA = { 1: "Discordo totalmente", 2: "Discordo", 3: "Neutro", 4: "Concordo", 5: "Concordo totalmente" };

function culto(num, dados) {
  const pref = `culto${num}`;
  return [
    {
      id: `${pref}_notas`, numero: true, secao: `Culto ${num} — ${dados.quando}`, tipo: "escala_grade",
      pergunta: `${dados.pregacao} · Direção: ${dados.direcao}`,
      itens: ["Louvor", "Palavra/Ministração", "Direção/Fluxo do culto", "Ambiente espiritual/Intercessão", "Duração/Tempo"],
      rotulos: ESCALA_QUALIDADE, naoSei: "Não participei deste culto",
    },
    { id: `${pref}_marcou`, secao: `Culto ${num} — ${dados.quando}`, tipo: "aberta", longa: true, pergunta: "O que mais te marcou neste culto?" },
    { id: `${pref}_sugestao`, secao: `Culto ${num} — ${dados.quando}`, tipo: "aberta", longa: true, pergunta: "Sugestão para melhorar este culto?" },
  ];
}

const LIDER_MOSTRAR_SE = { pergunta: "tipo_participante", opcoes: ["Participei liderando ou organizando uma equipe"] };

const PESQUISA = {
  id: "overflow2026",
  titulo: "Pesquisa de satisfação — Overflow 2026",
  encerramento: "Valeu por contar como foi o seu Overflow. Isso ajuda a Flow a ir ainda mais fundo no ano que vem.",
  perguntas: [
    // ---------- boas-vindas ----------
    {
      id: "intro", tipo: "conteudo", secao: "Overflow 2026",
      titulo: "Antes de começar",
      texto: "Essa pesquisa leva de 8 a 10 minutos. Você pode fechar e voltar depois — suas respostas ficam salvas neste aparelho até o envio final.",
    },

    // ---------- filtro ----------
    {
      id: "tipo_participante", numero: true, secao: "Antes de começar", tipo: "unica",
      pergunta: "Como você participou do Overflow 2026?",
      opcoes: ["Participei como retirante", "Participei liderando ou organizando uma equipe"],
    },
    {
      id: "equipes_lideranca", numero: true, secao: "Como voluntário(a)", tipo: "multipla",
      pergunta: "Em qual (is) equipe(s) você serviu?",
      instrucao: "Marque quantas forem o caso.",
      opcoes: EQUIPES,
      mostrarSe: LIDER_MOSTRAR_SE,
    },

    // ---------- bloco exclusivo da liderança (vem primeiro pra quem é líder) ----------
    { id: "lider_experiencia", numero: true, secao: "Como voluntário(a)", tipo: "estrela", pergunta: "Como foi a experiência como voluntário(a)?", mostrarSe: LIDER_MOSTRAR_SE },
    { id: "lider_orientado", numero: true, secao: "Como voluntário(a)", tipo: "estrela", pergunta: "Sentiu que foi bem orientado(a) sobre sua função?", mostrarSe: LIDER_MOSTRAR_SE },
    { id: "lider_gostou_equipe", numero: true, secao: "Como voluntário(a)", tipo: "estrela", pergunta: "Você gostou de servir na sua equipe?", mostrarSe: LIDER_MOSTRAR_SE },
    { id: "lider_avaliacao_equipe", numero: true, secao: "Como voluntário(a)", tipo: "estrela", pergunta: "Como você avalia o funcionamento da sua equipe (organização, comunicação, clima)?", mostrarSe: LIDER_MOSTRAR_SE },
    {
      id: "lider_conflito", numero: true, secao: "Como voluntário(a)", tipo: "unica",
      pergunta: "Teve algum conflito dentro da sua equipe?",
      opcoes: ["Sim", "Não"],
      mostrarSe: LIDER_MOSTRAR_SE,
    },
    {
      id: "lider_conflito_detalhe", secao: "Como voluntário(a)", tipo: "aberta", longa: true,
      pergunta: "Conte um pouco o que houve (sem precisar citar nomes, se preferir).",
      mostrarSe: { pergunta: "lider_conflito", opcoes: ["Sim"] },
    },
    { id: "lider_sugestoes", secao: "Como voluntário(a)", tipo: "aberta", longa: true, pergunta: "Sugestões como voluntário(a)?", mostrarSe: LIDER_MOSTRAR_SE },
    { id: "lider_servir_novamente", numero: true, secao: "Como voluntário(a)", tipo: "unica", pergunta: "Gostaria de servir novamente no próximo ano?", opcoes: ["Sim", "Talvez", "Não"], mostrarSe: LIDER_MOSTRAR_SE },
    {
      id: "lider_equipe_desejada", numero: true, secao: "Como voluntário(a)", tipo: "multipla",
      pergunta: "Em qual equipe gostaria de servir?",
      instrucao: "Marque quantas forem o caso.",
      opcoes: EQUIPES,
      mostrarSe: LIDER_MOSTRAR_SE,
    },

    // ---------- dados básicos (todo mundo) ----------
    {
      id: "dias", numero: true, secao: "Sobre sua participação", tipo: "multipla",
      pergunta: "Em quais dias e períodos você participou?",
      instrucao: "Marque quantos forem o caso, ou escolha Todos.",
      opcoes: ["Todos", "Sexta à noite", "Sábado de manhã", "Sábado à tarde", "Sábado à noite", "Domingo de manhã"],
      exclusivas: ["Todos"],
    },
    {
      id: "dormiu", numero: true, secao: "Sobre sua participação", tipo: "unica",
      pergunta: "Dormiu no retiro ou não?",
      opcoes: ["Dormi no retiro", "Não dormi nenhum dia"],
    },
    {
      id: "idade", numero: true, secao: "Sobre você", tipo: "unica",
      pergunta: "Faixa etária",
      opcoes: ["Até 19", "20 a 25", "26 a 30", "Mais de 30"],
    },
    {
      id: "genero", numero: true, secao: "Sobre você", tipo: "unica",
      pergunta: "Gênero",
      opcoes: ["Masculino", "Feminino"],
    },
    {
      id: "primeira_vez_retiro", numero: true, secao: "Sobre você", tipo: "unica",
      pergunta: "É sua primeira vez em um retiro?",
      opcoes: ["Sim, nunca fui em nenhum retiro", "Não, já fui em outros retiros"],
    },
    {
      id: "primeira_vez_overflow", numero: true, secao: "Sobre você", tipo: "unica",
      pergunta: "É sua primeira vez no Overflow?",
      opcoes: ["Sim", "Não"],
      mostrarSe: { pergunta: "primeira_vez_retiro", opcoes: ["Não, já fui em outros retiros"] },
    },

    // ---------- satisfação geral ----------
    {
      id: "valor_retiro", numero: true, secao: "Satisfação geral", tipo: "unica",
      pergunta: "Como você avalia o custo-benefício do valor pago pelo Overflow?",
      opcoes: ["Caro, não valeu a pena", "Caro, mas valeu a pena", "Preço justo pelo que recebi", "Barato pelo que recebi"],
    },
    {
      id: "nps", numero: true, secao: "Satisfação geral", tipo: "nps",
      pergunta: "De 0 a 10, qual a probabilidade de você recomendar o Overflow a um amigo?",
      instrucao: "0 = nunca recomendaria · 10 = com certeza recomendaria",
    },
    {
      id: "satisfacao_geral", numero: true, secao: "Satisfação geral", tipo: "estrela",
      pergunta: "De forma geral, qual sua satisfação com o retiro?",
    },
    {
      id: "expectativas", numero: true, secao: "Satisfação geral", tipo: "unica",
      pergunta: "O retiro atendeu suas expectativas?",
      opcoes: ["Muito abaixo", "Abaixo", "Atendeu", "Superou"],
    },
    {
      id: "participaria_novamente", numero: true, secao: "Satisfação geral", tipo: "unica",
      pergunta: "Participaria novamente no próximo ano?",
      opcoes: ["Sim", "Talvez", "Não"],
    },

    // ---------- cultos ----------
    {
      id: "intro_cultos", tipo: "conteudo", secao: "Vamos avaliar por culto",
      titulo: "Vamos avaliar por culto",
      texto: "Agora, pra cada um dos 4 cultos, avalie alguns pontos e conte o que mais te marcou.",
    },
    ...culto(1, { quando: "sexta à noite", pregacao: "Pregação: Pr. Filipe Bittencourt", direcao: "Anahy e Rafa" }),
    ...culto(2, { quando: "sábado de manhã", pregacao: "Pregação: Pr. Eli e Pra. Suene", direcao: "Luan e Fran" }),
    ...culto(3, { quando: "sábado à noite", pregacao: "Pregação: Pr. Eli e Pra. Suene", direcao: "Mari" }),
    ...culto(4, { quando: "domingo de manhã", pregacao: "Pregação: Yuri Breder", direcao: "Gabi e Luiz" }),

    // ---------- estrutura e logística ----------
    {
      id: "logistica", numero: true, secao: "Estrutura e logística", tipo: "escala_grade",
      pergunta: "Avalie cada item da estrutura do Overflow",
      itens: [
        "Check-in (agilidade/organização)",
        "Decoração e identidade visual",
        "Kit do participante (utilidade/qualidade)",
        "Quartos/Alojamento (conforto/organização)",
        "Banheiros e limpeza",
        "Alimentação (sabor, variedade, quantidade)",
        "Comunicação (avisos, horários, instruções)",
        "Dinâmicas/Gincanas (clareza, segurança, diversão)",
        "Mídia (áudio, projeção, registro)",
        "Percepção de segurança/emergências",
        "Hospitalidade (recepção, acolhimento de visitantes)",
      ],
      rotulos: ESCALA_QUALIDADE, naoSei: "Não sei avaliar",
    },

    // ---------- momentos especiais ----------
    {
      id: "momentos", numero: true, secao: "Momentos especiais", tipo: "escala_grade",
      pergunta: "Avalie os momentos especiais do Overflow",
      itens: [
        "Montagem das Bandeiras (sexta à noite)",
        "Gincana Bíblica Indoor (sábado de manhã)",
        "Circuito Físico / Batalha Naval (sábado à tarde)",
        "Pega-Bandeira Noturno (sábado à noite)",
        "Devocionais (sábado e domingo de manhã)",
      ],
      rotulos: ESCALA_QUALIDADE, naoSei: "Não participei",
    },

    // ---------- impacto espiritual ----------
    {
      id: "impacto", numero: true, secao: "Impacto espiritual", tipo: "escala_grade",
      pergunta: "O quanto você concorda com cada frase",
      itens: [
        'Entendi e vivi o tema "Novos Começos"',
        "Fui desafiado(a) a viver algo novo com Deus depois do retiro",
        "Tive um encontro com Deus / experiência marcante",
        "Pretendo me engajar mais no PGM / serviço na igreja",
      ],
      rotulos: ESCALA_CONCORDANCIA, naoSei: "Prefiro não responder",
    },

    // ---------- perguntas abertas gerais ----------
    { id: "aberta_deus_falou", secao: "Pra fechar", tipo: "aberta", longa: true, pergunta: "Conte, em poucas palavras, algo que Deus falou com você." },
    { id: "aberta_adicionar", secao: "Pra fechar", tipo: "aberta", longa: true, pergunta: "O que deveríamos adicionar no próximo Overflow?" },
    { id: "aberta_nao_funcionou", secao: "Pra fechar", tipo: "aberta", longa: true, pergunta: "O que não funcionou e deve ser repensado?" },
    { id: "aberta_deu_certo", secao: "Pra fechar", tipo: "aberta", longa: true, pergunta: "O que deu muito certo e precisa permanecer?" },
    { id: "aberta_temas", secao: "Pra fechar", tipo: "aberta", longa: true, pergunta: "Temas, convidados ou ideias para o próximo ano?" },
    { id: "aberta_outra_coisa", secao: "Pra fechar", tipo: "aberta", longa: true, pergunta: "Algo importante que não perguntamos?" },
  ],
};
