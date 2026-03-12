"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { VotingBallot } from "@/components/project/voting-ballot";

export default function PartnerProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const loadProject = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setProject(data);
    };

    loadProject();
  }, [projectId]);

  if (!project) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <p>Loading project...</p>
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