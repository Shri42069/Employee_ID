const { type } = require('express/lib/response');
const mongoose =require('mongoose');
const moment = require('moment-timezone');


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
module.exports =mongoose.model('Admin',adminSchema);