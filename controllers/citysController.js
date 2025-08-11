const fs = require('fs');
const path = require('path');

// تحميل بيانات المدن والمناطق مرة واحدة (يمكن تحسينها لاحقاً بكاش أو dynamic reload)
const cities = JSON.parse(fs.readFileSync(path.join(__dirname, '../KAS/cities.json'), 'utf8'));
const regions = JSON.parse(fs.readFileSync(path.join(__dirname, '../KAS/regions_lite.json'), 'utf8'));

// Helper: إيجاد اسم المنطقة من region_id
function getRegionName(region_id) {
  const region = regions.find(r => r.region_id === region_id);
  return region ? region.name_ar : '';
}

// API: بحث عن مدينة بالاسم (عربي أو إنجليزي)
// مثال: GET /api/cities/search?name=الرياض
exports.searchCity = (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المدينة للبحث.' });
  }

  // بحث غير حساس لحالة الأحرف
  const results = cities.filter(city =>
    city.name_ar.includes(name) || city.name_en.toLowerCase().includes(name.toLowerCase())
  ).map(city => ({
    city_id: city.city_id,
    name_ar: city.name_ar,
    name_en: city.name_en,
    region_id: city.region_id,
    region_name: getRegionName(city.region_id)
  }));

  res.json({ results });
};

// يمكن لاحقاً إضافة endpoint آخر لجلب كل المدن أو حسب المنطقة إذا رغبت
