module.exports = {
  smsa: {
    // استخدام البيئة التجريبية افتراضياً
    baseURL: process.env.SMSA_BASE_URL || "https://ecomapis-sandbox.azurewebsites.net",
    apiKey: process.env.SMSA_API_KEY || "b60dbb7bc50a4331a3411c820c08dffc", // مفتاح البيئة التجريبية
    production: {
      baseURL: "https://ecomapis.smsaexpress.com",
      apiKey: "43e1e7b2eb6f4999a4a91a7c1383285d"
    }
  }
};
