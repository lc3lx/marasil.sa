const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    // Personal Information (البيانات الشخصية)
    fullName: { type: String, required: [false, "Full name is required"] },
    // idNumber: { type: String, required: [false, "ID number is required"] },
    birthDate: { type: Date, required: [false, "Birth date is required"] },
    gender: { type: String, enum: ["male", "female"], required: false },
    nationality: { type: String, required: false },
    address: { type: String, required: false },
    email: { type: String, required: false },
    phoneNumber: { type: String, required: false },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },

    // Job Information (البيانات الوظيفية)
    jobTitle: { type: String, required: false },
    department: { type: String, required: false },
    hireDate: { type: Date, required: false },
    contractType: { type: String, required: false },
    contractEndDate: { type: Date },
    directManager: {
      type: String,
      ref: "Customer",
    },
    workHours: {
      startTime: { type: String, required: false },
      endTime: { type: String, required: false },
    },
    workDays: {
      sunday: { type: Boolean, default: false },
      monday: { type: Boolean, default: false },
      tuesday: { type: Boolean, default: false },
      wednesday: { type: Boolean, default: false },
      thursday: { type: Boolean, default: false },
      friday: { type: Boolean, default: false },
      saturday: { type: Boolean, default: false },
    },
    jobDescription: { type: String },

    // Financial Information (البيانات المالية)
    salary: { type: Number, required: false },
    housingAllowance: { type: Number, default: 0 },
    transportationAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    bankName: { type: String, required: false },
    accountNumber: { type: String, required: false },
    ibanNumber: { type: String, required: false },
    paymentMethod: { type: String, required: false },

    // Documents (المستندات)
    personalPhoto: { type: String },
    contractCopy: { type: String },
    educationCertificates: [{ type: String }],
    experienceCertificates: [{ type: String }],
    otherDocuments: [{ type: String }],

        // Salary Status (حالة الراتب)
    salaryStatus: {
      type: String,
      enum: ['pending', 'active'],
      default: 'pending'
    },

    isActive: { type: Boolean, default: false },
  },
  {
    timestamps: false,
  }
);

const SetImageUrl = (doc) => {
  if (doc.personalPhoto) {
    const ImageUrl = `${process.env.BASE_URL}/personalPhoto/${doc.personalPhoto}`;
    doc.personalPhoto = ImageUrl;
  }
  if (doc.contractCopy) {
    const ImageUrl = `${process.env.BASE_URL}/contractCopy/${doc.contractCopy}`;
    doc.contractCopy = ImageUrl;
  }
  if (doc.educationCertificates) {
    doc.imagesList = [];
    // forEach is a fuction
    doc.educationCertificates.forEach((image) => {
      const ImageUrl = `${process.env.BASE_URL}/educationCertificates/${image}`;
      doc.imagesList.push(ImageUrl);
    });
    doc.educationCertificates = doc.imagesList;
  }
  if (doc.experienceCertificates) {
    doc.imagesList = [];
    // forEach is a fuction
    doc.experienceCertificates.forEach((image) => {
      const ImageUrl = `${process.env.BASE_URL}/experienceCertificates/${image}`;
      doc.imagesList.push(ImageUrl);
    });
    doc.experienceCertificates = doc.imagesList;
  }
  if (doc.otherDocuments) {
    doc.imagesList = [];
    // forEach is a fuction
    doc.otherDocuments.forEach((image) => {
      const ImageUrl = `${process.env.BASE_URL}/otherDocuments/${image}`;
      doc.imagesList.push(ImageUrl);
    });
    doc.otherDocuments = doc.imagesList;
  }
};

employeeSchema.post("init", function (doc) {
  SetImageUrl(doc);
});

employeeSchema.post("save", (doc) => {
  SetImageUrl(doc);
});
// Virtual for getting all salary payments
employeeSchema.virtual('salaryPayments', {
  ref: 'Salary',
  localField: '_id',
  foreignField: 'employeeId'
});
employeeSchema.set("toObject", { virtuals: false });
employeeSchema.set("toJSON", { virtuals: false });

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
