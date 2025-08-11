// const SallaStore = require("../models/ecomercModel/sallaStoreModel");
const schedule = require("node-schedule");
const crypto = require("crypto");
const SallaPlatform = require("../platforms/sallaPlatform");
const Store = require("../models/Store");
const Order = require("../models/Order");
const Notification = require("../models/notificationModel");

const dotenv = require("dotenv");
const customer = require("../models/customerModel");
dotenv.config();

// Get authorization URL for Salla OAuth
exports.getAuthUrl = async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");

    // req.session.sallaState = state;

    const authUrl = SallaPlatform.getAuthUrl(
      process.env.SALLA_CLIENT_ID,
      process.env.SALLA_REDIRECT_URI,
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
};

// Handle OAuth callback and connect store
exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    // if (!state || state.length < 8) {
    //   return res.status(400).json({ error: "Invalid state parameter" });
    // }

    // تحقق من تطابقها مع القيمة الأصلية (مثال باستخدام الجلسة)
    // if (state !== req.session.sallaState) {
    //   return res.status(403).json({ error: "State mismatch" });
    // }

    const salla = new SallaPlatform(
      process.env.SALLA_CLIENT_ID,
      process.env.SALLA_CLIENT_SECRET,
      process.env.SALLA_REDIRECT_URI
    );

    // Get access token
    const tokens = await salla.getAccessToken(code);

    // console.log("Tokens received:", tokens);
    if (!tokens.access_token) {
      return res.status(400).json({ error: "No access token received" });
    }
    // Get store info
    const storeInfo = await salla.getStoreInfo(tokens.access_token);

    // Create or update store record
    const store = await Store.findOneAndUpdate(
      { storeId: storeInfo.id },
      {
        name: storeInfo.name,
        storeId: storeInfo.id,
        platform: "salla",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        storeInfo,
        isActive: true,
        customer: req.customer._id,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "Salla store connected successfully",
      store,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to connect Salla store",
      error: error.message,
    });
  }
};

// Get store orders
exports.getStoreOrders = async (req, res) => {
  try {
    const io = req.io;
    const { storeId } = req.params;
    const store = await Store.findOne({ storeId: storeId });

    if (!store || store.platform !== "salla") {
      return res.status(404).json({
        success: false,
        message: "Salla store not found",
      });
    }

    // Check if token needs refresh
    if (store.tokenExpiresAt < new Date()) {
      const salla = new SallaPlatform(
        process.env.SALLA_CLIENT_ID,
        process.env.SALLA_CLIENT_SECRET,
        process.env.SALLA_REDIRECT_URI
      );

      const tokens = await salla.refreshAccessToken(store.refreshToken);

      // Update store tokens
      store.accessToken = tokens.access_token;
      store.refreshToken = tokens.refresh_token;
      store.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await store.save();
    }

    const salla = new SallaPlatform(
      process.env.SALLA_CLIENT_ID,
      process.env.SALLA_CLIENT_SECRET,
      process.env.SALLA_REDIRECT_URI
    );

    const response = await salla.getOrders(store.accessToken, req.query);

    // Store orders in the database
    if (!response || !response.data || !Array.isArray(response.data)) {
      console.error("Invalid response structure:", response);
      throw new Error("Invalid orders response structure");
    }

    for (const order of response.data) {
      try {
        const orderData = {
          platform: "salla",
          id: order.id,
          storeId: storeId,
          total: {
            amount: order.total?.amount || "",
            currency: order.total?.currency || "",
          },
          status: {
            name: order.status?.name || "",
            slug: order.status?.slug || "",
          },
          payment_method:
            order.payment_method?.toLowerCase() === "cod" ? "COD" : "Prepaid",

          payment_actions: {
            paid_amount: {
              amount:
                order.payment_actions?.refund_action?.paid_amount?.amount || "",
              currency:
                order.payment_actions?.refund_action?.paid_amount?.currency ||
                "",
            },
          },
          items:
            order.items?.map((item) => ({
              name: item.name || "",
              quantity: item.quantity || 0,
              price: item.price || "",
            })) || [],
          customer: {
            id: order.customer?.id || "",
            full_name: order.customer?.full_name || "",
            first_name: order.customer?.first_name || "",
            last_name: order.customer?.last_name || "",
            mobile: order.customer?.mobile || "",
            email: order.customer?.email || "",
            city: order.customer?.city || "",
            country: order.customer?.country || "",
            currency: order.customer?.currency || "",
            location: order.customer?.location || "",
          },
          Customer: req.customer._id,
        };

        const updatedOrder = await Order.findOneAndUpdate(
          { id: order.id },
          orderData,
          { upsert: true, new: true }
        );

        // console.log(`Synced order ${order.id} for store ${store.name}`);

        const notification = new Notification({
          customerId: req.customer._id,
          type: "order",
          message: `Order #${order.id} has been placed or updated. Total: ${order.total?.amount} ${order.total?.currency}`,
        });

        await notification.save();

        if (notification.customerId) {
          io.to(`user_${notification.customerId}`).emit(
            "new_notification",
            notification
          );
        }
      } catch (orderError) {
        console.error(
          `Error processing order ${order.id}:`,
          orderError.message
        );
      }
    }

    res.json({
      success: true,
      orders: {
        status: 200,
        success: true,
        data: response.data,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch store orders",
      error: error.message,
    });
  }
};

// Update order status in Salla
exports.updateOrderStatus = async (req, res) => {
  try {
    const { storeId, orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "payment_pending",
      "under_review",
      "in_progress",
      "completed",
      "delivering",
      "delivered",
      "shipped",
      "canceled",
      "restored",
      "restoring",
    ];

    if (!status || !status.slug) {
      return res
        .status(400)
        .json({ success: false, error: "Status with slug is required" });
    }

    if (!allowedStatuses.includes(status.slug)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid status value" });
    }

    const store = await Store.findOne({ storeId });

    if (!store || store.platform !== "salla") {
      return res.status(404).json({
        success: false,
        message: "Salla store not found",
      });
    }

    const salla = new SallaPlatform(
      process.env.SALLA_CLIENT_ID,
      process.env.SALLA_CLIENT_SECRET,
      process.env.SALLA_REDIRECT_URI
    );

    if (store.tokenExpiresAt < new Date()) {
      try {
        const tokens = await salla.refreshAccessToken(store.refreshToken);
        store.accessToken = tokens.access_token;
        store.refreshToken = tokens.refresh_token;
        store.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await store.save();
      } catch (refreshErr) {
        return res.status(401).json({
          success: false,
          message: "Failed to refresh access token",
          error: refreshErr.message,
        });
      }
    }

    try {
      const updatedOrder = await salla.updateOrderStatus(
        store.accessToken,
        orderId,
        status
      );

      // update order in db
      await Order.findOneAndUpdate(
        { id: orderId },
        { status: status.slug },
        { new: true }
      );

      return res.json({
        success: true,
        message: "Order status updated successfully",
        order: updatedOrder,
      });
    } catch (updateErr) {
      console.error("Update order error:", updateErr);
      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
        error: updateErr.message || "Unexpected error",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error",
      error: error.message,
    });
  }
};

exports.handleOrderCreated = async (req, res) => {
  try {
    const io = req.io;

    const event = req.body;

    // التأكد أن الحدث هو إنشاء طلب
    if (event.event !== "order.created") {
      return res.status(200).json({ message: "تم تجاهل الحدث" });
    }

    const orderId = event.data?.id;
    let orderData = event.data;

    // جلب المتجر من قاعدة البيانات
    const storeId = event.store_id || event.data?.store?.id;
    const store = await Store.findOne({ platform: "salla", storeId });

    if (!store) {
      return res
        .status(404)
        .json({ error: "المتجر غير موجود في قاعدة البيانات" });
    }

    const accessToken = store.accessToken;

    // جلب بيانات الطلب من API سلة إذا لم تكن موجودة في الحدث
    if (!orderData && orderId) {
      try {
        const response = await axios.get(
          `https://api.salla.dev/admin/v2/orders/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        orderData = response.data.data;
      } catch (fetchErr) {
        console.error("فشل في جلب بيانات الطلب من سلة:", fetchErr);
        return res.status(500).json({ error: "تعذر جلب بيانات الطلب" });
      }
    }

    const customerId = store.customer;

    await Order.findOneAndUpdate(
      { platform: "salla", id: orderData.id },
      {
        platform: "salla",
        id: orderData.id,
        storeId: store.storeId,

        total: {
          amount: orderData.total?.amount || "",
          currency: orderData.total?.currency || "",
        },

        status: {
          name: orderData.status?.name || "",
          slug: orderData.status?.slug || "",
        },

        payment_method:
          orderData.payment_method?.toLowerCase() === "cod" ? "COD" : "Prepaid",

        payment_actions: {
          paid_amount: {
            amount:
              orderData.payment_actions?.refund_action?.paid_amount?.amount ||
              "",
            currency:
              orderData.payment_actions?.refund_action?.paid_amount?.currency ||
              "",
          },
        },

        items:
          orderData.items?.map((item) => ({
            name: item.name || "",
            quantity: item.quantity || 0,
            price: item.price || "",
          })) || [],

        customer: {
          id: orderData.customer?.id || "",
          full_name: orderData.customer?.full_name || "",
          first_name: orderData.customer?.first_name || "",
          last_name: orderData.customer?.last_name || "",
          mobile: orderData.customer?.mobile || "",
          email: orderData.customer?.email || "",
          city: orderData.customer?.city || "",
          country: orderData.customer?.country || "",
          currency: orderData.customer?.currency || "",
          location: orderData.customer?.location || "",
        },
        Customer: customerId,
      },
      { upsert: true, new: true }
    );

    const notification = new Notification({
      customerId,
      type: "order",
      message: `New order #${orderData.id} has been placed. Total: ${orderData.total?.amount} ${orderData.total?.currency}`,
    });

    await notification.save();

    if (notification.customerId) {
      io.to(`user_${notification.customerId}`).emit(
        "new_notification",
        notification
      );
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("خطأ في معالجة Webhook سلة:", error);
    return res.status(500).json({ error: "فشل في معالجة Webhook الطلب" });
  }
};
