const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname).toLowerCase()),
});
const uploadImage = multer({ storage });
module.exports = { uploadImage };