import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { ImageType, UploadedAsset } from "@/types/creative";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const IMAGE_TYPES: ImageType[] = [
  "商品图",
  "包装图",
  "详情页截图",
  "旧广告封面",
  "旧短视频截图",
  "竞品素材图",
  "直播间截图",
];

const MAX_FILES = 5;
const MAX_BYTES = 4 * 1024 * 1024;

export function ImageUploader({
  assets,
  onChange,
}: {
  assets: UploadedAsset[];
  onChange: (next: UploadedAsset[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      setError(null);
      const arr = Array.from(files);
      const room = MAX_FILES - assets.length;
      if (room <= 0) {
        setError(`最多上传 ${MAX_FILES} 张图片`);
        return;
      }
      const next: UploadedAsset[] = [];
      for (const f of arr.slice(0, room)) {
        if (f.size > MAX_BYTES) {
          setError(`「${f.name}」超过 4MB，已跳过`);
          continue;
        }
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(f);
        });
        next.push({
          id: crypto.randomUUID(),
          type: "商品图",
          filename: f.name,
          mimeType: f.type,
          base64,
          previewUrl: base64,
        });
      }
      onChange([...assets, ...next]);
    },
    [assets, onChange],
  );

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="glass cursor-pointer rounded-xl border-dashed border-2 p-6 text-center transition-colors hover:border-primary"
      >
        <Upload className="mx-auto h-6 w-6 text-primary" />
        <p className="mt-2 text-sm">点击或拖入上传图片素材（≤ {MAX_FILES} 张，单张 ≤ 4MB）</p>
        <p className="mt-1 text-xs text-muted-foreground">商品图 / 详情页 / 旧素材 / 竞品素材 等</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {assets.map((a) => (
            <div key={a.id} className="glass relative overflow-hidden rounded-lg p-2">
              <button
                onClick={() => onChange(assets.filter((x) => x.id !== a.id))}
                className="absolute right-2 top-2 z-10 rounded-full bg-background/80 p-1 hover:bg-destructive hover:text-destructive-foreground"
                aria-label="删除"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted">
                {a.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.previewUrl} alt={a.filename} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground" title={a.filename}>
                {a.filename}
              </p>
              <select
                value={a.type}
                onChange={(e) =>
                  onChange(
                    assets.map((x) =>
                      x.id === a.id ? { ...x, type: e.target.value as ImageType } : x,
                    ),
                  )
                }
                className="mt-1 w-full rounded-md bg-input px-2 py-1 text-xs"
              >
                {IMAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
