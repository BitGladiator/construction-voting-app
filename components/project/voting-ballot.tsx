"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

type SegmentOption = { id: string; label: string; sort_order?: number };
type Segment = { id: string; title: string; options: SegmentOption[] };

type VotingBallotProps = {
  projectId: string;
};

export function VotingBallot({ projectId }: VotingBallotProps) {
  const [scores, setScores] = useState<Record<string, number | "">>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [votesLocked, setVotesLocked] = useState(false);
  const [project, setProject] = useState<{ status: string } | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setSegmentsLoading(true);
      setLoadErrorMessage(null);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("status")
        .eq("id", projectId)
        .single();

      if (projectError) {
        console.error("Supabase error:", projectError);
        setLoadErrorMessage("Something went wrong while loading data.");
        setSegmentsLoading(false);
        return;
      }
      setProject(projectData ?? null);

      const { data: segmentsData, error: segmentsError } = await supabase
        .from("project_segments")
        .select("id, title, segment_options(id, label, sort_order)")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (segmentsError) {
        console.error("Supabase error:", segmentsError);
        setLoadErrorMessage("Something went wrong while loading data.");
        setSegmentsLoading(false);
        return;
      }

      const mapped: Segment[] = (segmentsData || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        options: (s.segment_options || []).sort(
          (a: SegmentOption, b: SegmentOption) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0)
        ),
      }));
      setSegments(mapped);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from("votes")
          .select("id")
          .eq("project_id", projectId)
          .eq("voter_id", user.id)
          .limit(1);
        if (existing && existing.length > 0) {
          setVotesLocked(true);
          setMessage("✅ Your votes have been locked successfully.");
        }
      }
      setSegmentsLoading(false);
    };
    load();
  }, [projectId]);

  const saveDraft = () => {
    console.log("Saving draft for project:", projectId);
    console.log(scores);
  };

  const lockVotes = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to vote.");
      }

      if (project?.status === "draft" || project?.status === "closed") {
        throw new Error("Voting is not currently open for this project.");
      }

      const { data: existing } = await supabase
        .from("votes")
        .select("id")
        .eq("project_id", projectId)
        .eq("voter_id", user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("You have already voted for this project.");
      }

      const allOptionKeys = segments.flatMap((seg) =>
        seg.options.map((opt) => `${seg.id}::${opt.id}`)
      );
      const scoredKeys = Object.keys(scores).filter(
        (k) => typeof scores[k] === "number" && scores[k] >= 1 && scores[k] <= 10
      );
      const missing = allOptionKeys.filter((k) => !scoredKeys.includes(k));
      if (missing.length > 0) {
        throw new Error("Please score every option before locking votes.");
      }

      const voteRows = Object.entries(scores)
        .filter(([, v]) => typeof v === "number" && v >= 1 && v <= 10)
        .map(([key, score]) => {
          const [segmentId, optionId] = key.split("::");
          return {
            project_id: projectId,
            segment_id: segmentId,
            option_id: optionId,
            score: score as number,
            voter_id: user.id,
            is_locked: true,
            locked_at: new Date().toISOString(),
          };
        });

      const { error: insertError } = await supabase.from("votes").insert(voteRows);

      if (insertError) throw new Error(insertError.message);

      setVotesLocked(true);
      setMessage("✅ Your votes have been locked successfully.");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isVotingDisabled =
    project?.status === "draft" ||
    project?.status === "closed" ||
    votesLocked;
  const ballotSegments = segments;

  if (segmentsLoading) {
    return <div className="p-10 text-slate-500">Loading...</div>;
  }

  if (loadErrorMessage) {
    return (
      <div className="rounded-xl border bg-red-50 p-6 text-red-700">
        {loadErrorMessage}
      </div>
    );
  }

  if (ballotSegments.length === 0) {
    return (
      <div className="rounded-xl border bg-yellow-50 p-6 text-yellow-700">
        No data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isVotingDisabled && project?.status !== "open" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
          Voting is not currently open for this project.
        </div>
      )}
      {ballotSegments.map((segment) => (
        <div
          key={segment.id}
          className="rounded-2xl border bg-white p-5 shadow-sm"
        >
          <h2 className="text-xl font-semibold">{segment.title}</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {segment.options.map((option) => {
              const key = `${segment.id}::${option.id}`;

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
                    disabled={isVotingDisabled}
                    className="mt-1 w-full rounded-xl border px-3 py-2 disabled:opacity-60"
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

      {message && (
  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-green-700">
    {message}
  </div>
)}

{error && (
  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
    {error}
  </div>
)}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={saveDraft}
          disabled={isVotingDisabled}
          className="rounded-xl border px-4 py-2 disabled:opacity-60"
        >
          Save draft
        </button>

        <button
          type="button"
          onClick={lockVotes}
          disabled={loading || isVotingDisabled}
          className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Locking..." : "Lock my votes"}
        </button>
      </div>
    </div>
  );
}