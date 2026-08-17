import { prisma } from "@/lib/prisma";

export type CareSignalLevel = "unknown" | "green" | "yellow" | "red";

export type CareSignal = {
  level: CareSignalLevel;
  message: string;
};

const MESSAGES: Record<CareSignalLevel, string> = {
  unknown: "Ainda não temos informação suficiente.",
  green: "Tudo em dia por aí 💚",
  yellow: "Pode ser um bom momento pra dar um oi 💛",
  red: "Faz um tempo que não tem novidade — que tal ligar? 🧡",
};

// Folga (em dias) antes/depois da data esperada de reposição pra não
// disparar "atrasado" por um atraso de poucos dias.
const BUFFER_DAYS = 5;

/**
 * Calcula um sinal discreto sobre reposição de medicamentos de uso
 * contínuo do titular — nunca revela qual produto ou quando foi comprado,
 * só o nível (pior caso entre os itens de uso contínuo) e uma frase.
 */
export async function getCareSignal(titularId: string): Promise<CareSignal> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: { userId: titularId, status: "APPROVED" },
      product: { usoContinuo: true },
    },
    include: { order: true, product: true },
    orderBy: { order: { createdAt: "desc" } },
  });

  if (items.length === 0) {
    return { level: "unknown", message: MESSAGES.unknown };
  }

  // Última compra de cada produto de uso contínuo.
  const lastPurchaseByProduct = new Map<string, Date>();
  for (const item of items) {
    if (!lastPurchaseByProduct.has(item.productId)) {
      lastPurchaseByProduct.set(item.productId, item.order.createdAt);
    }
  }

  const now = Date.now();
  let worst: CareSignalLevel = "green";

  for (const item of items) {
    if (!item.product.duracaoEstimadaDias) continue;
    const lastPurchase = lastPurchaseByProduct.get(item.productId);
    if (!lastPurchase) continue;

    const expectedMs =
      lastPurchase.getTime() +
      item.product.duracaoEstimadaDias * 24 * 60 * 60 * 1000;
    const bufferMs = BUFFER_DAYS * 24 * 60 * 60 * 1000;

    let level: CareSignalLevel;
    if (now < expectedMs - bufferMs) level = "green";
    else if (now <= expectedMs + bufferMs) level = "yellow";
    else level = "red";

    if (level === "red") worst = "red";
    else if (level === "yellow" && worst !== "red") worst = "yellow";
  }

  return { level: worst, message: MESSAGES[worst] };
}
