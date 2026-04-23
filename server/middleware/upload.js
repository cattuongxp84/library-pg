const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'library-pdfs',
    resource_type: 'raw',  // bắt buộc với PDF
    format: 'pdf',
    public_id: (req, file) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      return `${Date.now()}-${safe}`;
    },
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Chỉ chấp nhận file PDF'), false);
};

exports.uploadPdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
}).single('pdf');
