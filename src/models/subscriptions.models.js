import mongoose,{Schema} from 'mongoose';

const subscriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId,//one who is subscribing
        res : "User"
    },
    channel:{
        type: Schema.Types.ObjectId,//one who is being subscribed
        res : "User"
    }
},{timestamps:true});


export const Subscription = mongoose.model('Subscription',subscriptionSchema);