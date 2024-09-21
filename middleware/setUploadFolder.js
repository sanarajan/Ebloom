const setUploadFolder = (folderName) => {
  return (req, res, next) => {
      console.log(`Setting upload folder to: uploads/${folderName}/`);
      req.uploadFolder = `uploads/${folderName}/`;
      next();
  };
};

module.exports = setUploadFolder;
