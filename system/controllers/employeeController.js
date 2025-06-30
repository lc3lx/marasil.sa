const asyncHandler = require("express-async-handler");
const Employee = require("../models/Employee");
const factory = require("../../controllers/handlersFactory");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

const {
  UploadArrayofImages,
} = require("../../middlewares/uploadImageMiddleware");

exports.uploadEmployeeFiles = UploadArrayofImages([
  { name: "personalPhoto", maxCount: 1 },
  { name: "contractCopy", maxCount: 1 },
  { name: "educationCertificates", maxCount: 5 },
  { name: "experienceCertificates", maxCount: 5 },
  { name: "otherDocuments", maxCount: 5 },
]);

exports.ResizeEmployeeImage = asyncHandler(async (req, res, next) => {
  // console.log(req.files);

  // Process personal photo
  if (req.files.personalPhoto) {
    const file = req.files.personalPhoto[0];
    if (file.mimetype.startsWith("image")) {
      const personalPhotoName = `personalPhoto-${uuidv4()}-${Date.now()}.jpeg`;
      await sharp(file.buffer)
        .resize(100, 100)
        .toFormat("jpeg")
        .jpeg({ quality: 85 })
        .toFile(`uploads/personalPhoto/${personalPhotoName}`);
      req.body.personalPhoto = personalPhotoName;
    }
  }

  // Process contract copy
  if (req.files.contractCopy) {
    const file = req.files.contractCopy[0];
    if (file.mimetype.startsWith("image")) {
      const contractCopyName = `contractCopy-${uuidv4()}-${Date.now()}.jpeg`;
      await sharp(file.buffer)
        .resize(100, 100)
        .toFormat("jpeg")
        .jpeg({ quality: 85 })
        .toFile(`uploads/contractCopy/${contractCopyName}`);
      req.body.contractCopy = contractCopyName;
    } else if (file.mimetype === "application/pdf") {
      const contractCopyName = `contractCopy-${uuidv4()}-${Date.now()}.pdf`;
      // For PDF files, just save them without processing
      require("fs").writeFileSync(
        `uploads/contractCopy/${contractCopyName}`,
        file.buffer
      );
      req.body.contractCopy = contractCopyName;
    }
  }

  // Process education certificates
  if (req.files.educationCertificates) {
    req.body.educationCertificates = [];
    await Promise.all(
      req.files.educationCertificates.map(async (file, index) => {
        if (file.mimetype.startsWith("image")) {
          const educationCertificatesName = `educationCertificates-${uuidv4()}-${Date.now()}-${
            index + 1
          }.jpeg`;
          await sharp(file.buffer)
            .resize(2000, 2000)
            .toFormat("jpeg")
            .jpeg({ quality: 85 })
            .toFile(
              `uploads/educationCertificates/${educationCertificatesName}`
            );
          req.body.educationCertificates.push(educationCertificatesName);
        } else if (file.mimetype === "application/pdf") {
          const educationCertificatesName = `educationCertificates-${uuidv4()}-${Date.now()}-${
            index + 1
          }.pdf`;
          // For PDF files, just save them without processing
          require("fs").writeFileSync(
            `uploads/educationCertificates/${educationCertificatesName}`,
            file.buffer
          );
          req.body.educationCertificates.push(educationCertificatesName);
        }
      })
    );
  }

  // Process experience certificates
  if (req.files.experienceCertificates) {
    req.body.experienceCertificates = [];
    await Promise.all(
      req.files.experienceCertificates.map(async (file, index) => {
        if (file.mimetype.startsWith("image")) {
          const experienceCertificatesName = `experienceCertificates-${uuidv4()}-${Date.now()}-${
            index + 1
          }.jpeg`;
          await sharp(file.buffer)
            .resize(2000, 2000)
            .toFormat("jpeg")
            .jpeg({ quality: 85 })
            .toFile(
              `uploads/experienceCertificates/${experienceCertificatesName}`
            );
          req.body.experienceCertificates.push(experienceCertificatesName);
        } else if (file.mimetype === "application/pdf") {
          const experienceCertificatesName = `experienceCertificates-${uuidv4()}-${Date.now()}-${
            index + 1
          }.pdf`;
          // For PDF files, just save them without processing
          require("fs").writeFileSync(
            `uploads/experienceCertificates/${experienceCertificatesName}`,
            file.buffer
          );
          req.body.experienceCertificates.push(experienceCertificatesName);
        }
      })
    );
  }

  // Process other documents
  if (req.files.otherDocuments) {
    req.body.otherDocuments = [];
    await Promise.all(
      req.files.otherDocuments.map(async (file, index) => {
        if (file.mimetype.startsWith("image")) {
          const otherDocumentsName = `otherDocuments-${uuidv4()}-${Date.now()}-${
            index + 1
          }.jpeg`;
          await sharp(file.buffer)
            .resize(2000, 2000)
            .toFormat("jpeg")
            .jpeg({ quality: 85 })
            .toFile(`uploads/otherDocuments/${otherDocumentsName}`);
          req.body.otherDocuments.push(otherDocumentsName);
        } else if (file.mimetype === "application/pdf") {
          const otherDocumentsName = `otherDocuments-${uuidv4()}-${Date.now()}-${
            index + 1
          }.pdf`;
          // For PDF files, just save them without processing
          require("fs").writeFileSync(
            `uploads/otherDocuments/${otherDocumentsName}`,
            file.buffer
          );
          req.body.otherDocuments.push(otherDocumentsName);
        }
      })
    );
  }

  next();
});

// Create new employee
exports.createEmployee = asyncHandler(async (req, res, next) => {
  const newEmployee = await Employee.create({
    ...req.body,
    directManager: req.customer.firstName,
  });

  res.status(200).json({message:"success",data:newEmployee})
});

// Get all employees
exports.getAllEmployees = asyncHandler(async (req, res) => {
  const employees = await Employee.find().select(
    "name idNumber jobTitledepartment address email jobTitle isActive"
  ).populate('salaryPayments')

  res.status(200).json({
    status: "success",
    results: employees.length,
    data: {
      employees,
    },
  });
});

// Get employee by ID
exports.getEmployee = factory.getOne(Employee,"salaryPayments");

// Update employee
exports.updateEmployee = factory.updateOne(Employee);

// Hard delete employee (remove from database)
exports.hardDeleteEmployee = factory.deleteOne(Employee);
