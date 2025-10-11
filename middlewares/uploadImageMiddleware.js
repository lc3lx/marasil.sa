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
  const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 10, // Maximum 10 files
    },
  });

  return upload;
};

// Export middleware for uploading a single file
exports.uploadSingleImage = (fieldName) => multerOptions().single(fieldName);
exports.UploadArrayofImages = (ArrayofFields) => {
  console.log("🔧 UploadArrayofImages called with fields:", ArrayofFields);
  const upload = multerOptions().fields(ArrayofFields);
  return (req, res, next) => {
    console.log("🔧 Multer middleware called");
    console.log("🔧 Content-Type:", req.headers["content-type"]);
    console.log("🔧 Content-Length:", req.headers["content-length"]);
    upload(req, res, (err) => {
      if (err) {
        console.error("❌ Multer error:", err);
        console.error("❌ Multer error message:", err.message);
        console.error("❌ Multer error code:", err.code);
        return next(err);
      }
      console.log("✅ Multer completed");
      console.log("🔧 req.files:", req.files);
      console.log("🔧 req.files type:", typeof req.files);
      if (req.files) {
        console.log("🔧 req.files keys:", Object.keys(req.files));
        if (req.files.profileImage) {
          console.log(
            "🔧 profileImage array length:",
            req.files.profileImage.length
          );
          console.log(
            "🔧 profileImage[0] exists:",
            !!req.files.profileImage[0]
          );
        }
      }
      next();
    });
  };
};
