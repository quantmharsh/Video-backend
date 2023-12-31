//this file is used to create a API error format by using this everywhere we get error in 
//same formate we dont need to write catch(err) which is in asyncHandler.js it will be same for all
class ApiError extends Error{
    constructor( statusCode ,
        
        message ="Something went wrong",
        errors =[],
        statck="")
        {
            super(message)
            this.statusCode=statusCode
            this.data=null
            this.message=message
            //since we are handling api error so succes code will be false 
            //if we are dealing with apiresponse then success will be true
            this.success=false
            this.errors=errors
        }

}
export {ApiError}