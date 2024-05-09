const express = require("express");
const router = express.Router();
const User = require("../models/users");
const multer = require("multer");
const { type, redirect } = require("express/lib/response");
const users = require("../models/users");
const bwipjs = require("bwip-js");
const qr = require("qrcode");
const fs = require("fs");
const { error } = require("console");
const Admin = require("../models/admin");
const bcrypt = require("bcrypt");
const {
  addUser,
  getAllUsers,
  getEmployees,
  getAddUserForm,
  editUser,
  deleteUser,
  getUserDetails,
} = require("../controller/controller");
const crypto = require("crypto");
const mongoURI = "mongodb+srv://root:root@swissbakecrud.4rwkmwc.mongodb.net/crud?retryWrites=true&w=majority&appName=swissbakecrud";
const mongoose = require("mongoose");
const { GridFSBucketReadStream } = require("mongoose");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient
const ObjectId = mongodb.ObjectId

//image upload
// const storage=multer.diskStorage({
//     destination:function(req, file, cb){
//         cb(null,"./uploads" );
//     },
//     filename:function(req, file, cb){
//         cb(null, file.fieldname+ "_"+ Date.now+"_"+file.originalname);
//     },
// });

// const upload = multer({
//     storage: storage,
// }).single("image");

// // MongoDB connection
// const url = mongoURI;
// const connect= mongoose.createConnection(url,{
//   useNewUrlParser:true,
//   useUnifiedTopology:true
// });

// // init gfs
// let gfs;

// connect.once("open", () => {
//   console.log("MongoDB database connection established successfully");
//   gfs = new mongoose.mongo.GridFSBucket(connect.db, {
//     bucketName: "uploads",
//   });
// });



// // Storage
// const storage = new GridFsStorage({
//   url:mongoURI,
//   file: (req, file) => {
//     return new Promise((resolve, reject) => {
//       crypto.randomBytes(16, (err, buf) => {
//         if (err) {
//           return reject(err);
//         }
//         const filename = buf.toString("hex") + path.extname(file.originalname);
//         const fileInfo = {
//           filename: filename,
//           bucketName: "uploads",
//         };
//         resolve(fileInfo);
//       });
//     });
//   },
// });

// const upload = multer({ storage})



// Connect to MongoDB
const connectDB = async () => {
  try {
      const client = await mongoClient.connect("mongodb+srv://root:root@swissbakecrud.4rwkmwc.mongodb.net/?retryWrites=true&w=majority&appName=swissbakecrud", {
        useNewUrlParser: true
      });
      return client.db("mongodb_gridfs");
  } catch (err) {
      console.error("Failed to connect to MongoDB:", err);
  }
};

// Image upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
      cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage }).single("image");

router.get('/images/:filename', async (req, res) => {
  const filename = req.params.filename;
  try {
      const db = await connectDB(); // Establish MongoDB connection
      const bucket = new mongodb.GridFSBucket(db);
      const downloadStream = bucket.openDownloadStreamByName(filename);
      
      downloadStream.on('error', (error) => {
        console.error('Error retrieving image:', error);
        res.status(404).send('Image not found'); // Send a 404 status if file not found
      });

      downloadStream.pipe(res); // Pipe image data to response
  } catch (err) {
      console.error('Error retrieving image:', err);
      res.status(500).send('Internal Server Error');
  }
})


// Image upload route
router.post("/add", upload, async (req, res) => {
  try {
    const db = await connectDB();
    const bucket = new mongodb.GridFSBucket(db);

    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = new Date().getTime() + "_" + file.originalname;

    // Check if the file path already exists
    const existingFile = await db.collection('fs.files').findOne({ filename: filePath });
    if (existingFile) {
        // If file path already exists, generate a new unique file path
        filePath = new Date().getTime() + "_" + file.originalname;
    }

    fs.createReadStream(file.path)
        .pipe(bucket.openUploadStream(filePath, {
            chunkSizeBytes: 1048576,
            metadata: {
                name: file.originalname,
                size: file.size,
                type: file.mimetype
            }
        }))
        .on("finish", async () => {
            // Save user to the database with image filename
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                designation: req.body.designation,
                linkedin: req.body.linkedin,
                image: filePath
            });
            await user.save();
            res.redirect('/');
        });
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/update/:id', upload, async (req, res) => {
  const id = req.params.id;
  let newImage = '';

  try {
      if (req.file) {
          // If a new image is uploaded, store it in GridFS
          const db = await connectDB();
          const bucket = new mongodb.GridFSBucket(db);

          const file = req.file;
          const filePath = new Date().getTime() + "_" + file.originalname;

          // Upload new image to GridFS
          await new Promise((resolve, reject) => {
              fs.createReadStream(file.path)
                  .pipe(bucket.openUploadStream(filePath, {
                      chunkSizeBytes: 1048576,
                      metadata: {
                          name: file.originalname,
                          size: file.size,
                          type: file.mimetype
                      }
                  }))
                  .on("finish", resolve)
                  .on("error", reject);
          });

          newImage = filePath;

          // Remove old image from GridFS if it exists
          if (req.body.old_image) {
              const oldImageId = req.body.old_image; // Use the ID directly
              const existingFile = await bucket.find({ _id: oldImageId }).toArray();
              if (existingFile.length > 0) {
                  await bucket.delete(oldImageId);
              } else {
                  console.error("File not found:", oldImageId);
              }
          }
      } else {
          // If no new image is uploaded, keep the existing image
          newImage = req.body.old_image;
      }

      // Update user document with new image path
      const result = await User.findByIdAndUpdate(id, {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          image: newImage,
          designation: req.body.designation,
          linkedin: req.body.linkedin,
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
      console.error("Error updating user:", err);
      res.status(500).json({ message: err.message, type: 'danger' });
  }
});




//const storage = new GridFsStorage({ url : mongoURI})

// MongoDB connection event listeners
// connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
// connection.once('open', () => {
//     console.log('MongoDB database connection established successfully');

//     // Multer GridFS storage configuration
//     const storage = new GridFsStorage({
//         url: mongoURI, // Your MongoDB connection URI
//         options: { useNewUrlParser: true, useUnifiedTopology: true },
//         file: (req, file) => {
//             return {
//                 bucketName: 'uploads', // Name of your GridFS bucket
//                 filename: file.originalname, // Use the original file name
//             };
//         }
//     });
//     const upload = multer({ storage });

//     // Image upload route
//     router.post('/add', upload.single('image'), async (req, res) => {
//         try {
//             // Create a new user instance
//             const user = new User({
//                 name: req.body.name,
//                 email: req.body.email,
//                 phone: req.body.phone,
//                 designation: req.body.designation,
//                 image: req.file.filename, // Save the filename of the uploaded image
//             });

//             // Save the user to the database
//             await user.save();

//             // If saved successfully, set a success message in the session
//             req.session.message = {
//                 type: 'success',
//                 message: 'User added successfully!'
//             };

//             // Redirect the user to the home page
//             res.redirect('/');
//         } catch (err) {
//             // If there's an error, send a JSON response with the error message
//             console.error(err);
//             res.status(500).json({ message: err.message, type: 'danger' });
//         }
//     });

//     // Other routes...
//    

// });

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

//Getting the user information from database
router.get("/", isAuthenticated, getAllUsers);

// Get all users for employee route
router.get("/employee", getEmployees);

// Render add user form
router.get("/add", isAuthenticated, getAddUserForm);

router.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

router.get("/hello", (req, res) => {
  res.render("hello", { title: "Login" });
});

router.get("/edit/:id", (req, res) => {
  let id = req.params.id;
  User.findById(id)
    .then((user) => {
      if (!user) {
        return res.redirect("/");
      }
      res.render("edit_users", {
        title: "Edit User",
        user: user,
      });
    })
    .catch((err) => {
      console.error(err);
      res.redirect("/");
    });
});

//Edit User

//Delete User
router.get("/delete/:id", async (req, res) => {
  try {
    let id = req.params.id;
    const result = await User.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    if (result.image !== "") {
      try {
        await new Promise((resolve, reject) => {
          fs.unlink("./uploads/" + result.image, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (err) {
        console.error(err);
        // Handle unlinking error
      }
    }

    req.session.message = {
      type: "info",
      message: "User deleted successfully!",
    };
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

//user details on another page and routing with their name in the link

// Display user details route
router.get("/userDetails/:id", async (req, res) => {
  const userId = req.params.id; // Get the user ID from the URL parameter

  try {
    // Fetch user details from the database based on userId
    const userDetails = await User.findById(userId);

    if (!userDetails) {
      // If no user is found, render an error page or send an appropriate response
      return res.status(404).render("error", { message: "User not found" });
    }

    // Render the 'userDetails' view and pass the user details to it
    res.render("userDetails", { user: userDetails, title: "User Details" });
  } catch (err) {
    // Handle any errors that occurred during the database query
    console.error("Error fetching user details:", err);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
});

//post login authentication
//Handle login form submission
router.post("/login", async (req, res) => {
  console.log("Reached /login route");

  const { username, password } = req.body;

  try {
    // Find admin by username
    const admin = await Admin.findOne({ username });

    if (!admin) {
      console.log("Admin not found");
      return res.render("login", {
        title: "Login",
        error: "Invalid username or password",
      });
    }

    // Compare hashed passwords

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      console.log("Invalid password");
      return res.render("login", {
        title: "Login",
        error: "Invalid username or password",
      });
    }

    // If match, set session user and redirect to homepage
    req.session.user = { username: admin.username };
    console.log("Login successful");
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.redirect("/login");
  }
}

module.exports = router;
