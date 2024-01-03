import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});
//we will create a method that will upload file to cloudinary from localpath
const uploadOnCloudinary= async (localFilePath)=>{
    try{
        //file path location and passing some options
   const response= await cloudinary.uploader.upload(localFilePath ,{
    //this resource type indicated file type we can also select image or video
       resource_type: "auto"
   })
//    console.log(`File uploaded to Cloudinary successfully` , response.url)
   fs.unlinkSync(localFilePath);
   return response
    }
    catch(error)
    {
        //this will remove the locally saved temporary file as the upload operation got failed
     fs.unlinkSync(localFilePath);
     return null;
    }

}
export  {uploadOnCloudinary}
// we can do it directly also but its not recommended to do so

// cloudinary.v2.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });