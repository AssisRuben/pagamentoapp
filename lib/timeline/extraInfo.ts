// Texto fixo (não dinâmico) mostrado quando o card é expandido — contexto
// sobre por que aquele tipo de conquista/conteúdo importa.
const EXTRA_INFO: Record<string, string> = {
  ACHIEVEMENT_WEIGHT:
    "Pequenas reduções de peso ao longo do tempo já ajudam a pressão, o colesterol e a disposição no dia a dia. Continue registrando pra acompanhar sua evolução.",
  ACHIEVEMENT_PRESSURE:
    "Manter a pressão sob controle é um dos cuidados mais importantes pra saúde do coração a longo prazo. Meça regularmente, mesmo quando estiver tudo bem.",
  ACHIEVEMENT_CARE_COMPLETE:
    "Manter uma rotina de cuidados em dia — medicação, treino, hábitos — é o que mais impacta resultados de saúde a longo prazo.",
  "content-fact":
    "Pequenos hábitos diários fazem diferença acumulada na sua saúde. Pesquisas mostram que mudanças simples e consistentes ao longo do tempo têm mais impacto do que grandes mudanças pontuais e difíceis de manter. Vale escolher um hábito por vez e trazer aos poucos pra rotina.",
  "content-finance":
    "Acompanhar indicadores econômicos como câmbio, Selic e IPCA ajuda no planejamento financeiro do dia a dia — desde decidir uma compra parcelada até avaliar se vale mais guardar dinheiro rendendo perto da Selic ou investir em algo com mais risco. São números que mudam todos os dias, então vale o hábito de dar uma olhada com frequência.",
  "content-quote":
    "Motivação é o que ajuda a manter consistência nos seus cuidados, dia após dia. Nos dias em que a disposição estiver mais baixa, lembrar o motivo por trás da rotina — saúde, família, bem-estar — costuma pesar mais do que a vontade momentânea de pular um dia.",
};

export function getExtraInfo(key: string): string {
  return EXTRA_INFO[key] ?? "";
}
