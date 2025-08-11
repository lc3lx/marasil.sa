const axios = require("axios");
const { URLSearchParams } = require("url");

async function authenticate(isProduction = false) {
  const authServer = isProduction
    ? "https://id.omnic.solutions/oauth/token"
    : "https://id.dev.omnic.solutions/oauth/token";

  // توليد Basic Auth Header
  const basicAuth = Buffer.from(
    `zjShmQfZlM2DSXKVsZG5fbyt:7IVhCT8zw3g9PdF17NwnrevFIEcshLr46V9BrJJzIelkokJp`
  ).toString("base64");

  // إعداد البيانات المُرسلة (x-www-form-urlencoded)
  const body = new URLSearchParams();
  body.append("grant_type", "client_credentials");

  try {
    const response = await axios.post(authServer, body.toString(), {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    console.log(response);
    // معالجة الرد الناجح
    return {
      success: true,
      accessToken: response.data.data.access_token,
      expiresIn: response.data.data.expires_in,
      tokenType: response.data.data.token_type,
    };
  } catch (error) {
    // معالجة الأخطاء
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        message: error.response.data.message || "Authentication failed",
      };
    } else {
      return {
        success: false,
        message: "Network error or server unavailable",
      };
    }
  }
}

// مثال للاستخدام
const CLIENT_ID = "YOUR_CLIENT_ID";
const CLIENT_SECRET = "YOUR_CLIENT_SECRET";

authenticate(CLIENT_ID, CLIENT_SECRET, false).then((result) => {
  if (result.success) {
    console.log("Access Token:", result.accessToken);
  } else {
    console.error("Error:", result.message);
  }
});
const client_id = "zjShmQfZlM2DSXKVsZG5fbyt",
  client_secret = "7IVhCT8zw3g9PdF17NwnrevFIEcshLr46V9BrJJzIelkokJp";
authenticate();
