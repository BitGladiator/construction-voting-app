"use client";

import { useState } from "react";
import { sampleBallot } from "@/lib/reports/mock-data";

type VotingBallotProps = {
  projectId: string;
};

export function VotingBallot({ projectId }: VotingBallotProps) {
  const [scores, setScores] = useState<Record<string, number | "">>({});

  const saveDraft = () => {
    console.log("Saving draft for project:", projectId);
    console.log(scores);
  };

  const lockVotes = () => {
    console.log("Locking votes for project:", projectId);
    console.log(scores);
  };

  return (
    <div className="space-y-6">
      {sampleBallot.map((segment) => (
        <div
          key={segment.id}
          className="rounded-2xl border bg-white p-5 shadow-sm"
        >
          <h2 className="text-xl font-semibold">{segment.title}</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {segment.options.map((option) => {
              const key = `${segment.id}-${option.id}`;

              return (
                <div key={option.id} className="rounded-xl border p-4">
                  <div className="font-medium">{option.label}</div>

                  <label className="mt-3 block text-xs text-slate-500">
                    Score 1 to 10
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={scores[key] ?? ""}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [key]:
                          e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={saveDraft}
          className="rounded-xl border px-4 py-2"
        >
          Save draft
        </button>

        <button
          onClick={lockVotes}
          className="rounded-xl bg-slate-900 px-4 py-2 text-white"
        >
          Lock my votes
        </button>
      </div>
    </div>
  );
}