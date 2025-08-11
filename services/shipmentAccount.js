module.exports.shipmentnorm = (shippingType, orderData) => {
  // التحقق من صحة المدخلات
  if (!shippingType || !orderData) {
    throw new Error("البيانات غير مكتملة");
  }

  // حساب الوزن الزائد
  const additionalWeight = orderData.weight > shippingType.maxWeight 
    ? Math.ceil(orderData.weight - shippingType.maxWeight) 
    : 0;
    
  // حساب التكلفة الأساسية مع الأرباح
  const baseCost = shippingType.basePrice + shippingType.profitPrice;
  
  // حساب تكلفة الوزن الإضافي مع الأرباح
  const additionalWeightCost = additionalWeight * (shippingType.baseAdditionalweigth + shippingType.profitAdditionalweigth);
  
  // حساب رسوم الدفع عند الاستلام مع الأرباح
  const codFees = orderData.paymentMethod === "COD"
    ? shippingType.baseCODfees + shippingType.profitCODfees
    : 0;
    
  // حساب المبالغ الخاضعة للضريبة (البنود الأساسية فقط بدون أرباح)
  let taxableAmount = shippingType.basePrice; // السعر الأساسي فقط
  
  if (orderData.paymentMethod === "COD") {
    taxableAmount += shippingType.baseCODfees; // رسوم الدفع الأساسية فقط
  }
  
  if (additionalWeight > 0) {
    taxableAmount += additionalWeight * shippingType.baseAdditionalweigth; // رسوم الوزن الإضافي الأساسية فقط
  }
  
  // حساب الضريبة على البنود الأساسية فقط
  const tax = taxableAmount * shippingType.priceaddedtax;
  
  // حساب المجموع النهائي (يشمل الأرباح والضريبة على البنود الأساسية فقط)
  const subtotal = baseCost + additionalWeightCost + codFees;
  const total = subtotal + tax;

  return {
    breakdown: {
      baseCost,
      additionalWeightCost,
      codFees,
      subtotal,
      tax,
    },
    total,
  };
};

// ✅ تحقق من المدخلات
function validateInputs(shippingType, order) {
  if (!shippingType) throw new Error("Company data is missing");
  if (!Array.isArray(shippingType.type))
    throw new Error("Shipping types are missing");
  if (!order?.shippingType) throw new Error("Shipping type is required");
  if (!order?.paymentMethod) throw new Error("Payment method is required");
  if (typeof order.weight !== "number" || order.weight <= 0)
    throw new Error("Invalid weight value");
}

// 📦 حساب تكلفة الوزن الزائد
function calculateAdditionalWeightCost(
  weight,
  maxWeight,
  baseAdditional,
  profitAdditional
) {
  if (weight <= maxWeight) return 0;
  const extra = Math.ceil(weight - maxWeight);
  return extra * (baseAdditional + profitAdditional);
}
