"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import { getApiUrl } from "@/lib/api-config";
import ImageUploader from "@/components/ImageUploader";
import { Save, X, Plus, Trash2, ArrowRight } from "lucide-react";

interface Ad {
  id?: string;
  position: "primary" | "secondary";
  title: string;
  description: string;
  buttonText: string;
  link: string;
  imageSrc: string;
  isActive: boolean;
}

const DEFAULT_ADS: Ad[] = [
  {
    position: "primary",
    title: "Elevate Your Culinary Skills",
    description:
      "Join exclusive online masterclasses with world-renowned chefs. Master the art of pasta, pastry, and more from the comfort of your home.",
    buttonText: "View Masterclasses",
    link: "/",
    imageSrc: "/ads/cooking_class.png",
    isActive: true,
  },
  {
    position: "secondary",
    title: "Premium Kitchenware for Master Chefs",
    description:
      "Upgrade your kitchen with our curated collection of professional ceramic cookware and artisanal tools. Built to last a lifetime.",
    buttonText: "Shop Collection",
    link: "/",
    imageSrc: "/ads/premium_cookware.png",
    isActive: true,
  },
];

export default function AdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>(DEFAULT_ADS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchAds();
  }, [router]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      setError("");
      const headers = authService.getAuthHeaders();
      const response = await fetch(getApiUrl("/admin/ads"), { headers });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch ads");
      }

      // Merge with defaults if not all ads exist
      const fetchedAds = data.data || [];
      const mergedAds = DEFAULT_ADS.map((defaultAd) => {
        const fetched = fetchedAds.find(
          (a: Ad) => a.position === defaultAd.position,
        );
        return fetched || defaultAd;
      });

      setAds(mergedAds);
    } catch (err: any) {
      setError(err.message || "Failed to load ads");
      console.error("Error fetching ads:", err);
      // Keep default ads even if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (ad: Ad) => {
    try {
      setSaving(ad.position);
      setError("");
      const headers = authService.getAuthHeaders();
      // Use POST for creating new ads, PUT for updating
      const method = ad.id ? "PUT" : "POST";
      const response = await fetch(getApiUrl("/admin/ads"), {
        method,
        headers,
        body: JSON.stringify(ad),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save ad");
      }

      setAds((prev) =>
        prev.map((a) =>
          a.position === ad.position
            ? { ...data.data, position: ad.position }
            : a,
        ),
      );
      setEditingAd(null);
    } catch (err: any) {
      setError(err.message || "Failed to save ad");
      console.error("Error saving ad:", err);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) {
      return;
    }

    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch(getApiUrl(`/admin/ads/${adId}`), {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete ad");
      }

      // Reset to default after deletion
      const defaultAd = DEFAULT_ADS.find(
        (a) =>
          a.id === adId ||
          !ads.find((db) => db.position === a.position && db.id),
      );
      if (defaultAd) {
        setAds((prev) =>
          prev.map((a) => (a.position === defaultAd.position ? defaultAd : a)),
        );
      } else {
        fetchAds();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete ad");
      console.error("Error deleting ad:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Ad Management</h1>
      </div>

      <p className="mb-6 text-sm text-gray-600">
        Manage the advertising banners displayed on the home page. These ads
        appear in two positions: Primary (first) and Secondary (second).
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {ads.map((ad) => {
          const isEditing = editingAd?.position === ad.position;
          const isSaving = saving === ad.position;

          return (
            <div key={ad.position} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {ad.position === "primary" ? "Primary Ad" : "Secondary Ad"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    This ad appears{" "}
                    {ad.position === "primary" ? "first" : "second"} on the home
                    page
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {ad.id && (
                    <button
                      onClick={() => handleDelete(ad.id!)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setEditingAd(isEditing ? null : ad)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {isEditing ? (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </>
                    ) : (
                      "Edit"
                    )}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <AdForm
                  ad={ad}
                  onSave={handleSave}
                  onCancel={() => setEditingAd(null)}
                  isSaving={isSaving}
                  existingAds={ads}
                />
              ) : (
                <AdPreview ad={ad} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdForm({
  ad,
  onSave,
  onCancel,
  isSaving,
  existingAds,
}: {
  ad: Ad;
  onSave: (ad: Ad) => void;
  onCancel: () => void;
  isSaving: boolean;
  existingAds: Ad[];
}) {
  const [formData, setFormData] = useState<Ad>(ad);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure position is included
    onSave({ ...formData, position: ad.position });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Button Text
          </label>
          <input
            type="text"
            value={formData.buttonText}
            onChange={(e) =>
              setFormData({ ...formData, buttonText: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link URL
          </label>
          <input
            type="text"
            value={formData.link}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ad Image
        </label>
        <ImageUploader
          currentImage={formData.imageSrc}
          onImageSelect={(url) => setFormData({ ...formData, imageSrc: url })}
          existingAds={existingAds}
        />
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`active-${ad.position}`}
          checked={formData.isActive}
          onChange={(e) =>
            setFormData({ ...formData, isActive: e.target.checked })
          }
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label
          htmlFor={`active-${ad.position}`}
          className="ml-2 block text-sm text-gray-900"
        >
          Active (show on home page)
        </label>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function AdPreview({ ad }: { ad: Ad }) {
  const isSecondary = ad.position === "secondary";

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] shadow-2xl ${
        isSecondary ? "bg-zinc-900 text-white" : "bg-primary-600 text-white"
      }`}
    >
      <div className="flex flex-col lg:flex-row items-stretch min-h-[300px] sm:min-h-[360px]">
        {/* Content Side */}
        <div className="flex-1 p-8 sm:p-10 lg:p-16 flex flex-col justify-center gap-6 z-10 transition-transform group">
          <div className="space-y-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase border ${
                isSecondary
                  ? "bg-white/5 text-white/60 border-white/10"
                  : "bg-black/5 text-white/80 border-black/10"
              }`}
            >
              Sponsored Partnership
            </span>
            <h2 className="text-3xl font-bold leading-tight tracking-tight">
              {ad.title}
            </h2>
            <p
              className={`text-base font-light leading-relaxed max-w-xl ${
                isSecondary ? "text-zinc-400" : "text-primary-100"
              }`}
            >
              {ad.description}
            </p>
          </div>

          <div>
            <button
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 ${
                isSecondary
                  ? "bg-white text-zinc-950 hover:bg-zinc-100"
                  : "bg-zinc-950 text-white hover:bg-black shadow-xl shadow-black/20"
              }`}
            >
              {ad.buttonText}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Image Side */}
        <div className="relative flex-1 min-h-[300px] lg:min-h-auto overflow-hidden">
          <div
            className={`absolute inset-0 z-10 lg:block hidden bg-gradient-to-r ${
              isSecondary ? "from-zinc-900" : "from-primary-600"
            } via-transparent to-transparent`}
          />
          {ad.imageSrc && (
            <img
              src={ad.imageSrc}
              alt={ad.title}
              className="absolute inset-0 object-cover w-full h-full object-center transition-transform hover:scale-110 duration-[3000ms]"
            />
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-black/5 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}
