const express= require("express");
const router = express.Router();
const User=require('../models/users');
const multer=require('multer');
const { type, redirect } = require("express/lib/response");
const users = require("../models/users");
const bwipjs = require('bwip-js');
const qr = require('qrcode');
const fs= require('fs');
const { error } = require("console");



//image upload
var storage=multer.diskStorage({
    destination:function(req, file, cb){
        cb(null,"./uploads" );
    },
    filename:function(req, file, cb){
        cb(null, file.fieldname+ "_"+ Date.now+"_"+file.originalname);
    },
});

var upload = multer({
    storage: storage,
}).single("image");

//Insert a user into database route 
// router.post("/add", upload, async (req, res) => {
//     try {
//         // Create a new User instance with data from the request
//         const user = new User({
//             name: req.body.name,
//             email: req.body.email,
//             phone: req.body.phone,
//             designation: req.body.designation,
//             image: req.file.filename, // Assuming req.file contains the uploaded file
//         });

//         // Save the user to the database
//         await user.save();

//         // If saved successfully, set a success message in the session
//         req.session.message = {
//             type: 'success',
//             message: 'User added successfully !'
//         };
//         // Redirect the user to the home page
//         res.redirect('/');
//     } catch (err) {
//         // If there's an error, send a JSON response with the error message
//         res.json({ message: err.message, type: 'danger' });
//     }
// });



router.post("/add", upload, async (req, res) => {
    try {
        // Create a new User instance with data from the request
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            designation: req.body.designation,
            image: req.file.filename, // Assuming req.file contains the uploaded file
        });

        // Save the user to the database
        await user.save();

        // Generate QR code data with the link to a specific page
        const link = ``; // Replace example.com with your actual domain
        const qrData = `User Profile: ${link}`;

        // Generate QR code image using qrcode library
        qr.toDataURL(qrData, (err, qrImage) => {
            if (err) {
                console.error('QR code generation error:', err);
                // Handle error...
            } else {
                // Add qrImage property to user object
                user.qrImage = qrImage;
                // Save the updated user with qrImage to the database
                user.save();
                // If saved successfully, set a success message in the session
                req.session.message = {
                    type: 'success',
                    message: 'User added successfully !'
                };
                // Redirect the user to the home page
                res.redirect('/');
            }
        });
    } catch (err) {
        // If there's an error, send a JSON response with the error message
        res.json({ message: err.message, type: 'danger' });
    }
});







//Getting the user information from database
router.get("/", isAuthenticated, async (req, res) => {
    try {
        // Find all users in the database
        const users = await User.find().exec();
        
        // Render the "index" view with the users data
        res.render('index', {
            title: 'Home Page',
            users: users
        });
    } catch (err) {
        // If there's an error, send a JSON response with the error message
        res.json({ message: err.message });
    }
});

// Get all users for employee route
router.get("/employee", async (req, res) => {
    try {
        // Find all users in the database
        const users = await User.find().exec();
        
        // Render the "employee" view with the users data
        res.render('employee', {
            title: 'Employee',
            users: users
        });
    } catch (err) {
        // If there's an error, send a JSON response with the error message
        res.json({ message: err.message });
    }
});

// Render add user form
router.get('/add', isAuthenticated, (req, res) => {
    res.render("add_user", { title: "Add User" });
});

router.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

router.get('/hello', (req, res) => {
    res.render('hello', { title: 'Login' });
});




router.get('/edit/:id', (req, res) => {
    let id = req.params.id;
    User.findById(id)
        .then(user => {
            if (!user) {
                return res.redirect('/');
            }
            res.render('edit_users', {
                title: 'Edit User',
                user: user,
            });
        })
        .catch(err => {
            console.error(err);
            res.redirect('/');
        });
});


//Edit User 
router.post('/update/:id', upload, async (req, res) => {
    let id = req.params.id;
    let new_image = '';

    if (req.file) {
        new_image = req.file.filename;
        try {
            await fs.unlink("/uploads/" + req.body.old_image);
        } catch (err) {
            console.error(err);
        }
    } else {
        new_image = req.body.old_image;
    }

    try {
        const result = await User.findByIdAndUpdate(id, {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            image: new_image,
            designation: req.body.designation
        });

        if (!result) {
            return res.status(404).json({ message: "User not found", type: 'danger' });
        }

        req.session.message = {
            type: 'success',
            message: 'User updated successfully!'
        };
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message, type: 'danger' });
    }
});

//Delete User
router.get('/delete/:id', async (req, res) => {
    try {
        let id = req.params.id;
        const result = await User.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        if (result.image !== '') {
            try {
                await fs.unlink('./uploads/' + result.image);
            } catch (err) {
                console.error(err);
                // Handle unlinking error
            }
        }

        req.session.message = {
            type: 'info',
            message: "User deleted successfully!"
        };
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});



//user details on another page and routing with their name in the link

// Display user details route
router.get('/userDetails/:id', async (req, res) => {
    const userId = req.params.id; // Get the user ID from the URL parameter
  
    try {
      // Fetch user details from the database based on userId
      const userDetails = await User.findById(userId);
  
      if (!userDetails) {
        // If no user is found, render an error page or send an appropriate response
        return res.status(404).render('error', { message: 'User not found' });
      }
  
      // Render the 'userDetails' view and pass the user details to it
      res.render('userDetails', { user: userDetails, title: 'User Details' });
    } catch (err) {
      // Handle any errors that occurred during the database query
      console.error('Error fetching user details:', err);
      res.status(500).render('error', { message: 'Internal Server Error' });
    }
  });






//post login authentication
//Handle login form submission
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check if username and password match
    if (username === 'admin' && password === 'swissbake') {
        // If match, set session user and redirect to homepage
        req.session.user = { username: username };
        res.redirect('/');
    } 
            else {
        // If not match, render login page with error message
        res.render('login', { title: 'Login', error: 'Invalid username or password' });
    }
});







// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login');
    }
}

module.exports=router;