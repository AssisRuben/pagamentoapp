export function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function todayDateString(): string {
  return todayDate().toISOString().slice(0, 10);
}

export function formatDateLabel(date: Date): string {
  const today = todayDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (target.getTime() === today.getTime()) return "Hoje";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
