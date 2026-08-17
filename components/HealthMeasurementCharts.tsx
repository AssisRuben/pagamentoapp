"use client";

import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { HealthMeasurement } from "@/lib/generated/prisma/client";

function shortDate(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="h-36">{children}</div>
    </div>
  );
}

const chartMargin = { top: 4, right: 8, left: -24, bottom: 0 };
const axisTick = { fontSize: 10 };

export default function HealthMeasurementCharts({
  history,
}: {
  history: HealthMeasurement[];
}) {
  const sorted = [...history].sort(
    (a, b) => a.measuredAt.getTime() - b.measuredAt.getTime()
  );

  const pressao = sorted
    .filter((m) => m.type === "PRESSAO")
    .map((m) => ({
      date: shortDate(m.measuredAt),
      Sistólica: m.pressaoSistolica,
      Diastólica: m.pressaoDiastolica,
    }));
  const peso = sorted
    .filter((m) => m.type === "PESO")
    .map((m) => ({ date: shortDate(m.measuredAt), Peso: m.pesoKg }));
  const gordura = sorted
    .filter((m) => m.type === "GORDURA")
    .map((m) => ({ date: shortDate(m.measuredAt), Gordura: m.percentualGordura }));
  const glicemia = sorted
    .filter((m) => m.type === "GLICEMIA")
    .map((m) => ({ date: shortDate(m.measuredAt), Glicemia: m.glicemiaMgDl }));

  if (pressao.length + peso.length + gordura.length + glicemia.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">Evolução</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pressao.length > 0 && (
          <ChartCard title="Pressão (mmHg)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pressao} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={axisTick} />
                <YAxis tick={axisTick} domain={["auto", "auto"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Sistólica"
                  stroke="var(--color-coral)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Diastólica"
                  stroke="var(--color-mint)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {peso.length > 0 && (
          <ChartCard title="Peso (kg)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peso} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={axisTick} />
                <YAxis tick={axisTick} domain={["auto", "auto"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Peso"
                  stroke="var(--color-coral)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {gordura.length > 0 && (
          <ChartCard title="Gordura corporal (%)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gordura} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={axisTick} />
                <YAxis tick={axisTick} domain={["auto", "auto"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Gordura"
                  stroke="var(--color-mint)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {glicemia.length > 0 && (
          <ChartCard title="Glicemia (mg/dL)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={glicemia} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={axisTick} />
                <YAxis tick={axisTick} domain={["auto", "auto"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Glicemia"
                  stroke="var(--color-coral)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </section>
  );
}
