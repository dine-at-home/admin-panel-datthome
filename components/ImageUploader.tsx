import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Image as ImageIcon,
  Check,
  Loader2,
  X,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { getApiUrl } from "@/lib/api-config";
import { authService } from "@/lib/auth";

interface ImageUploaderProps {
  currentImage?: string;
  onImageSelect: (imageUrl: string) => void;
  existingAds?: any[]; // Deprecated, but kept for compatibility
}

interface S3Image {
  url: string;
  key: string;
  size: number;
  lastModified: string;
}

export default function ImageUploader({
  currentImage,
  onImageSelect,
}: ImageUploaderProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "library">("upload");
  const [uploading, setUploading] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [libraryImages, setLibraryImages] = useState<S3Image[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryLoadedRaw = useRef(false);

  const fetchLibraryImages = useCallback(async (cursor?: string | null) => {
    try {
      setLoadingLibrary(true);
      setError("");

      const headers = authService.getAuthHeaders();
      let url = getApiUrl("/upload/images?limit=20&folder=ads");
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load images");
      }

      if (cursor) {
        setLibraryImages((prev) => [...prev, ...data.data.images]);
      } else {
        setLibraryImages(data.data.images);
      }

      setNextCursor(data.data.nextCursor || null);
      setHasMore(data.data.hasMore);
      libraryLoadedRaw.current = true;
    } catch (err: any) {
      console.error("Library fetch error:", err);
      setError("Failed to load image library");
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  // Fetch library when tab changes to library and not loaded yet
  useEffect(() => {
    if (activeTab === "library" && !libraryLoadedRaw.current) {
      fetchLibraryImages();
    }
  }, [activeTab, fetchLibraryImages]);

  const handleDeleteImage = async (e: React.MouseEvent, key: string) => {
    e.stopPropagation(); // Prevent selection when deleting

    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      setDeletingImage(key);
      const filename = key.split("/").pop(); // Extract filename from key (ads/filename.webp)

      if (!filename) throw new Error("Invalid filename");

      const headers = authService.getAuthHeaders();
      const response = await fetch(
        getApiUrl(`/upload/image/${filename}?folder=ads`),
        {
          method: "DELETE",
          headers,
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete image");
      }

      // Remove from list
      setLibraryImages((prev) => prev.filter((img) => img.key !== key));

      // If the deleted image was selected, deselect it
      const currentUrl = libraryImages.find((img) => img.key === key)?.url;
      if (currentUrl && currentImage === currentUrl) {
        onImageSelect("");
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete image");
    } finally {
      setDeletingImage(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit (matching backend)
      setError("Image must be less than 10MB");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("image", file);
      // Admin ads upload as 'ads' type to isolate them from user dinners
      formData.append("type", "ads");

      const headers = authService.getAuthHeaders();
      // Remove Content-Type to let browser set boundary
      const { "Content-Type": _, ...authHeaders } = headers as any;

      const response = await fetch(getApiUrl("/upload/image"), {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      onImageSelect(data.data.url);

      // Add uploaded image to library immediately
      const newImage: S3Image = {
        url: data.data.url,
        key: data.data.filename, // Note: response returns just filename or full key depending on backend. Let's check backend.
        // Controller returns: filename: fileName (which is folder + name e.g. "ads/abc.webp")
        size: data.data.size,
        lastModified: new Date().toISOString(),
      };
      setLibraryImages((prev) => [newImage, ...prev]);

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "upload"
              ? "bg-gray-50 text-primary-600 border-b-2 border-primary-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Upload New
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "library"
              ? "bg-gray-50 text-primary-600 border-b-2 border-primary-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Select Existing
        </button>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded flex items-center justify-between">
            <span className="flex items-center">
              <X className="w-3 h-3 mr-1" /> {error}
            </span>
            {activeTab === "library" && (
              <button
                onClick={() => fetchLibraryImages()}
                className="text-red-700 hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {activeTab === "upload" ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-2">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-900">
                {uploading ? "Uploading..." : "Click to upload image"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                SVG, PNG, JPG or GIF (max. 10MB)
              </p>
            </div>

            {currentImage && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Selected Image:
                </p>
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100">
                  <img
                    src={currentImage}
                    alt="Selected"
                    className="object-contain w-full h-full"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageSelect("");
                    }}
                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200">
              {libraryImages.map((img, idx) => (
                <div
                  key={`${img.key}-${idx}`}
                  className={`relative aspect-video rounded overflow-hidden border group transition-all ${
                    currentImage === img.url
                      ? "ring-2 ring-primary-500 border-primary-500"
                      : "hover:border-primary-400 border-gray-200"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Library ${idx}`}
                    className="w-full h-full object-cover cursor-pointer"
                    loading="lazy"
                    onClick={() => onImageSelect(img.url)}
                  />
                  {currentImage === img.url && (
                    <div className="absolute inset-0 bg-primary-900/20 flex items-center justify-center pointer-events-none">
                      <div className="bg-primary-600 text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {/* Delete Button - Top Right */}
                  <button
                    onClick={(e) => handleDeleteImage(e, img.key)}
                    disabled={deletingImage === img.key}
                    className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-red-500 hover:text-white text-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 disabled:opacity-50"
                    title="Delete image"
                  >
                    {deletingImage === img.key ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {new Date(img.lastModified).toLocaleDateString()}
                  </div>
                </div>
              ))}

              {loadingLibrary && (
                <div className="col-span-full flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              )}

              {!loadingLibrary && libraryImages.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                  No images found in library
                </div>
              )}
            </div>

            {hasMore && !loadingLibrary && (
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => fetchLibraryImages(nextCursor)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  Load More...
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
