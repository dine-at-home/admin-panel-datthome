"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authService } from "@/lib/auth";
import { getApiUrl } from "@/lib/api-config";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Mail,
} from "lucide-react";
import Link from "next/link";

interface Booking {
  id: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  guests: number;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  dietaryRequirements?: string;
}

interface DinnerDetail {
  id: string;
  title: string;
  description: string;
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
  location: {
    address: string;
    city: string;
    country: string;
  };
  bookings: Booking[];
  adminRevenue?: number; // Assuming backend calculates this eventually
}

export default function DinnerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [dinner, setDinner] = useState<DinnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchDinnerDetails();
  }, [params.id]);

  const fetchDinnerDetails = async () => {
    try {
      setLoading(true);
      const headers = authService.getAuthHeaders();
      const response = await fetch(getApiUrl(`/admin/dinners/${params.id}`), {
        headers,
      });
      const data = await response.json();

      if (response.status === 401) {
        authService.removeToken();
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch dinner details");
      }

      setDinner(data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load dinner details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !dinner) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error || "Dinner not found"}
        </div>
        <Link
          href="/dashboard/dinners"
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dinners
        </Link>
      </div>
    );
  }

  const totalRevenue = dinner.bookings
    .filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/dinners"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dinners
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {dinner.title}
            </h1>
            <div className="flex items-center text-gray-500 space-x-4">
              <span className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {new Date(dinner.date).toLocaleString()}
              </span>
              <span className="flex items-center">
                <MapPin className="mr-1 h-4 w-4" />
                {/* Fallback if location object is missing/incomplete in some legacy data */}
                {dinner.location
                  ? `${dinner.location.city}, ${dinner.location.country}`
                  : "Location N/A"}
              </span>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              dinner.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {dinner.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Capacity
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {dinner.capacity - dinner.available} / {dinner.capacity}{" "}
                  Booked
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Revenue
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {totalRevenue} {dinner.currency}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Mail className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Host
                </dt>
                <dd className="text-lg font-medium text-gray-900 truncate">
                  {dinner.host.name || dinner.host.email}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Guest List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Guest List
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {dinner.bookings.length > 0 ? (
            dinner.bookings.map((booking) => (
              <li key={booking.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.user.name || booking.user.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {booking.user.email}
                    </p>
                    {booking.dietaryRequirements && (
                      <p className="text-xs text-orange-600 mt-1">
                        Dietary: {booking.dietaryRequirements}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900 font-medium">
                      {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex justify-end gap-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          booking.status === "CONFIRMED"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "CANCELLED"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {booking.status}
                      </span>
                      {booking.paymentStatus && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                            ${
                              booking.paymentStatus === "SUCCEEDED"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : booking.paymentStatus === "REFUNDED"
                                  ? "bg-gray-50 text-gray-700 border-gray-200"
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            }
                         `}
                        >
                          {booking.paymentStatus === "SUCCEEDED"
                            ? "Paid"
                            : booking.paymentStatus === "REFUNDED"
                              ? "Refunded"
                              : "Unpaid"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-12 text-center text-gray-500">
              No bookings yet.
            </li>
          )}
        </ul>
      </div>

      {/* Description */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Dinner Description
          </h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <p className="text-gray-700 whitespace-pre-wrap">
            {dinner.description}
          </p>
        </div>
      </div>
    </div>
  );
}
