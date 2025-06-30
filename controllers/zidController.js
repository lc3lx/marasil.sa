const schedule = require("node-schedule");

const ZidPlatform = require("../platforms/zidPlatform");
const Store = require("../models/Store");
const Order = require("../models/Order");
const crypto = require("crypto");

class ZidController {
  // Get OAuth URL for store authorization
  async getAuthUrl(req, res) {
    try {
      const state = crypto.randomBytes(16).toString("hex");
      // const redirectUri = `${process.env.APP_URL}/api/zid/auth/callback`;

      const authUrl = ZidPlatform.getAuthUrl(
        process.env.ZID_CLIENT_ID,
        process.env.ZID_REDIRECT_URI,
        state
        // redirectUri,
      );

      // Store state in session for verification
      req.session.zidState = state;

      res.json({ authUrl });
    } catch (error) {
      console.error("Error getting auth URL:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  }

  // Handle OAuth callback
  async handleCallback(req, res) {
    try {
      const { code, state } = req.query;
      console.log(code);
      if (!code) {
        console.log(" Code not found");
        return res.status(400).send("Code not found");
      }

      // Verify state to prevent CSRF
      // if (state !== req.session.zidState) {
      //   return res.status(400).json({ error: "Invalid state parameter" });
      // }
      console.log("Sending to Zid:", {
        code,
        clientId: process.env.ZID_CLIENT_ID,
        secret: process.env.ZID_CLIENT_SECRET,
        redirect: process.env.ZID_REDIRECT_URI,
      });
      // Get access token
      const tokenData = await ZidPlatform.getAccessToken(
        code,
        process.env.ZID_CLIENT_ID,
        process.env.ZID_CLIENT_SECRET,
        process.env.ZID_REDIRECT_URI

        // `${process.env.APP_URL}/api/zid/auth/callback`
      );

      // Get store information
      const storeInfo = await ZidPlatform.getStoreInfo(tokenData.access_token);

      // Store credentials
      const store = await Store.create({
        platform: "zid",
        name: storeInfo.name,
        storeId: storeInfo.id,
        storeName: storeInfo.domain,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        storeInfo: storeInfo,
        // customer: req.customer._id,

        isActive: true,
      });

      res.json({
        message: "Store connected successfully",
        storeId: store._id,
      });
    } catch (error) {
      console.error("ZID TOKEN ERROR - RAW:", {
        message: error.message,
        status: error.response?.status,
        headers: error.response?.headers,
        data: error.response?.data,
      });
      throw error;
    }
  }

  // Fetch orders from Zid
  async getOrders(req, res) {
    try {
      const { storeId } = req.params;
      const store = await Store.findOne(storeId);

      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      // Check if token needs refresh
      if (store.tokenExpiresAt < new Date()) {
        const tokenData = await ZidPlatform.refreshAccessToken(
          store.refreshToken,
          process.env.ZID_CLIENT_ID,
          process.env.ZID_CLIENT_SECRET
        );

        store.accessToken = tokenData.access_token;
        store.refreshToken = tokenData.refresh_token;
        store.tokenExpiresAt = new Date(
          Date.now() + tokenData.expires_in * 1000
        );
        await store.save();
      }

      const orders = await ZidPlatform.getOrders(store.accessToken, req.query);

      // Store orders in database
      for (const order of orders.data) {
        await Order.findOneAndUpdate(
          { id: order.id },
          {
            storeId,
            platform: "zid",
            id: order.id,
            status: {
              name: order.status,
              slug: order.status?.toLowerCase()?.replace(/\s+/g, "-"),
            },
            total: {
              amount: order.total,
              currency: order.currency,
            },
            items: order.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            customer: {
              id: order.customer.id,
              full_name: order.customer.name,
              first_name: order.customer.first_name,
              last_name: order.customer.last_name,
              mobile: order.customer.mobile,
              email: order.customer.email,
              city: order.customer.city,
              country: order.customer.country,
              currency: order.currency,
              location: order.shipping_address?.address1 || "",
            },
            payment_method: order.payment_method,
            payment_actions: {
              paid_amount: {
                amount: order.paid_amount,
                currency: order.currency,
              },
            },
            Customer: req.customer._id,
          },
          { upsert: true, new: true }
        );
      }

      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  }

  // Update order status
  async updateOrderStatus(req, res) {
    try {
      const { storeId, orderId } = req.params;
      const { status } = req.body;

      const store = await Store.findOne(storeId);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      // Check if token needs refresh
      if (store.tokenExpiresAt < new Date()) {
        const tokenData = await ZidPlatform.refreshAccessToken(
          store.refreshToken,
          process.env.ZID_CLIENT_ID,
          process.env.ZID_CLIENT_SECRET
        );

        store.accessToken = tokenData.access_token;
        store.refreshToken = tokenData.refresh_token;
        store.tokenExpiresAt = new Date(
          Date.now() + tokenData.expires_in * 1000
        );
        await store.save();
      }

      const updatedOrder = await ZidPlatform.updateOrderStatus(
        store.accessToken,
        orderId,
        status
      );

      // Update order in database
      await Order.findOneAndUpdate({ id: orderId }, { status });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  }
}

// async function syncZidOrders() {
//   try {
//     const stores = await Store.find({ platform: "zid", isActive: true });

//     for (const store of stores) {
//       try {
//         // إذا انتهى التوكن، نقوم بتحديثه
//         if (store.tokenExpiresAt < new Date()) {
//           const tokenData = await ZidPlatform.refreshAccessToken(
//             store.refreshToken,
//             process.env.ZID_CLIENT_ID,
//             process.env.ZID_CLIENT_SECRET
//           );

//           store.accessToken = tokenData.access_token;
//           store.refreshToken = tokenData.refresh_token;
//           store.tokenExpiresAt = new Date(
//             Date.now() + tokenData.expires_in * 1000
//           );
//           await store.save();
//         }

//         // جلب الطلبات
//         const orders = await ZidPlatform.getOrders(store.accessToken);

//         for (const order of orders.data) {
//           await Order.findOneAndUpdate(
//             { platformOrderId: order.id },
//             {
//               storeId: store._id,
//               platform: "zid",
//               platformOrderId: order.id,
//               status: order.status,
//               total: order.total,
//               currency: order.currency,
//               items: order.items.map((item) => ({
//                 name: item.name,
//                 quantity: item.quantity,
//                 price: item.price,
//               })),
//               customer: {
//                 name: order.customer?.name || "",
//                 email: order.customer?.email || "",
//               },
//               shippingAddress: order.shipping_address,
//             },
//             { upsert: true, new: true }
//           );
//         }

//         console.log(`✅ تم مزامنة الطلبات لمتجر: ${store.storeName}`);
//       } catch (err) {
//         console.error(` فشل في مزامنة الطلبات لمتجر ${store.storeName}:`, err);
//       }
//     }
//   } catch (err) {
//     console.error("خطأ عام في مزامنة الطلبات:", err);
//   }
// }

// schedule.scheduleJob("0 * * * *", () => {
//   console.log("🕒 جاري مزامنة طلبات  كل ساعة...");
//   syncZidOrders();
// });

module.exports = new ZidController();
