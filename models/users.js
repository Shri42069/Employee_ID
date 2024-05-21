const { type } = require('express/lib/response');
const mongoose =require('mongoose');
const moment = require('moment-timezone');
const userSchema= new mongoose.Schema({
    id_no:{
        type: String,
        required:true,
    },
    name:{
        type: String,
        required:true,
    },
    email:{
        type:String,
        required :true,
    },
    phone_country_code: { // Add country code for phone number
        type: String,
        required: true,
    },
    phone:{
        type:String,
        required :true,
    },
    whatsapp:{
        type:String,
        required :true,
    },
    image:{
        type:String,
        required :true,
    },
    designation:{
        type:String,
        required :true,
    },
    created:{
        type:Date,
        required:true,
        default: () => moment().tz('Asia/Kolkata').toDate(),
    },
    linkedin:{
        type:String,
        required:true,
    },
    qrImage: {
        type: String,
        required: false,
    }

});

const adminSchema= new mongoose.Schema({
    username:{
        type: String,
        required:true,
    },

    password:{
        type:String,
        required:true,
    }

})
module.exports =mongoose.model('User',userSchema);