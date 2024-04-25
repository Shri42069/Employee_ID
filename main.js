//imports
require('dotenv').config();
const express= require('express');
const mongoose=require('mongoose');
const session = require('express-session');


const app=express();
const PORT = process.env.PORT || 4000;

//database connection

mongoose.connect(process.env.DB_URI);
const db=mongoose.connection;
db.on('error',(error)=>console.log(error));
db.once('open',()=>console.log("Databse connected successfully"));

//middleware
app.use(express.urlencoded({ extended: false}));
app.use(express.json());

app.use(
    session({
        secret: "my secret key",
        saveUninitialized: true,
        resave: false,
    })
);


app.use(express.static('uploads'));
app.use("/views/layout/css",express.static('views/layout/css'));
app.use("/images",express.static('images'));
 





app.use((req,res,next)=>{
    res.locals.message =req.session.message;
    delete req.session.message;
    next();
})

//template engine
app.set("view engine", "ejs");


//route prefix
app.use("", require('./routes/routes'));



app.listen(PORT,()=>{
    console.log(`Server is listening at http://localhost:${PORT}`);
})