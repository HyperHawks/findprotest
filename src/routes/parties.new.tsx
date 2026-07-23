import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parties/new")({
  head: () => ({
    meta: [
      { title: "Create Party — FINDPROTEST" },
      { name: "description", content: "Create a new political party on FINDPROTEST." },
    ],
  }),
  component: NewParty,
});

function NewParty() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLeader, isLoading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [ideology, setIdeology] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [website, setWebsite] = useState("");
  const [foundingDate, setFoundingDate] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isLeader)) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, user, isLeader, navigate]);

  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ HTMLAttributes: { class: "max-w-full" } }), TiptapLink],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none",
      },
    },
    immediatelyRender: false,
  });

  async function submit() {
    setErr(null);
    if (!user || !editor) return;
    if (name.trim().length < 2) { setErr("Name must be at least 2 characters"); return; }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const description_html = editor.getHTML();

    setSaving(true);
    const { error } = await supabase.from("political_parties").insert({
      leader_id: user.uid,
      name: name.trim(),
      slug,
      description_html,
      ideology: ideology.trim() || null,
      country_code: countryCode.trim().toUpperCase() || null,
      website: website.trim() || null,
      founding_date: foundingDate || null,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }

    // Also join as admin
    const { data: party } = await supabase.from("political_parties").select("id").eq("slug", slug).single();
    if (party) {
      await supabase.from("party_members").insert({ party_id: party.id, user_id: user.uid, role: "admin" });
    }

    await queryClient.invalidateQueries({ queryKey: ["parties"] });
    navigate({ to: "/parties" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-3xl mx-auto p-6 lg:p-10">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-6">Create Party</h1>

        <div className="space-y-4">
          <label className="block">
            <span className="text-[11px] font-mono font-extrabold uppercase mb-2 block">Party Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full border-2 border-border bg-background px-3 py-2 font-bold"
              placeholder="e.g. Progressive Alliance"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-mono font-extrabold uppercase mb-2 block">Ideology</span>
            <input
              value={ideology}
              onChange={(e) => setIdeology(e.target.value)}
              maxLength={100}
              className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm"
              placeholder="e.g. Social Democracy, Conservatism"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-mono font-extrabold uppercase mb-2 block">Country (ISO-2)</span>
              <input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                maxLength={2}
                className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm uppercase"
                placeholder="e.g. US"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-mono font-extrabold uppercase mb-2 block">Founding Date</span>
              <input
                type="date"
                value={foundingDate}
                onChange={(e) => setFoundingDate(e.target.value)}
                className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-mono font-extrabold uppercase mb-2 block">Website</span>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm"
              placeholder="https://..."
            />
          </label>

          <div>
            <span className="text-[11px] font-mono font-extrabold uppercase mb-2 block">Description</span>
            <div className="border-2 border-border bg-card">
              <div className="border-b-2 border-border p-2 flex flex-wrap gap-1">
                {[
                  { l: "B", cmd: () => editor?.chain().focus().toggleBold().run() },
                  { l: "I", cmd: () => editor?.chain().focus().toggleItalic().run() },
                  { l: "H2", cmd: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
                  { l: "•", cmd: () => editor?.chain().focus().toggleBulletList().run() },
                ].map((b) => (
                  <button
                    key={b.l}
                    type="button"
                    onClick={b.cmd}
                    className="px-3 py-1 border-2 border-border bg-background font-mono text-xs font-extrabold"
                  >
                    {b.l}
                  </button>
                ))}
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>

          {err && <div className="border-2 border-border bg-danger p-3 text-sm font-mono">{err}</div>}

          <button
            onClick={submit}
            disabled={saving}
            className="px-6 py-3 border-2 border-border bg-foreground text-background font-mono text-xs font-extrabold uppercase brutal-shadow disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Party"}
          </button>
        </div>
      </main>
    </div>
  );
}
