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

type Participant = {
  id: string;
  profile_id: string;
  profiles: { full_name: string; email: string };
};

export default function ProjectEditorPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [segments, setSegments] = useState<ProjectSegment[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Segment form
  const [newSegmentTitle, setNewSegmentTitle] = useState("");
  const [addingSegment, setAddingSegment] = useState(false);
  const [segmentOptions, setSegmentOptions] = useState(["", "", ""]);

  // Partner form
  const [addingPartner, setAddingPartner] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPassword, setPartnerPassword] = useState("");
  const [partnerMsg, setPartnerMsg] = useState<string | null>(null);
  const [partnerErr, setPartnerErr] = useState<string | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);

  // Option editing
  const [editingOption, setEditingOption] = useState<{ id: string; label: string } | null>(null);

  const loadProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (error) { setErrorMessage("Failed to load project."); setLoading(false); return; }
    setProject(data);
    setLoading(false);
  };

  const loadSegments = async () => {
    const { data, error } = await supabase
      .from("project_segments")
      .select("*, segment_options(*)")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    if (!error) setSegments(data || []);
  };

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from("project_participants")
      .select("id, profile_id, profiles(full_name, email)")
      .eq("project_id", projectId);
    if (!error) setParticipants((data as any) || []);
  };

  useEffect(() => { loadProject(); }, [projectId]);
  useEffect(() => { if (project) { loadSegments(); loadParticipants(); } }, [project]);

  const handleAddSegment = async () => {
    if (!newSegmentTitle.trim()) return;
    const filled = segmentOptions.filter(o => o.trim());
    if (filled.length !== 3) { alert("Please fill all 3 options."); return; }

    const maxOrder = segments.length > 0 ? Math.max(...segments.map(s => s.sort_order)) + 1 : 1;

    const { data: seg, error: segErr } = await supabase
      .from("project_segments")
      .insert({ project_id: projectId, title: newSegmentTitle.trim(), sort_order: maxOrder })
      .select()
      .single();

    if (segErr) { alert(segErr.message); return; }

    const optRows = segmentOptions.map((label, i) => ({
      segment_id: seg.id,
      label: label.trim(),
      sort_order: i + 1,
    }));

    const { error: optErr } = await supabase.from("segment_options").insert(optRows);
    if (optErr) { alert(optErr.message); return; }

    setNewSegmentTitle("");
    setSegmentOptions(["", "", ""]);
    setAddingSegment(false);
    loadSegments();
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm("Delete this segment and its options?")) return;
    const { error } = await supabase.from("project_segments").delete().eq("id", segmentId);
    if (error) { alert(error.message); return; }
    loadSegments();
  };

  const handleSaveOption = async () => {
    if (!editingOption) return;
    const { error } = await supabase
      .from("segment_options")
      .update({ label: editingOption.label })
      .eq("id", editingOption.id);
    if (error) { alert(error.message); return; }
    setEditingOption(null);
    loadSegments();
  };

  const handleUpdateStatus = async (status: string) => {
    const { data, error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", projectId)
      .select()
      .single();
    if (error) { alert(error.message); return; }
    setProject(data);
  };

  const handleAddPartner = async () => {
    if (!partnerName.trim() || !partnerEmail.trim() || !partnerPassword.trim()) {
      setPartnerErr("All fields are required.");
      return;
    }
    if (partnerPassword.length < 6) {
      setPartnerErr("Password must be at least 6 characters.");
      return;
    }

    setPartnerLoading(true);
    setPartnerMsg(null);
    setPartnerErr(null);

    try {
      const res = await fetch("/api/create-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: partnerEmail.trim(),
          password: partnerPassword.trim(),
          fullName: partnerName.trim(),
          projectId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create partner.");

      setPartnerMsg(`✅ Partner "${partnerName.trim()}" created. Login: ${partnerEmail.trim()} / ${partnerPassword.trim()}`);
      setPartnerName("");
      setPartnerEmail("");
      setPartnerPassword("");
      setAddingPartner(false);
      loadParticipants();
    } catch (err: any) {
      setPartnerErr(err.message || "Something went wrong.");
    } finally {
      setPartnerLoading(false);
    }
  };

  const handleRemovePartner = async (participantId: string, name: string) => {
    if (!confirm(`Remove ${name} from this project?`)) return;
    const { error } = await supabase.from("project_participants").delete().eq("id", participantId);
    if (error) { alert(error.message); return; }
    loadParticipants();
  };

  if (loading) return <main className="mx-auto max-w-5xl p-10"><p className="text-slate-500">Loading...</p></main>;
  if (errorMessage) return <main className="mx-auto max-w-5xl p-10"><div className="rounded-xl border bg-red-50 p-6 text-red-700">{errorMessage}</div></main>;
  if (!project) return <main className="mx-auto max-w-5xl p-10"><div className="rounded-xl border bg-yellow-50 p-6 text-yellow-700">Project not found.</div></main>;

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10 space-y-8">
      {/* Back */}
      <Link href="/admin" className="text-slate-600 underline hover:text-slate-900 text-sm">← Back to Dashboard</Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{project.title}</h1>
        <p className="mt-1 text-slate-500">{project.description}</p>
      </div>

      {/* Status control */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold">Voting Status</h2>
            <p className="text-sm text-slate-500">Current: <span className="font-medium capitalize">{project.status}</span></p>
          </div>
          <div className="flex gap-2">
            {["draft", "open", "closed"].map(s => (
              <button
                key={s}
                onClick={() => handleUpdateStatus(s)}
                className={`rounded-xl px-4 py-2 text-sm capitalize ${project.status === s ? "bg-slate-900 text-white" : "border bg-white hover:bg-slate-50"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-3 pt-3 border-t flex-wrap">
          <Link href={`/partner/project/${projectId}`} className="rounded-xl border px-4 py-2 text-sm no-underline hover:bg-slate-50">Preview Ballot</Link>
          <Link href={`/admin/projects/${projectId}/results`} className="rounded-xl border px-4 py-2 text-sm no-underline hover:bg-slate-50">View Results</Link>
          <Link href={`/admin/projects/${projectId}/audit`} className="rounded-xl border px-4 py-2 text-sm no-underline hover:bg-slate-50">Audit Trail</Link>
        </div>
      </div>

      {/* Segments */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Segments & Options</h2>
            <p className="text-sm text-slate-500">Each segment needs exactly 3 options.</p>
          </div>
          {!addingSegment && (
            <button
              onClick={() => setAddingSegment(true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
            >
              + Add Segment
            </button>
          )}
        </div>

        {/* Add segment form */}
        {addingSegment && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Segment title (e.g. Canopy Design)"
              value={newSegmentTitle}
              onChange={e => setNewSegmentTitle(e.target.value)}
            />
            <div className="grid gap-2 md:grid-cols-3">
              {segmentOptions.map((opt, i) => (
                <input
                  key={i}
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => {
                    const next = [...segmentOptions];
                    next[i] = e.target.value;
                    setSegmentOptions(next);
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddSegment} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Save Segment</button>
              <button onClick={() => { setAddingSegment(false); setNewSegmentTitle(""); setSegmentOptions(["","",""]); }} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Segment list */}
        {segments.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No segments yet. Add one above.</p>
        ) : (
          <div className="space-y-4">
            {segments.map(seg => (
              <div key={seg.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-semibold">{seg.title}</h3>
                  <button
                    onClick={() => handleDeleteSegment(seg.id)}
                    className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {(seg.segment_options || [])
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(opt => (
                      <div key={opt.id} className="rounded-lg border bg-slate-50 p-2 flex items-center gap-2">
                        {editingOption?.id === opt.id ? (
                          <>
                            <input
                              className="flex-1 rounded-lg border px-2 py-1 text-sm"
                              value={editingOption.label}
                              onChange={e => setEditingOption({ ...editingOption, label: e.target.value })}
                            />
                            <button onClick={handleSaveOption} className="text-xs bg-slate-900 text-white rounded-lg px-2 py-1">Save</button>
                            <button onClick={() => setEditingOption(null)} className="text-xs border rounded-lg px-2 py-1">×</button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{opt.label}</span>
                            <button
                              onClick={() => setEditingOption({ id: opt.id, label: opt.label })}
                              className="text-xs text-slate-400 hover:text-slate-700"
                            >
                              ✎
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Partner assignment */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Assigned Partners</h2>
            <p className="text-sm text-slate-500">{participants.length} partner{participants.length !== 1 ? "s" : ""} assigned</p>
          </div>
          {!addingPartner && (
            <button
              onClick={() => setAddingPartner(true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
            >
              + Add Partner
            </button>
          )}
        </div>

        {partnerMsg && (
          <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{partnerMsg}</div>
        )}

        {/* Add partner form */}
        {addingPartner && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Create new partner account & assign to this project</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Full name"
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
              />
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Email address"
                type="email"
                value={partnerEmail}
                onChange={e => setPartnerEmail(e.target.value)}
              />
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Password (min 6 chars)"
                type="text"
                value={partnerPassword}
                onChange={e => setPartnerPassword(e.target.value)}
              />
            </div>
            {partnerErr && <p className="text-sm text-red-600">{partnerErr}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddPartner}
                disabled={partnerLoading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {partnerLoading ? "Creating..." : "Create & Assign"}
              </button>
              <button
                onClick={() => { setAddingPartner(false); setPartnerName(""); setPartnerEmail(""); setPartnerPassword(""); setPartnerErr(null); }}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Participants list */}
        {participants.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No partners assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {participants.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{p.profiles?.full_name}</p>
                  <p className="text-xs text-slate-500">{p.profiles?.email}</p>
                </div>
                <button
                  onClick={() => handleRemovePartner(p.id, p.profiles?.full_name)}
                  className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}