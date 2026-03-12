"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";

type SegmentOption = {
  id: string;
  label: string;
  sort_order: number;
};

type ProjectSegment = {
  id: string;
  title: string;
  sort_order: number;
  segment_options?: SegmentOption[];
};

export default function ProjectEditorPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [segments, setSegments] = useState<ProjectSegment[]>([]);
  const [newSegmentTitle, setNewSegmentTitle] = useState("");
  const [addingSegment, setAddingSegment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProject = async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      setErrorMessage("Something went wrong while loading data.");
      setLoading(false);
      return;
    }
    setProject(data);
    setLoading(false);
  };

  const loadSegments = async () => {
    const { data, error } = await supabase
      .from("project_segments")
      .select(
        `
        *,
        segment_options (*)
      `
      )
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      setErrorMessage("Something went wrong while loading data.");
      return;
    }
    setSegments(data || []);
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  useEffect(() => {
    if (projectId && project) loadSegments();
  }, [projectId, project]);

  const handleAddSegment = async () => {
    if (!newSegmentTitle.trim()) return;

    const maxOrder =
      segments.length > 0
        ? Math.max(...segments.map((s) => s.sort_order)) + 1
        : 1;

    const { error } = await supabase
      .from("project_segments")
      .insert({
        project_id: projectId,
        title: newSegmentTitle.trim(),
        sort_order: maxOrder,
      });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setNewSegmentTitle("");
    setAddingSegment(false);
    loadSegments();
  };


  const handleUpdateOption = async (optionId: string, label: string) => {
    const { error } = await supabase
      .from("segment_options")
      .update({ label })
      .eq("id", optionId);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadSegments();
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm("Delete this segment and all its options?")) return;

    const { error } = await supabase
      .from("project_segments")
      .delete()
      .eq("id", segmentId);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadSegments();
  };

 const handleUpdateStatus = async (status: string) => {
  const { data, error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  setProject(data);
};

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-10">
        <div className="p-10 text-slate-500">Loading...</div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="mx-auto max-w-5xl p-10">
        <div className="rounded-xl border bg-red-50 p-6 text-red-700">
          {errorMessage}
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto max-w-5xl p-10">
        <div className="rounded-xl border bg-yellow-50 p-6 text-yellow-700">
          Project not found or you do not have access.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-10">

      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin"
          className="text-slate-600 underline hover:text-slate-900"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold">{project.title}</h1>
      <p className="mt-2 text-slate-600">{project.description}</p>

      {/* Configure voting */}
      <div className="mt-8 rounded-2xl border p-6">

  <div className="flex items-center justify-between">

    <h2 className="text-xl font-semibold">Configure Voting</h2>

    <Link
      href={`/partner/project/${projectId}`}
      className="rounded-xl border px-4 py-2 hover:bg-slate-50"
    >
      Preview Voting
    </Link>

  </div>

  <div className="mt-4 flex gap-2">
          {["draft", "open", "closed"].map((status) => (
            <button
              key={status}
              onClick={() => handleUpdateStatus(status)}
              className={`rounded-xl px-4 py-2 ${
                project.status === status
                  ? "bg-slate-900 text-white"
                  : "border bg-white"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}