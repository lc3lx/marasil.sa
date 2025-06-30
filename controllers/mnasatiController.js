const schedule = require("node-schedule");

const MnasatiPlatform = require("../platforms/mnasatiPlatform");
const Store = require("../models/Store");
const Order = require("../models/Order");

const mnasatiController = {
  // Get authorization URL for Mnasati OAuth
  getAuthUrl(req, res) {
    try {
      const state = Math.random().toString(36).substring(7);
      const authUrl = MnasatiPlatform.getAuthUrl(
        process.env.MNASATI_CLIENT_ID,
        process.env.MNASATI_REDIRECT_URI,
        state
      );

      res.json({
        success: true,
        authUrl,
        state,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to generate auth URL",
        error: error.message,
      });
    }
  },

  // Handle OAuth callback and connect store
  async handleCallback(req, res) {
    try {
      const { code, state } = req.query;

      const mnasati = new MnasatiPlatform(
        process.env.MNASATI_CLIENT_ID,
        process.env.MNASATI_CLIENT_SECRET,
        process.env.MNASATI_REDIRECT_URI
      );

      // Get access token
      const tokens = await mnasati.getAccessToken(code);

      // Get store info
      const storeInfo = await mnasati.getStoreInfo(tokens.access_token);

      // Create or update store record
      const store = await Store.findOneAndUpdate(
        { storeId: storeInfo.id },
        {
          name: storeInfo.name,
          platform: "mnasati",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 10000),
          storeInfo,
          isActive: true,
        },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: "Mnasati store connected successfully",
        store,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to connect Mnasati store",
        error: error.message,
      });
    }
  },

  // Get store orders
  async getStoreOrders(req, res) {
    try {
      const { storeId } = req.params;
      const store = await Store.findById(storeId);

      if (!store || store.platform !== "mnasati") {
        return res.status(404).json({
          success: false,
          message: "Mnasati store not found",
        });
      }

      // Check if token needs refresh
      if (store.tokenExpiresAt < new Date()) {
        const tokens = await this.refreshAccessToken(
          { params: { storeId } },
          { json: () => {} }
        );

        store.accessToken = tokens.access_token;
        store.refreshToken = tokens.refresh_token;
        store.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await store.save();
      }

      const mnasati = new MnasatiPlatform(
        process.env.MNASATI_CLIENT_ID,
        process.env.MNASATI_CLIENT_SECRET,
        process.env.MNASATI_REDIRECT_URI
      );

      const orders = await mnasati.getOrders(store.accessToken, req.query);
      res.json({
        success: true,
        orders,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch store orders",
        error: error.message,
      });
    }
  },

 

  // Update order status in Mnasati
  async updateOrderStatus(req, res) {
    try {
      const { storeId, orderId } = req.params;
      const { status } = req.body;

      const store = await Store.findById(storeId);
      if (!store || store.platform !== "mnasati") {
        return res.status(404).json({
          success: false,
          message: "Mnasati store not found",
        });
      }

      // Check if token needs refresh

      if (store.tokenExpiresAt < new Date()) {
        const tokens = await this.refreshAccessToken(
          { params: { storeId } },
          { json: () => {} }
        );

        store.accessToken = tokens.access_token;
        store.refreshToken = tokens.refresh_token;
        store.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await store.save();
      }

      const mnasati = new MnasatiPlatform(
        process.env.MNASATI_CLIENT_ID,
        process.env.MNASATI_CLIENT_SECRET,
        process.env.MNASATI_REDIRECT_URI
      );

      const updatedOrder = await mnasati.updateOrderStatus(
        store.accessToken,
        orderId,
        status
      );

      // Update order in our database
      await Order.findOneAndUpdate({ orderId, storeId }, { status });

      res.json({
        success: true,
        message: "Order status updated successfully",
        order: updatedOrder,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update order status",
        error: error.message,
      });
    }
  },
};
async function syncOrdersAutomatically() {
  try {
    // Get all stores (or filter by specific stores if needed)
    const stores = await Store.find({ platform: "mnasati" });

    for (const store of stores) {
      const mnasati = new MnasatiPlatform(
        process.env.MNASATI_CLIENT_ID,
        process.env.MNASATI_CLIENT_SECRET,
        process.env.MNASATI_REDIRECT_URI
      );
      // Check if token needs refresh
      if (store.tokenExpiresAt < new Date()) {
        const tokens = await this.refreshAccessToken(
          { params: { storeId: store._id } },
          { json: () => {} }
        );

        store.accessToken = tokens.access_token;
        store.refreshToken = tokens.refresh_token;
        store.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await store.save();
      }

      const orders = await mnasati.getOrders(store.accessToken);

      // Sync orders to the database
      await Promise.all(
        orders.map(async (order) => {
          const existingOrder = await Order.findOne({
            orderId: order.id.toString(),
            storeId: store._id,
          });

          if (!existingOrder) {
            await Order.create({
              orderId: order.id.toString(),
              storeId: store._id,
              platform: "mnasati",
              status: order.status,
              customer: {
                name: order.customer.name,
                email: order.customer.email,
                phone: order.customer.phone,
                address: {
                  street: order.customer.address.street,
                  city: order.customer.address.city,
                  country: order.customer.address.country,
                },
              },
              items: order.items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })),
              totalAmount: order.total,
            });
          }
        })
      );
      console.log(`Successfully synced orders for store ${store.storeName}`);
    }
  } catch (error) {
    console.error("Failed to sync orders:", error);
  }
}

// Schedule the sync task to run every hour
schedule.scheduleJob("0 * * * *", () => {
  console.log("🕒 جاري مزامنة طلبات  كل ساعة...");
  syncOrdersAutomatically();
});

module.exports = mnasatiController;





// module.exports = async function mnasatiTokenRefresher(req, res, next) {
//   try {
//     const { storeName } = req.params || req.query || req.body;

//     if (!storeName) {
//       return res.status(400).json({ error: "Store name is required" });
//     }

//     const store = await Store.findOne({ storeName });

//     if (!store) {
//       return res.status(404).json({ error: "Store not found" });
//     }

//     if (store.platform !== "mnasati") {
//       return res.status(400).json({ error: "Invalid store platform" });
//     }

//     // تحقق من صلاحية التوكن
//     const now = new Date();
//     if (store.tokenExpiresAt <= now) {
//       console.log(`🔁 Refreshing token for store: ${store.storeName}`);

//       const mnasati = new MnasatiPlatform(
//         process.env.MNASATI_CLIENT_ID,
//         process.env.MNASATI_CLIENT_SECRET,
//         process.env.MNASATI_REDIRECT_URI
//       );

//       const tokens = await mnasati.refreshAccessToken(store.refreshToken);

//       // تحديث البيانات
//       store.accessToken = tokens.access_token;
//       store.refreshToken = tokens.refresh_token;
//       store.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
//       await store.save();

//       console.log("✅ Token refreshed.");
//     }

//     // مرر بيانات المتجر للراوت
//     req.store = store;

//     next();
//   } catch (error) {
//     console.error("❌ Error in token refresher middleware:", error);
//     res.status(500).json({ error: "Failed to refresh access token", details: error.message });
//   }
// };

 // Sync orders from Mnasati // manually
  // async syncOrders(req, res) {
  //   try {
  //     const { storeId } = req.params;
  //     const store = await Store.findById(storeId);

  //     if (!store || store.platform !== "mnasati") {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Mnasati store not found",
  //       });
  //     }

  //     const mnasati = new MnasatiPlatform(
  //       process.env.MNASATI_CLIENT_ID,
  //       process.env.MNASATI_CLIENT_SECRET,
  //       process.env.MNASATI_REDIRECT_URI
  //     );

  //     const orders = await mnasati.getOrders(store.accessToken);

  // Sync orders to our database // manually
  //     const syncedOrders = await Promise.all(
  //       orders.map(async (order) => {
  //         const existingOrder = await Order.findOne({
  //           orderId: order.id.toString(),
  //           storeId: store._id,
  //         });

  //         if (!existingOrder) {
  //           return Order.create({
  //             orderId: order.id.toString(),
  //             storeId: store._id,
  //             platform: "mnasati",
  //             status: order.status,
  //             customer: {
  //               name: order.customer.name,
  //               email: order.customer.email,
  //               phone: order.customer.phone,
  //               address: {
  //                 street: order.customer.address.street,
  //                 city: order.customer.address.city,
  //                 country: order.customer.address.country,
  //               },
  //             },
  //             items: order.items.map((item) => ({
  //               name: item.name,
  //               quantity: item.quantity,
  //               price: item.price,
  //             })),
  //             totalAmount: order.total,
  //           });
  //         }
  //         return existingOrder;
  //       })
  //     );

  //     res.json({
  //       success: true,
  //       message: "Orders synced successfully",
  //       orders: syncedOrders,
  //     });
  //   } catch (error) {
  //     res.status(500).json({
  //       success: false,
  //       message: "Failed to sync orders"
  //       error: error.message,
  //     });
  //   }
  // },
