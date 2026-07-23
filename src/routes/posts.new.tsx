import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/posts/new")({
  head: () => ({
    meta: [{ title: "New Post — Vanguard" }, { name: "description", content: "Share an update with the community." }],
  }),
  component: NewPost,
});

const schema = z.object({
  title: z.string().trim().min(3).max(140),
  body_html: z.string().min(1).max(50000),
});

function NewPost() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else setUser(data.session.user);
    });
  }, [navigate]);

  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ HTMLAttributes: { class: "max-w-full" } }), Link],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none",
      },
    },
    immediatelyRender: false,
  });

  async function uploadImage(file: File) {
    if (!user) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file);
    if (error) { setErr(error.message); return; }
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    editor?.chain().focus().setImage({ src: data.publicUrl }).run();
  }

  async function submit() {
    setErr(null);
    if (!user || !editor) return;
    const body_html = editor.getHTML();
    const parsed = schema.safeParse({ title, body_html });
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { data, error } = await supabase.from("posts").insert({
      author_id: user.id,
      title: parsed.data.title,
      body_html: parsed.data.body_html,
    }).select("id").single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    navigate({ to: "/feed" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-3xl mx-auto p-6 lg:p-10">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-6">New Post</h1>
        <label className="block mb-4">
          <span className="text-[11px] font-mono font-extrabold uppercase mb-2 block">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            className="w-full border-2 border-border bg-background px-3 py-2 font-bold"
          />
        </label>

        <div className="border-2 border-border bg-card mb-4">
          <div className="border-b-2 border-border p-2 flex flex-wrap gap-1">
            {[
              { l: "B", cmd: () => editor?.chain().focus().toggleBold().run() },
              { l: "I", cmd: () => editor?.chain().focus().toggleItalic().run() },
              { l: "H2", cmd: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
              { l: "•", cmd: () => editor?.chain().focus().toggleBulletList().run() },
              { l: "1.", cmd: () => editor?.chain().focus().toggleOrderedList().run() },
              { l: "”", cmd: () => editor?.chain().focus().toggleBlockquote().run() },
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
            <label className="px-3 py-1 border-2 border-border bg-tertiary font-mono text-xs font-extrabold cursor-pointer">
              + Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              />
            </label>
          </div>
          <EditorContent editor={editor} />
        </div>

        {err && <div className="mb-4 border-2 border-border bg-danger p-3 text-sm font-mono">{err}</div>}

        <button
          onClick={submit}
          disabled={saving}
          className="px-6 py-3 border-2 border-border bg-foreground text-background font-mono text-xs font-extrabold uppercase brutal-shadow disabled:opacity-50"
        >
          {saving ? "Publishing…" : "Publish"}
        </button>
      </main>
    </div>
  );
}
