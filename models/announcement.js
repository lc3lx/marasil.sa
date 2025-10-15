const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  backgroundColor: {
    type: String,
    default: '#3B82F6', // blue-500
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Background color must be a valid hex color'
    }
  },
  textColor: {
    type: String,
    default: '#FFFFFF', // white
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Text color must be a valid hex color'
    }
  },
  fontSize: {
    type: String,
    enum: ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'],
    default: 'text-base'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
announcementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
announcementSchema.index({ isActive: 1, priority: -1, startDate: 1 });
announcementSchema.index({ endDate: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
