import { InterviewDemo } from "@/app/portfolio/InterviewDemo";
import { LandingFooter } from "@/app/landing/LandingFooter";
import { LandingNav } from "@/app/landing/LandingNav";
import results from "@/evals/results.json";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pantalla · TV menu, closed commands",
  description:
    "A store TV menu that changes only when a signed, allowlisted message resolves to a closed command.",
};

export default function Home() {
  const cases = results.cases;
  return (
    <div className="landing-shell">
      <LandingNav />
      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-8 pt-12">
          <p className="text-sm font-black tracking-[0.28em] text-pink-600">PANTALLA</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-none text-zinc-900 sm:text-6xl">
            One WhatsApp message updates the board.
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold text-zinc-600">
            A model may return only set_available, set_price, add_item,
            set_photo, hide_item, help, or unknown. Any other shape is
            rejected. Unknown falls back to the regex parser. The signature
            and the sender allowlist run before either one. This demo board
            is the interview session. The signed webhook is what writes the
            store menu.
          </p>
        </section>

        <section id="demo" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 pb-16">
          <InterviewDemo />
        </section>

        <section id="eval" className="border-t border-pink-100 bg-white py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <h2 className="font-display text-3xl text-zinc-900">Thirty-two messy messages</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold text-zinc-600">
              {results.summary.pass} pass, {results.summary.fail} fail of {results.summary.total}.{" "}
              {results.note} Ran {results.ranAt.slice(0, 10)}. Schema checks:{" "}
              {results.schemaChecks.filter((item) => item.pass).length}/{results.schemaChecks.length}{" "}
              pass.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead>
                  <tr className="text-xs tracking-wide text-zinc-500">
                    <th className="py-2 pr-3 font-bold">Result</th>
                    <th className="py-2 pr-3 font-bold">Message</th>
                    <th className="py-2 pr-3 font-bold">Expected</th>
                    <th className="py-2 pr-3 font-bold">Actual</th>
                    <th className="py-2 pr-3 font-bold">Source</th>
                    <th className="py-2 pr-3 font-bold">Model</th>
                    <th className="py-2 pr-3 font-bold">Latency</th>
                    <th className="py-2 font-bold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((row) => (
                    <tr key={row.id} className="border-t border-zinc-100 align-top">
                      <td className="py-2 pr-3 font-black text-zinc-900">
                        {row.pass ? "pass" : "fail"}
                      </td>
                      <td className="py-2 pr-3 font-semibold text-zinc-800">{row.text}</td>
                      <td className="py-2 pr-3 text-zinc-600">{row.expect.type}</td>
                      <td className="py-2 pr-3 text-zinc-600">{row.actual.type}</td>
                      <td className="py-2 pr-3 text-zinc-600">{row.source}</td>
                      <td className="py-2 pr-3 text-zinc-600">
                        {row.model ?? row.modelOutcome}
                      </td>
                      <td className="py-2 pr-3 text-zinc-600">
                        {row.latencyMs == null ? "—" : `${row.latencyMs} ms`}
                      </td>
                      <td className="py-2 text-zinc-600">
                        {row.costUsd == null ? "—" : `$${row.costUsd}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
