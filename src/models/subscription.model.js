import mongoose ,{Schema} from "mongoose";
const subscriptionSchema= new Schema(
    {
        subscriber:{  //one who is subscribing our channel (for ex: us bro us)
            type:Schema.Types.ObjectId,
            ref:"User"
        } ,
        channel:{   //one whos channel is getting subscribed by subscriber(for ex: flying beast)
            type:Schema.Types.ObjectId,
            ref:"User"
        }
    },
    {
        timestamps:true
    }
)
export const Subscription= mongoose.model("Subscription" ,subscriptionSchema)