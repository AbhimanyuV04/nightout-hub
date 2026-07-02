"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveMediaRecord } from "@/app/actions";
import { compressImage } from "@/lib/imageProcessor";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const BUCKET = "nightout-media";

type Upload = { id: string; name: string; progress: number; error?: string };

export default function MediaUpload({ roomCode }: { roomCode: string }) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const router = useRouter();

  function update(id: string, patch: Partial<Upload>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const supabase = getSupabaseBrowser();

    await Promise.all(
      files.map(async (file) => {
        const id = crypto.randomUUID();
        setUploads((prev) => [...prev, { id, name: file.name, progress: 0 }]);
        try {
          const compressed = await compressImage(file);
          update(id, { progress: 40 });

          const path = `${roomCode}/${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, compressed, { contentType: "image/jpeg" });
          if (error) throw error;
          update(id, { progress: 80 });

          const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
          const result = await saveMediaRecord(roomCode, data.publicUrl);
          if (result?.error) throw new Error(result.error);
          update(id, { progress: 100 });
        } catch (err) {
          update(id, { error: err instanceof Error ? err.message : "Upload failed" });
        }
      })
    );
    router.refresh();
    setUploads((prev) => prev.filter((u) => u.error));
  }

  return (
    <div className="space-y-2 border p-4">
      <h2 className="font-semibold">Add photos</h2>
      <input type="file" accept="image/*" multiple onChange={handleFiles} className="block w-full" />
      <ul className="space-y-1">
        {uploads.map((u) => (
          <li key={u.id} className="text-sm">
            {u.name} — {u.error ? `error: ${u.error}` : `${u.progress}%`}
          </li>
        ))}
      </ul>
    </div>
  );
}
