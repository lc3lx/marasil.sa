const multer = require("multer");

const multerOptions = () => {
  // Use memory storage to store files in memory instead of disk
  const multerStorage = multer.memoryStorage();

  // Define a filter to allow only images and PDFs
  const multerFilter = function (req, file, cd) {
    try {
      if (
        file.mimetype.startsWith("image") || // Allow images
        file.mimetype === "application/pdf" // Allow PDFs
      ) {
        cd(null, true); // Accept the file
      } else {
        cd(
          new Error("Invalid file type. Only images and PDFs are allowed."),
          false
        ); // Reject the file
      }
    } catch (error) {
      console.error(error);
      cd(error, false); // Handle unexpected errors
    }
  };

  // Create multer instance with the defined storage and filter
  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload;
};

// Export middleware for uploading a single file
exports.uploadSingleImage = (fieldName) => multerOptions().single(fieldName);
exports.UploadArrayofImages = (ArrayofFields)=>multerOptions().fields(ArrayofFields)
