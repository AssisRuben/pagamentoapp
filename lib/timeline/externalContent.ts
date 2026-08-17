const API_NINJAS_KEY = process.env.API_NINJAS_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const FRASES_JSON_URL =
  "https://raw.githubusercontent.com/devmatheusguerra/frasesJSON/master/frases.json";

export type WellnessFact = { text: string };
export type FinanceSnippet = { text: string };
export type FunQuote = { text: string; author: string };

/**
 * Curiosidade do dia (a mesma pra todo mundo, a API já garante isso).
 * Retorna null em qualquer falha — conteúdo decorativo nunca pode derrubar
 * a home.
 */
export async function fetchWellnessFact(): Promise<WellnessFact | null> {
  if (!API_NINJAS_KEY) return null;
  try {
    const res = await fetch("https://api.api-ninjas.com/v1/factoftheday", {
      headers: { "X-Api-Key": API_NINJAS_KEY },
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const fact = Array.isArray(data) ? data[0]?.fact : data?.fact;
    return typeof fact === "string" ? { text: fact } : null;
  } catch {
    return null;
  }
}

/**
 * Dólar (AwesomeAPI) + Selic (BCB SGS série 432), combinados num texto
 * curto. Nenhuma das duas exige chave.
 */
export async function fetchFinanceSnippet(): Promise<FinanceSnippet | null> {
  try {
    const [dolarRes, selicRes] = await Promise.all([
      fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
        next: { revalidate: 3600 },
      }),
      fetch(
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
        { next: { revalidate: 3600 } }
      ),
    ]);

    const parts: string[] = [];

    if (dolarRes.ok) {
      const dolarData = await dolarRes.json();
      const bid = dolarData?.USDBRL?.bid;
      if (bid) {
        parts.push(`Dólar hoje: R$ ${Number(bid).toFixed(2).replace(".", ",")}`);
      }
    }

    if (selicRes.ok) {
      const selicData = await selicRes.json();
      const valor = selicData?.[0]?.valor;
      if (valor) {
        parts.push(`Selic: ${String(valor).replace(".", ",")}% a.a.`);
      }
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
