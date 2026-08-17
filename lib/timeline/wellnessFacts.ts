// Curadoria própria em PT-BR: a API que usávamos antes (API Ninjas) só
// retorna fatos em inglês, sem opção de idioma — por isso trocamos por uma
// lista fixa. Escolhida deterministicamente por dia do ano, igual à frase
// motivacional, pra ser a mesma pra todo mundo no mesmo dia.
const WELLNESS_FACTS: string[] = [
  "Beber água antes das refeições ajuda no controle do apetite e na digestão.",
  "Dormir de 7 a 9 horas por noite melhora a memória e o sistema imunológico.",
  "Caminhar 30 minutos por dia já reduz o risco de doenças cardiovasculares.",
  "A vitamina D é produzida pelo corpo com a exposição ao sol, mas também está em peixes e ovos.",
  "Rir de verdade libera endorfina e reduz o hormônio do estresse.",
  "O intestino produz boa parte da serotonina do corpo — cuidar da alimentação também cuida do humor.",
  "Alongar-se pela manhã melhora a circulação e reduz dores musculares ao longo do dia.",
  "Lavar as mãos por 20 segundos é uma das formas mais eficazes de evitar infecções.",
  "Reduzir o consumo de sal em excesso ajuda a manter a pressão arterial sob controle.",
  "Respirar fundo por alguns minutos ativa o sistema nervoso parassimpático e reduz a ansiedade.",
  "Fibras presentes em frutas e vegetais ajudam a controlar o açúcar no sangue.",
  "Exercícios de força, mesmo leves, ajudam a preservar massa muscular com a idade.",
  "A postura correta ao sentar reduz dores nas costas e no pescoço.",
  "Manter contato social regular está associado a uma vida mais longa e saudável.",
  "Escovar os dentes por 2 minutos, duas vezes ao dia, é o mínimo recomendado pelos dentistas.",
  "Tomar sol nos primeiros horários da manhã ajuda a regular o sono à noite.",
  "Comer devagar ajuda o cérebro a perceber a saciedade e evita comer em excesso.",
  "Pequenas pausas durante o trabalho reduzem a fadiga mental e aumentam o foco.",
  "Manter-se hidratado melhora até o desempenho cognitivo, não só o físico.",
  "Praticar gratidão, mesmo por escrito, está associado a menos sintomas de ansiedade.",
  "O consumo excessivo de açúcar pode afetar o humor além do peso corporal.",
  "Levantar e se movimentar a cada hora reduz os riscos de ficar muito tempo sentado.",
  "Ouvir música que você gosta pode reduzir a percepção de dor e estresse.",
  "Manter as vacinas em dia protege não só você, mas quem está ao seu redor.",
  "Uma boa noite de sono ajuda o corpo a consolidar o que foi aprendido no dia.",
  "Frutas vermelhas (morango, amora, mirtilo) são ricas em antioxidantes naturais.",
  "Passar tempo ao ar livre reduz o cortisol, o hormônio do estresse.",
  "Controlar a pressão arterial regularmente ajuda a prevenir complicações silenciosas.",
  "Manter o peso corporal saudável reduz a sobrecarga nas articulações.",
  "Cuidar da saúde bucal está diretamente ligado à saúde do coração.",
];

export function pickWellnessFact(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return WELLNESS_FACTS[dayOfYear % WELLNESS_FACTS.length];
}
