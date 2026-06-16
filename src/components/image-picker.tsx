import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, ImagePlus, Link2, Loader2, ImageIcon, X } from "lucide-react";
import { compressAndUpload } from "@/lib/image-upload";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Three ways to set an image (all optional):
 *   1. Take a photo (camera)
 *   2. Upload from gallery
 *   3. Paste an image URL
 *
 * Photo/gallery images are auto-compressed to WebP (full ≤ ~0.3 MB @ 1200px +
 * a ~200px thumbnail) before upload — important since free storage is only 1 GB.
 * A pasted URL is stored as-is. `onChange` reports (fullUrl, thumbUrl); for a URL
 * both are the same value.
 */
export function ImagePicker({
  value,
  onChange,
  shape = "square",
}: {
  value: string | null;
  onChange: (full: string | null, thumb: string | null) => void;
  shape?: "square" | "circle";
}) {
  const { user } = useAuth();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    try {
      const { fullUrl, thumbUrl } = await compressAndUpload(file, user.id);
      onChange(fullUrl, thumbUrl);
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const applyUrl = () => {
    const v = url.trim();
    if (!v) return;
    onChange(v, v);
    setUrl("");
    setUrlOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative h-20 w-20 shrink-0 border bg-muted overflow-hidden grid place-items-center",
            shape === "circle" ? "rounded-full" : "rounded-2xl"
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          )}
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/90 grid place-items-center"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4 mr-1" /> Camera
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => galleryRef.current?.click()}>
            <ImagePlus className="h-4 w-4 mr-1" /> Gallery
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => setUrlOpen((v) => !v)}>
            <Link2 className="h-4 w-4 mr-1" /> URL
          </Button>
        </div>
      </div>

      {urlOpen && (
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/image.jpg"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => e.key === "Enter" && applyUrl()}
          />
          <Button type="button" size="sm" onClick={applyUrl}>Use</Button>
        </div>
      )}

      {/* Camera capture vs gallery: same accept, camera adds `capture`. */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  );
}
