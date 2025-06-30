import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ConnectShopifyStore = () => {
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/shopify/auth-url", {
        params: { shop },
      });

      if (response.data.success) {
        window.location.href = response.data.authUrl;
      } else {
        setError("Failed to generate auth URL");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Connect Your Shopify Store</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="shop"
            className="block text-sm font-medium text-gray-700"
          >
            Your Shopify Store URL
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              id="shop"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="your-store.myshopify.com"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect Store"}
        </button>
      </form>
    </div>
  );
};

export default ConnectShopifyStore;
