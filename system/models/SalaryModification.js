const mongoose = require('mongoose');

const salaryModificationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee is required']
  },
  type: {
    type: String,
    enum: ['bonus', 'deduction'],
    required: [true, 'Modification type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  totalSalary:{
    type:Number
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  month: {
    type: Date,
    default: Date.now,
  },
  admin: {
    type: String,
  }
}, {
  timestamps: true
});

// Index for efficient querying by employee and month
// salaryModificationSchema.index({ employee: 1, month: 1 });

salaryModificationSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'employee',
    select: 'name'
  });
  next();
});
const SalaryModification = mongoose.model('SalaryModification', salaryModificationSchema);

module.exports = SalaryModification;