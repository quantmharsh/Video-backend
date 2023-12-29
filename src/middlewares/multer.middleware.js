import multer from "multer";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        //cb is a callback we write it like this 
        //after that we have added location at which we will store our uploaded file
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
       //file.originalname means keep the file name same as it original name before uploading we can change it please check documentation
      cb(null, file.originalname)
    }
  })
  
 export  const upload = multer(
    { 
    storage ,
})