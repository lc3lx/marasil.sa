const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
   customerId: {
    type: mongoose.Schema.ObjectId,
    ref: "Customer",
  },
  type: {
    type: String,
    required: true,
    enum: ['broadcast', 'targeted', 'order']
  },
  message: {
    type: String,
    required: true
  },
  readStatus: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);

