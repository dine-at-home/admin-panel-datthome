"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authService } from "@/lib/auth";
import { getApiUrl } from "@/lib/api-config";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  Ban,
  User,
  CreditCard,
  Star,
  DollarSign,
} from "lucide-react";

interface UserDetails {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    phone: string | null;
    gender: string | null;
    country: string | null;
    languages: string | null;
    role: string;
    emailVerified: boolean;
    blocked: boolean;
    createdAt: string;
    updatedAt: string;
    accountHolderName: string | null;
    payoutAddress: string | null;
    payoutCardBrand: string | null;
    payoutCardLast4: string | null;
    hasCardRegistered: boolean;
  };
  statistics: {
    totalDinners: number;
    totalBookings: number;
    totalReviews: number;
    totalFavorites: number;
    totalPayouts: number;
    totalEarnings: number;
    averageRating: number;
    bookingStats: {
      asGuest: {
        total: number;
        pending: number;
        confirmed: number;
        cancelled: number;
        completed: number;
      };
      asHost: {
        total: number;
        pending: number;
        confirmed: number;
        cancelled: number;
        completed: number;
      };
    };
  };
  dinners: any[];
  bookingsAsGuest: any[];
  bookingsAsHost: any[];
  reviewsWritten: any[];
  reviewsReceived: any[];
  favorites: any[];
  payouts: any[];
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dinners");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchUserDetails();
  }, [userId, router]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const headers = authService.getAuthHeaders();
      const response = await fetch(
        getApiUrl(`/admin/users/${userId}/details`),
        { headers },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch user details");
      }

      setData(result.data);
    } catch (err: any) {
      setError(err.message || "Failed to load user details");
      console.error("Error fetching user details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.push("/dashboard/users")}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </button>
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  const { user, statistics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard/users")}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Users
        </button>
        <button
          onClick={() => router.push(`/dashboard/users/${userId}/activity`)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          View full activity timeline →
        </button>
      </div>

      {/* User Profile Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.name || "No name"}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === "admin"
                    ? "bg-purple-100 text-purple-800"
                    : user.role === "host"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {user.role}
              </span>
              {user.emailVerified && (
                <span title="Email Verified">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </span>
              )}
              {user.blocked && (
                <span title="Blocked">
                  <Ban className="h-5 w-5 text-red-500" />
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  {user.phone}
                </div>
              )}
              {user.country && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {user.country}
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          {user.gender && (
            <div>
              <span className="text-sm font-medium text-gray-500">Gender:</span>
              <span className="ml-2 text-sm text-gray-900">{user.gender}</span>
            </div>
          )}
          {user.languages && (
            <div>
              <span className="text-sm font-medium text-gray-500">
                Languages:
              </span>
              <span className="ml-2 text-sm text-gray-900">
                {user.languages}
              </span>
            </div>
          )}
        </div>

        {/* Payout details (if host) */}
        {user.role === "host" && (user.hasCardRegistered || user.accountHolderName) && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Payout Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {user.accountHolderName && (
                <div>
                  <span className="text-gray-500">Cardholder:</span>
                  <span className="ml-2 text-gray-900">
                    {user.accountHolderName}
                  </span>
                </div>
              )}
              {user.hasCardRegistered && (
                <div>
                  <span className="text-gray-500">Card:</span>
                  <span className="ml-2 text-gray-900">
                    {user.payoutCardBrand || 'Card'} ••••{' '}
                    {user.payoutCardLast4 || '????'}
                  </span>
                </div>
              )}
              {user.payoutAddress && (
                <div className="md:col-span-2">
                  <span className="text-gray-500">Address:</span>
                  <span className="ml-2 text-gray-900">{user.payoutAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Dinners</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statistics.totalDinners}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Total Bookings
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {statistics.totalBookings}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Rating</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statistics.averageRating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Total Earnings
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                kr {(statistics.totalEarnings / 100).toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav
            className="-mb-px flex space-x-8 px-6 overflow-x-auto"
            aria-label="Tabs"
          >
            {[
              { id: "dinners", label: `Dinners (${data.dinners.length})` },
              {
                id: "bookings-guest",
                label: `Bookings as Guest (${data.bookingsAsGuest.length})`,
              },
              {
                id: "bookings-host",
                label: `Bookings as Host (${data.bookingsAsHost.length})`,
              },
              {
                id: "reviews",
                label: `Reviews (${data.reviewsWritten.length + data.reviewsReceived.length})`,
              },
              {
                id: "favorites",
                label: `Favorites (${data.favorites.length})`,
              },
              { id: "payouts", label: `Payouts (${data.payouts.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Dinners Tab */}
          {activeTab === "dinners" && (
            <div>
              {data.dinners.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No dinners created
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bookings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.dinners.map((dinner) => (
                        <tr key={dinner.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {dinner.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(dinner.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dinner.currency} {dinner.price}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dinner.available}/{dinner.capacity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dinner._count.bookings}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                dinner.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {dinner.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bookings as Guest Tab */}
          {activeTab === "bookings-guest" && (
            <div>
              {data.bookingsAsGuest.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No bookings as guest
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dinner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Host
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Guests
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.bookingsAsGuest.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.dinner.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.dinner.host.name ||
                              booking.dinner.host.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(booking.dinner.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.guests}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            kr {booking.totalPrice}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                booking.status === "CONFIRMED"
                                  ? "bg-green-100 text-green-800"
                                  : booking.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : booking.status === "CANCELLED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bookings as Host Tab */}
          {activeTab === "bookings-host" && (
            <div>
              {data.bookingsAsHost.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No bookings as host
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Guest
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dinner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Guests
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.bookingsAsHost.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.user.name || booking.user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.dinner.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(booking.dinner.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.guests}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                booking.status === "CONFIRMED"
                                  ? "bg-green-100 text-green-800"
                                  : booking.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : booking.status === "CANCELLED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Reviews Written ({data.reviewsWritten.length})
                </h3>
                {data.reviewsWritten.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No reviews written
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.reviewsWritten.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">
                            {review.dinner.title}
                          </span>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="ml-1 text-sm font-medium">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-600">
                            {review.comment}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Reviews Received ({data.reviewsReceived.length})
                </h3>
                {data.reviewsReceived.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No reviews received
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.reviewsReceived.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">
                            From: {review.user.name || "Anonymous"}
                          </span>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="ml-1 text-sm font-medium">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {review.dinner.title}
                        </p>
                        {review.comment && (
                          <p className="text-sm text-gray-600">
                            {review.comment}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === "favorites" && (
            <div>
              {data.favorites.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No favorites</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.favorites.map((favorite) => (
                    <div
                      key={favorite.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      {favorite.dinner.thumbnail && (
                        <img
                          src={favorite.dinner.thumbnail}
                          alt={favorite.dinner.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900">
                          {favorite.dinner.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {favorite.dinner.currency} {favorite.dinner.price}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(favorite.dinner.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === "payouts" && (
            <div>
              {data.payouts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payouts</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Arrival Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.payouts.map((payout) => (
                        <tr key={payout.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {payout.currency.toUpperCase()}{" "}
                            {(payout.amount / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                payout.status === "PAID"
                                  ? "bg-green-100 text-green-800"
                                  : payout.status === "IN_TRANSIT"
                                    ? "bg-blue-100 text-blue-800"
                                    : payout.status === "FAILED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {payout.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payout.arrivalDate
                              ? new Date(
                                  payout.arrivalDate,
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
