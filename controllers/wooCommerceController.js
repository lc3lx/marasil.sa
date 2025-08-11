const WooCommercePlatform = require("../platforms/wooCommercePlatform");
const Store = require("../models/Store");
const Order = require("../models/Order");
const crypto = require("crypto");

class WooCommerceController {
  // Get OAuth URL for store authorization
  async getAuthUrl(req, res) {
    try {
      const { storeUrl } = req.query;
      if (!storeUrl) {
        return res.status(400).json({ error: "Store URL is required" });
      }

      const platform = new WooCommercePlatform(storeUrl);
      const { url, state } = platform.getAuthUrl(storeUrl);

      // Store state in session for verification
      req.session.oauthState = state;
      req.session.storeUrl = storeUrl;

      res.json({ authUrl: url });
    } catch (error) {
      console.error("Error getting auth URL:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  }

  // Handle OAuth callback
  async handleCallback(req, res) {
    try {
      const { state, code } = req.query;
      const { oauthState, storeUrl } = req.session;

      if (!state || !oauthState || state !== oauthState) {
        return res.status(400).json({ error: "Invalid state parameter" });
      }

      if (!storeUrl) {
        return res
          .status(400)
          .json({ error: "Store URL not found in session" });
      }

      // Clear session data
      delete req.session.oauthState;
      delete req.session.storeUrl;

      // Redirect to store connection page with success message
      res.redirect(
        `${process.env.FRONTEND_URL}/stores/connect?success=true&storeUrl=${storeUrl}`
      );
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      res.redirect(
        `${process.env.FRONTEND_URL}/stores/connect?error=Failed to authenticate store`
      );
    }
  }

  // Handle store connection
  async connectStore(req, res) {
    try {
      const { storeUrl, consumerKey, consumerSecret } = req.body;

      if (!storeUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const platform = new WooCommercePlatform(
        storeUrl,
        consumerKey,
        consumerSecret
      );

      // Test connection by getting store info
      const storeInfo = await platform.getStoreInfo();

      // Check if store already exists
      let store = await Store.findOne({ storeUrl });
      if (store) {
        // Update existing store credentials
        store.credentials = {
          consumerKey,
          consumerSecret,
        };
        store.storeInfo = storeInfo;
        store.isActive = true;
        await store.save();
      } else {
        // Create new store
        store = await Store.create({
          platform: "woocommerce",
          name: storeInfo.name || storeUrl,
          storeUrl,
          credentials: {
            consumerKey,
            consumerSecret,
          },
          storeInfo,
          isActive: true,
        });
      }

      res.json({
        message: "Store connected successfully",
        storeId: store._id,
      });
    } catch (error) {
      console.error("Error connecting store:", error);
      res.status(500).json({ error: "Failed to connect store" });
    }
  }

  // Fetch orders from WooCommerce
  async getOrders(req, res) {
    try {
      const { storeId } = req.params;
      const store = await Store.findById(storeId);

      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      const platform = new WooCommercePlatform(
        store.storeUrl,
        store.credentials.consumerKey,
        store.credentials.consumerSecret
      );

      const orders = await platform.getOrders(req.query);

      // Store orders in database
      for (const order of orders) {
        await Order.findOneAndUpdate(
          { platformOrderId: order.id },
          {
            storeId,
            platform: "woocommerce",
            platformOrderId: order.id,
            status: order.status,
            total: order.total,
            currency: order.currency,
            items: order.line_items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            customer: {
              name: `${order.billing.first_name} ${order.billing.last_name}`,
              email: order.billing.email,
            },
            shippingAddress: order.shipping,
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

      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      const platform = new WooCommercePlatform(
        store.storeUrl,
        store.credentials.consumerKey,
        store.credentials.consumerSecret
      );

      const updatedOrder = await platform.updateOrderStatus(orderId, status);

      // Update order in database
      await Order.findOneAndUpdate({ platformOrderId: orderId }, { status });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  }

  async syncOrdersWooCommerce() {
    schedule.scheduleJob("0 * * * *", async () => {
      try {
        const stores = await Store.find({ platform: "woocommerce", isActive: true });

        for (const store of stores) {
          const platform = new WooCommercePlatform(
            store.storeUrl,
            store.credentials.consumerKey,
            store.credentials.consumerSecret
          );

          const orders = await platform.getOrders({ status: "processing" }); // You can change status as needed

          // Process and save orders
          for (const order of orders) {
            await Order.findOneAndUpdate(
              { platformOrderId: order.id },
              {
                storeId: store._id,
                platform: "woocommerce",
                platformOrderId: order.id,
                status: order.status,
                total: order.total,
                currency: order.currency,
                items: order.line_items.map((item) => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                })),
                customer: {
                  name: `${order.billing.first_name} ${order.billing.last_name}`,
                  email: order.billing.email,
                },
                shippingAddress: order.shipping,
              },
              { upsert: true, new: true }
            );
          }
        }
      } catch (error) {
        console.error("Error automatically fetching orders:", error);
      }
    });
  }

  // Handle webhooks
  // async handleWebhook(req, res) {
  //   try {
  //     const { storeId } = req.params;
  //     const signature = req.headers["x-wc-webhook-signature"];

  //     const store = await Store.findById(storeId);
  //     if (!store) {
  //       return res.status(404).json({ error: "Store not found" });
  //     }

  //     const platform = new WooCommercePlatform(
  //       store.storeUrl,
  //       store.credentials.consumerKey,
  //       store.credentials.consumerSecret
  //     );

  //     if (
  //       !platform.verifyWebhookSignature(
  //         req.body,
  //         signature,
  //         store.credentials.consumerSecret
  //       )
  //     ) {
  //       return res.status(401).json({ error: "Invalid webhook signature" });
  //     }

  //     const { id, status } = req.body;

  //     // Update order in database
  //     await Order.findOneAndUpdate({ platformOrderId: id }, { status });

  //     res.status(200).send("OK");
  //   } catch (error) {
  //     console.error("Error handling webhook:", error);
  //     res.status(500).json({ error: "Failed to process webhook" });
  //   }
  // }
}

module.exports = new WooCommerceController();
