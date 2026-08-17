import { pickWellnessFacts } from "./wellnessFacts";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const NINJA_API_KEY = process.env.NINJA_API_KEY;
const NINJA_FACTS_MAX_LIMIT = 30;

const FRASES_JSON_URL =
  "https://raw.githubusercontent.com/devmatheusguerra/frasesJSON/master/frases.json";

export type WellnessFact = { text: string };
export type FinanceSnippet = { text: string };
export type FunQuote = { text: string; author: string };

/**
 * Curiosidades do dia, uma por post — puxadas da API Ninjas (Facts API,
 * `limit` máximo de 30 por chamada, o teto real da API, não uma escolha
 * nossa). Vem só em inglês, a API não tem parâmetro de idioma. Se a chave
 * não estiver configurada ou a chamada falhar, cai pra lista curada em
 * PT-BR (`wellnessFacts.ts`) — o feed nunca fica sem esses posts.
 */
export async function fetchNinjaFacts(limit = NINJA_FACTS_MAX_LIMIT): Promise<WellnessFact[]> {
  const cappedLimit = Math.min(limit, NINJA_FACTS_MAX_LIMIT);

  if (NINJA_API_KEY) {
    try {
      const url = new URL("https://api.api-ninjas.com/v1/facts");
      url.searchParams.set("limit", String(cappedLimit));
      const res = await fetch(url, {
        headers: { "X-Api-Key": NINJA_API_KEY },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data: { fact: string }[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((d) => ({ text: d.fact }));
        }
      }
    } catch {
      // cai pro fallback abaixo
    }
  }

  return pickWellnessFacts(cappedLimit).map((text) => ({ text }));
}

/**
 * Câmbio (AwesomeAPI: dólar, euro, bitcoin, num único request multi-par) +
 * Selic e IPCA (BCB SGS séries 432 e 433), combinados num texto único.
 * Nenhuma das duas exige chave.
 */
export async function fetchFinanceSnippet(): Promise<FinanceSnippet | null> {
  try {
    const [cambioRes, selicRes, ipcaRes] = await Promise.all([
      fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL", {
        next: { revalidate: 3600 },
      }),
      fetch(
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
        { next: { revalidate: 3600 } }
      ),
      fetch(
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json",
        { next: { revalidate: 3600 } }
      ),
    ]);

    const parts: string[] = [];

    if (cambioRes.ok) {
      const cambioData = await cambioRes.json();
      const dolar = cambioData?.USDBRL?.bid;
      const euro = cambioData?.EURBRL?.bid;
      const bitcoin = cambioData?.BTCBRL?.bid;

      if (dolar) parts.push(`Dólar: R$ ${Number(dolar).toFixed(2).replace(".", ",")}`);
      if (euro) parts.push(`Euro: R$ ${Number(euro).toFixed(2).replace(".", ",")}`);
      if (bitcoin) {
        const valor = Number(bitcoin);
        const label = valor >= 1000 ? `${(valor / 1000).toFixed(1)} mil` : valor.toFixed(0);
        parts.push(`Bitcoin: R$ ${label.replace(".", ",")}`);
      }
    }

    if (selicRes.ok) {
      const selicData = await selicRes.json();
      const valor = selicData?.[0]?.valor;
      if (valor) parts.push(`Selic: ${String(valor).replace(".", ",")}% a.a.`);
    }

    if (ipcaRes.ok) {
      const ipcaData = await ipcaRes.json();
      const valor = ipcaData?.[0]?.valor;
      if (valor) parts.push(`IPCA do mês: ${String(valor).replace(".", ",")}%`);
    }

    if (parts.length === 0) return null;
    return { text: parts.join(" · ") };
  } catch {
    return null;
  }
}

/**
 * Frase do dia, escolhida deterministicamente pelo dia do ano dentro do
 * JSON estático (hospedado no GitHub — grátis, sem chave, sem limite
 * prático). Mesma frase pra todo mundo no mesmo dia.
 */
export async function fetchFunQuote(): Promise<FunQuote | null> {
  try {
    const res = await fetch(FRASES_JSON_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const frases: { autor: string; frase: string }[] = await res.json();
    if (!Array.isArray(frases) || frases.length === 0) return null;

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const escolhida = frases[dayOfYear % frases.length];
    return { text: escolhida.frase, author: escolhida.autor };
  } catch {
    return null;
  }
}

/**
 * Foto de capa por palavra-chave (Unsplash). Retorna null se não tiver
 * chave configurada ou a busca falhar — os cards funcionam sem imagem.
 */
export async function fetchCoverImage(query: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}
