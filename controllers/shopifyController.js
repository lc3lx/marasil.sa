const ShopifyPlatform = require("../platforms/shopifyPlatform");
const Store = require("../models/Store");
const Order = require("../models/Order");
const Notification = require("../models/notificationModel");

class ShopifyController {
  async getAuthUrl(req, res) {
    try {
      const { storeName } = req.query;
      if (!storeName) {
        return res.status(400).json({ error: "storeName مطلوب" });
      }

      const platform = new ShopifyPlatform();
      const { authUrl, state } = platform.getAuthorizationUrl(storeName);

      // ممكن تخزن state في الجلسة Session للتأكد من الأمان لاحقًا
      res.json({ authUrl, state });
    } catch (error) {
      console.error("خطأ أثناء إنشاء رابط الأذونات:", error);
      res.status(500).json({ error: "فشل في إنشاء رابط الأذونات" });
    }
  }

  async authCallback(req, res) {
    try {
      const { code, shop } = req.query;

      if (!code || !shop) {
        return res.status(400).json({ error: "معلومات ناقصة من Shopify" });
      }

      const storeName = shop.replace(".myshopify.com", "");

      const platform = new ShopifyPlatform();

      const accessToken = await platform.getAccessToken(storeName, code);

      const fullPlatform = new ShopifyPlatform(storeName, accessToken);
      const storeInfo = await fullPlatform.getStoreInfo();

      let store = await Store.findOne({ storeName });
      if (store) {
        store.accessToken = accessToken;
        store.storeInfo = storeInfo;
        store.isActive = true;
        await store.save();
      } else {
        store = await Store.create({
          platform: "shopify",
          name: storeInfo.name || storeName,
          storeName,
          accessToken,
          storeInfo,
          customer: req.customer._id,
          isActive: true,
        });
        store.storeId = storeInfo.id;
        await store.save();
      }

      res.json({
        message: "تم ربط المتجر بنجاح",
        storeId: storeInfo.id,
        storeName: store.storeName,
      });
    } catch (error) {
      console.error(
        "خطأ في authCallback:",
        error.response?.data || error.message
      );
      res.status(500).json({ error: "فشل في ربط المتجر" });
    }
  }
  async getOrders(req, res) {
    try {
      const io = req.io;

      const { storeId } = req.params;

      const cleanStoreId = storeId.trim();
      const store = await Store.findOne({ storeId: cleanStoreId });

      if (!store) {
        return res.status(404).json({ error: "المتجر غير موجود" });
      }

      const platform = new ShopifyPlatform(store.storeName, store.accessToken);
      const orders = await platform.getOrders(req.query);

      for (const order of orders) {
        let payment_method;

        if (order.payment_terms?.payment_terms_name === "Due on Receipt") {
          payment_method = "COD";
        } else if (order.financial_status === "paid") {
          payment_method = "Prepaid";
        } else {
          payment_method = "COD";
        }
        await Order.findOneAndUpdate(
          { id: order.id },
          {
            id: order.id,
            storeId: cleanStoreId,
            platform: "shopify",
            status: {
              name:
                order.financial_status || order.fulfillment_status || "pending",
            },
            total: {
              amount: parseFloat(order.total_price),
              currency: order.currency,
            },

            payment_method: payment_method,

            payment_actions: {
              paid_amount: {
                amount: parseFloat(order.total_price),
                currency: order.currency,
              },
            },
            items: order.line_items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: parseFloat(item.price),
            })),
            customer: {
              id: order.customer?.id?.toString() || "",
              full_name: `${order.customer?.first_name || ""} ${
                order.customer?.last_name || ""
              }`.trim(),
              first_name: order.customer?.first_name || "",
              last_name: order.customer?.last_name || "",
              mobile: order.customer?.phone || "",
              email: order.customer?.email || "",
              city: order.shipping_address?.city || "",
              country: order.shipping_address?.country || "",
              currency: order.currency,
              location: `${order.shipping_address?.address1 || ""} ${
                order.shipping_address?.address2 || ""
              }`,
            },
            Customer: req.customer._id,
          },
          { upsert: true, new: true }
        );
        const notification = new Notification({
          customerId: req.customer._id,
          type: "order",
          message: `New order #${order.id} has been placed. Total: ${order.total_price} ${order.currency}`,
        });

        await notification.save();

        if (notification.customerId) {
          io.to(`user_${notification.customerId}`).emit(
            "new_notification",
            notification
          );
        }
      }

      res.json(orders);
    } catch (error) {
      console.error("خطأ في جلب الطلبات:", error);
      res.status(500).json({ error: "فشل في جلب الطلبات" });
    }
  }
  async handleOrderCreated(req, res) {
    try {
      const io = req.io;
      const orderData = req.body;

      if (!orderData || !orderData.id) {
        return res.status(400).json({ error: "Invalid order data" });
      }

      const store = await Store.findOne({ storeName: orderData.shop });
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      const customerId = store.customer;

      let payment_method;
      if (orderData.payment_terms?.payment_terms_name === "Due on Receipt") {
        payment_method = "COD";
      } else if (orderData.financial_status === "paid") {
        payment_method = "Prepaid";
      } else {
        payment_method = "COD";
      }

      const order = await Order.findOneAndUpdate(
        { id: orderData.id },
        {
          id: orderData.id,
          storeId: store.storeId,
          platform: "Shopify",
          status: {
            name:
              orderData.financial_status ||
              orderData.fulfillment_status ||
              "pending",
            slug: (
              orderData.financial_status ||
              orderData.fulfillment_status ||
              "pending"
            )
              .toLowerCase()
              .replace(/\s+/g, "_"),
          },
          total: {
            amount: parseFloat(orderData.total_price),
            currency: orderData.currency,
          },
          payment_actions: {
            paid_amount: {
              amount: parseFloat(orderData.total_price),
              currency: orderData.currency,
            },
          },
          payment_method: payment_method,
          items: orderData.line_items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
          })),
          customer: {
            id: orderData.customer?.id?.toString() || "",
            full_name: `${orderData.customer?.first_name || ""} ${
              orderData.customer?.last_name || ""
            }`.trim(),
            first_name: orderData.customer?.first_name || "",
            last_name: orderData.customer?.last_name || "",
            mobile: orderData.customer?.phone || "",
            email: orderData.customer?.email || "",
            city: orderData.customer?.default_address?.city || "",
            country: orderData.customer?.default_address?.country || "",
            currency: orderData.currency,
            location: `${orderData.customer?.default_address?.address1 || ""} ${
              orderData.customer?.default_address?.address2 || ""
            }`.trim(),
          },
          Customer: customerId,
        },
        { upsert: true, new: true }
      );

      const notification = new Notification({
        customerId,
        type: "order",
        message: `New order #${orderData.id} has been placed or updated. Total: ${orderData.total_price} ${orderData.currency}`,
      });

      await notification.save();

      if (notification.customerId) {
        io.to(`user_${notification.customerId}`).emit(
          "new_notification",
          notification
        );
      }

      return res.status(200).json({ status: "success", data: order });
    } catch (error) {
      console.error("Error handling order creation webhook:", error);
      return res
        .status(500)
        .json({ error: "Failed to process order creation webhook" });
    }
  }
}
//  تحديث حالة الطلب
// async updateOrderStatus(req, res) {
//   try {
//     const { storeId, orderId } = req.params;
//     const { status, fulfillmentData } = req.body;

//     //  1. التحقق من وجود المتجر
//     const store = await Store.findById(storeId);
//     if (!store) {
//       return res.status(404).json({ error: "المتجر غير موجود" });
//     }

//     //  2. التحقق من وجود الطلب محليًا
//     const localOrder = await Order.findOne({ id: orderId, storeId });
//     if (!localOrder) {
//       return res.status(404).json({ error: "الطلب غير موجود" });
//     }

//     //  3. إنشاء كائن ShopifyPlatform
//     const platform = new ShopifyPlatform(store.storeName, store.accessToken);

//     let shopifyResponse = {};

//     //  4. تنفيذ Fulfillment إذا الحالة "fulfilled"
//     if (status === "fulfilled") {
//       if (!fulfillmentData || !fulfillmentData.location_id) {
//         return res
//           .status(400)
//           .json({ error: "يجب توفير بيانات الشحن مع location_id" });
//       }

//       //  جلب الطلب من Shopify
//       const shopifyOrder = await platform.getOrder(orderId);

//       if (
//         !shopifyOrder ||
//         !shopifyOrder.line_items ||
//         shopifyOrder.line_items.length === 0
//       ) {
//         return res
//           .status(400)
//           .json({ error: "لا يوجد عناصر في الطلب من Shopify" });
//       }

//       //  التحقق من الكمية في المخزون قبل التنفيذ
//       const lineItem = shopifyOrder.line_items[0];
//       const variantId = lineItem.variant_id;
//       const quantity = lineItem.quantity;
//       const locationId = fulfillmentData.location_id;

//       const inventoryItemId = await platform.getInventoryItemId(variantId);
//       const inventoryCheck = await platform.checkInventory(
//         locationId,
//         inventoryItemId,
//         quantity
//       );

//       if (!inventoryCheck.success) {
//         return res.status(400).json({
//           error: "المخزون غير كافٍ أو غير متاح في هذا الموقع",
//           details: inventoryCheck.reason,
//         });
//       }

//       //  تنفيذ Fulfillment
//       shopifyResponse = await platform.createFulfillment(
//         orderId,
//         fulfillmentData
//       );
//     }

//     //  5. إذا الحالة "cancelled" أو "open"
//     else if (status === "cancelled" || status === "open") {
//       shopifyResponse = await platform.updateOrderStatus(orderId, status);
//     }

//     //  حالة غير مدعومة
//     else {
//       return res.status(400).json({ error: "الحالة غير مدعومة" });
//     }

//     //  6. تحديث الطلب محليًا
//     const updatedOrder = await Order.findOneAndUpdate(
//       { id: orderId },
//       {
//         status: {
//           name: status,
//           slug: status,
//         },
//         updatedAt: Date.now(),
//       },
//       { new: true }
//     );

//     //  7. إرجاع الاستجابة
//     return res.status(200).json({
//       status: "success",
//       data: updatedOrder,
//       shopifyResponse,
//     });
//   } catch (error) {
//     console.error("Error updating order status:", error.message);
//     return res.status(500).json({
//       error: "فشل في تحديث حالة الطلب",
//       details: error.message,
//     });
//   }
// }
// }

module.exports = new ShopifyController();
