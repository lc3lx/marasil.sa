const cron = require('node-cron');
const Shapment = require('../models/shipmentModel');
const omin = require('../platforms/shipment/omnidPlatform');

function extractLabel(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (typeof payload?.data === 'string') return payload.data;
  if (typeof payload?.data?.label === 'string') return payload.data.label;
  if (typeof payload?.data?.url === 'string') return payload.data.url;
  if (typeof payload?.data?.file === 'string') return payload.data.file;
  if (typeof payload?.label === 'string') return payload.label;
  if (typeof payload?.url === 'string') return payload.url;
  if (typeof payload?.file === 'string') return payload.file;
  return null;
}

async function pollOmniLabelsOnce() {
  try {
    const candidates = await Shapment.find({
      shapmentCompany: 'omniclama',
      $or: [
        { 'omniclamaResponse': { $exists: false } },
        { 'omniclamaResponse.label': { $exists: false } },
        { 'omniclamaResponse.label': null },
        { 'omniclamaResponse.label': '' },
      ],
    }).select('_id trackingId');

    for (const s of candidates) {
      if (!s.trackingId) continue;
      try {
        const resp = await omin.printLabels(s.trackingId);
        const label = extractLabel(resp);
        if (label) {
          await Shapment.findByIdAndUpdate(
            s._id,
            { $set: { 'omniclamaResponse.label': label } },
            { new: true }
          );
        }
      } catch (e) {
        // swallow; will retry next cycle
      }
    }
  } catch (err) {
    // swallow top-level errors to keep scheduler alive
  }
}

function scheduleOmniLabelPolling() {
  // run at minute 0 every hour
  cron.schedule('0 * * * *', pollOmniLabelsOnce);
}

module.exports = { scheduleOmniLabelPolling, pollOmniLabelsOnce };
