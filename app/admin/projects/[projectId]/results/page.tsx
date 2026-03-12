"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type ResultOption = { label: string; avgScore: number };
type ResultSegment = { title: string; options: ResultOption[] };

export default function ResultsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<{ title: string } | null>(null);
  const [results, setResults] = useState<ResultSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: projectData } = await supabase
        .from("projects")
        .select("title")
        .eq("id", projectId)
        .single();
      setProject(projectData ?? null);

      const { data: votes } = await supabase
        .from("votes")
        .select("segment_id, option_id, score")
        .eq("project_id", projectId);

      const { data: segments } = await supabase
        .from("project_segments")
        .select("id, title, segment_options(id, label)")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (!votes || !segments) {
        setLoading(false);
        return;
      }

      const optionScores: Record<string, number[]> = {};
      for (const v of votes) {
        const key = `${v.segment_id}::${v.option_id}`;
        if (!optionScores[key]) optionScores[key] = [];
        optionScores[key].push(v.score);
      }

      const optionLabels: Record<string, string> = {};
      for (const seg of segments) {
        for (const opt of seg.segment_options || []) {
          optionLabels[`${seg.id}::${opt.id}`] = opt.label;
        }
      }

      const segmentResults: ResultSegment[] = segments.map((seg) => {
        const options: ResultOption[] = (seg.segment_options || [])
          .map((opt) => {
            const key = `${seg.id}::${opt.id}`;
            const scores = optionScores[key] || [];
            const avg =
              scores.length > 0
                ? scores.reduce((a, b) => a + b, 0) / scores.length
                : 0;
            return { label: opt.label, avgScore: Math.round(avg * 10) / 10 };
          })
          .sort((a, b) => b.avgScore - a.avgScore);
        return { title: seg.title, options };
      });

      setResults(segmentResults);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-6 md:p-10">
        <p className="text-slate-600">Loading results...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/admin/projects/${projectId}`}
          className="text-slate-600 underline hover:text-slate-900"
        >
          ← Back to Project
        </Link>
      </div>
      <h1 className="text-3xl font-bold">
        {project?.title ?? "Project"} Results
      </h1>
      <p className="mt-2 text-slate-600">Average score per option by segment.</p>
      <div className="mt-8 space-y-8">
        {results.map((segment) => (
          <div
            key={segment.title}
            className="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-semibold">{segment.title}</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5">
              {segment.options.map((opt, i) => (
                <li key={opt.label} className="flex justify-between gap-4">
                  <span className="font-medium">{opt.label}</span>
                  <span className="font-bold">{opt.avgScore}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </main>
  );
}
