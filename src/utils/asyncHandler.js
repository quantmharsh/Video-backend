
//it is a high order function . ho function is a function which takes function as a parameter 
//and also return function as a parameter
//we are doing this because it will become wrapper function and it will make our task easy
// const asyncHandler =()={}
//using try catch

// const asyncHandler  =(fn)=>  async(req ,res ,next)=>{
//  try{
//        await fn(req ,res ,next)
//  }
//  catch(error)
//  {
//     res.status(err.code||500).json({
//         success:false,
//         message:err.message
//     })
//  }
// }

//using promises>
const asyncHandler=(requesthandler) =>{(req ,res, next)=>{
    Promise.resolve(requesthandler(req ,res, next)).catch((err)=>next(err));


}}