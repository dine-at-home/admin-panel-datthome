"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import { getApiUrl } from "@/lib/api-config";
import { Trash2, Search, X, AlertTriangle } from "lucide-react";

interface Dinner {
  id: string;
  title: string;
  host: {
    id: string;
    email: string;
    name: string | null;
  };
  price: number;
  currency: string;
  date: string;
  capacity: number;
  available: number;
  isActive: boolean;
  bookingCount: number;
  reviewCount: number;
  createdAt: string;
}

const REMOVAL_REASONS = [
  "Policy Violation",
  "Inappropriate Content",
  "Fake Listing",
  "Spam",
  "Safety Concerns",
  "Duplicate Listing",
  "Other",
];

export default function DinnersPage() {
  const router = useRouter();
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    dinner: Dinner | null;
    reason: string;
  }>({
    dinner: null,
    reason: "",
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchDinners();
  }, [router, page, search, statusFilter]);

  const fetchDinners = async () => {
    try {
      setLoading(true);
      setError("");
      const headers = authService.getAuthHeaders();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(getApiUrl(`/admin/dinners?${params}`), {
        headers,
      });
      const data = await response.json();

      if (response.status === 401) {
        authService.removeToken();
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch dinners");
      }

      setDinners(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to load dinners");
      console.error("Error fetching dinners:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.dinner || !deleteDialog.reason) {
      alert("Please select a reason for removal");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete this dinner? Reason: ${deleteDialog.reason}`,
      )
    ) {
      return;
    }

    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch(
        getApiUrl(`/admin/dinners/${deleteDialog.dinner.id}`),
        {
          method: "DELETE",
          headers,
          body: JSON.stringify({ reason: deleteDialog.reason }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete dinner");
      }

      setDeleteDialog({ dinner: null, reason: "" });
      fetchDinners();
    } catch (err: any) {
      alert(err.message || "Failed to delete dinner");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dinner Management</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search dinners..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {dinners.map((dinner) => (
                <li key={dinner.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          <a
                            href={`/dashboard/dinners/${dinner.id}`}
                            className="hover:text-primary-600 hover:underline"
                          >
                            {dinner.title}
                          </a>
                        </p>
                        <span
                          className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            dinner.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {dinner.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Host: {dinner.host.name || dinner.host.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {dinner.price} {dinner.currency} •{" "}
                        {dinner.capacity - dinner.available}/{dinner.capacity}{" "}
                        booked • {dinner.bookingCount} bookings •{" "}
                        {dinner.reviewCount} reviews •{" "}
                        {new Date(dinner.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setDeleteDialog({ dinner, reason: "" })}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {dinners.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No dinners found</p>
            </div>
          )}
        </>
      )}

      {/* Delete Dialog */}
      {deleteDialog.dinner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Remove Dinner
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              You are about to remove:{" "}
              <strong>{deleteDialog.dinner.title}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for removal:
              </label>
              <select
                value={deleteDialog.reason}
                onChange={(e) =>
                  setDeleteDialog({ ...deleteDialog, reason: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a reason...</option>
                {REMOVAL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteDialog({ dinner: null, reason: "" })}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!deleteDialog.reason}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
