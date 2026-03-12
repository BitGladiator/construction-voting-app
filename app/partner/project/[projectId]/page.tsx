"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { VotingBallot } from "@/components/project/voting-ballot";

export default function PartnerProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        setErrorMessage("Something went wrong while loading data.");
        setLoading(false);
        return;
      }

      if (!data) {
        setProject(null);
        setLoading(false);
        return;
      }

      setProject(data);
      setLoading(false);
    };

    loadProject();
  }, [projectId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="p-10 text-slate-500">Loading...</div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="rounded-xl border bg-red-50 p-6 text-red-700">
          {errorMessage}
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="rounded-xl border bg-yellow-50 p-6 text-yellow-700">
          Project not found or you do not have access.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <h1 className="text-3xl font-bold">{project.title}</h1>

      <p className="mt-2 text-slate-600">
        Cast your vote for the options below.
      </p>

      <div className="mt-8">
        <VotingBallot projectId={projectId} />
      </div>
    </main>
  );
}