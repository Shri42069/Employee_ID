const User = require('../models/users'); // Assuming you have a User model defined
const qr = require('qrcode'); // Assuming you have the qrcode library installed

exports.addUser = async (req, res) => {
  try {
    // Create a new User instance with data from the request
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      designation: req.body.designation,
      linkedin: req.body.linkedin,
      image: req.file.filename, // Assuming req.file contains the uploaded file
    });

    // Save the user to the database
    await user.save();

    // Generate QR code data with the link to a specific page
    const link = `example.com/profile/${user._id}`; // Replace example.com with your actual domain
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
          message: 'User added successfully!',
        };

        // Redirect the user to the home page
        res.redirect('/');
      }
    });
  } catch (err) {
    // If there's an error, send a JSON response with the error message
    res.json({ message: err.message, type: 'danger' });
  }
};


exports.getAllUsers = async (req, res) => {
    try {
      const users = await User.find().exec();
      res.render('index', {
        title: 'Home Page',
        users: users
      });
    } catch (err) {
      res.json({ message: err.message });
    }
  };
  
  // Get all users for employee route
  exports.getEmployees = async (req, res) => {
    try {
      const users = await User.find().exec();
      res.render('employee', {
        title: 'Employee',
        users: users
      });
    } catch (err) {
      res.json({ message: err.message });
    }
  };
  
  // Render add user form
  exports.getAddUserForm = (req, res) => {
    res.render("add_user", { title: "Add User" });
  };
  


  // Edit user

  // Get user details
 