"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import { getApiUrl } from "@/lib/api-config";
import { Save, X, Plus, Trash2 } from "lucide-react";

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
}: {
  ad: Ad;
  onSave: (ad: Ad) => void;
  onCancel: () => void;
  isSaving: boolean;
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
          Image URL
        </label>
        <input
          type="text"
          value={formData.imageSrc}
          onChange={(e) =>
            setFormData({ ...formData, imageSrc: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          required
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
  return (
    <div
      className={`p-6 rounded-lg ${ad.position === "primary" ? "bg-primary-600" : "bg-zinc-900"}`}
    >
      <div className="text-white">
        <div className="mb-2">
          <span className="inline-block px-2 py-1 text-xs font-bold uppercase bg-white/10 rounded-full">
            Sponsored Partnership
          </span>
        </div>
        <h4 className="text-2xl font-bold mb-2">{ad.title}</h4>
        <p className="text-white/80 mb-4">{ad.description}</p>
        <button
          className={`px-6 py-3 rounded-lg font-bold ${
            ad.position === "primary"
              ? "bg-zinc-950 text-white"
              : "bg-white text-zinc-950"
          }`}
        >
          {ad.buttonText}
        </button>
      </div>
    </div>
  );
}
