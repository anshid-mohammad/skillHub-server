const User = require("../models/user");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwtUtils");
const { s3, upload, randomFileName, sharp } = require('../utils/s3Clinet');





const userSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExisting = await User.findOne({ email });
    if (userExisting) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "An unexpected error occurred" });
  }
};

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.status(200).json({ message: "Login successful", userId:user._id ,username:user.name,userRole:user.role,token});

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "An unexpected error occurred" });
  }
};
const getAllUser = async (req, res) => {
    try {
      const user = await User.find();
      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({ message: 'Failed to fetch students' });
    }
  };
  
  const addUserImage = async (req, res) => {
    const file = req.file;
  
    if (!file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }
  
    try {
      // Process image using Sharp
      const buffer = await sharp(file.buffer)
        .resize({ height: 1080, width: 720, fit: 'contain' }) // Resize image
        .jpeg({ quality: 70 }) // Convert to JPEG with 70% quality
        .toBuffer();
  
      // Generate unique file name
      const uniqueFileName = `${Date.now()}_${file.originalname}`;
  
      // S3 upload parameters
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: file.mimetype,
      };
  
      // Upload to S3
      const data = await s3.upload(params).promise();
      const imageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
  
      // Find user and update the photo field
      const updatedUser = await User.findByIdAndUpdate(
        req.body.userId, // Make sure this ID is being sent in the request
        { $set: { photo: imageUrl } }, // Set the new photo URL
        { new: true } // Return updated user document
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({ message: 'User image updated successfully!', user: updatedUser });
    } catch (error) {
      console.error('Error updating user image:', error);
      res.status(500).json({ message: 'Failed to update user image', error: error.message });
    }
  };
  const updateProfile = async (req, res) => {
    const { userId, name, address, phoneNumber,bio,nation,gender,dob } = req.body;
  
    if (!userId || !name || !address || !phoneNumber || !bio) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
  
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, address, phoneNumber ,bio,nation,dob,gender},
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({ message: 'Profile updated successfully!', user: updatedUser });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
  };

  const updateStudentId = async (req, res) => {
    try {
      const { studentId } = req.params;
      const { teacherId } = req.body;
  console.log(studentId)
      // Find student by ID
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
  
      // Assign teacherId to student and update
      student.teacherId = teacherId;
      await student.save();
  
      res.json({ success: true, message: 'Teacher assigned successfully' });
    } catch (error) {
      console.error('Error assigning teacher:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  
  };
    const getuserById = async (req, res) => {
      try {
        const { id } = req.params; 
        const user = await User.findById(id);
    
        if (!user) {
          return res.status(404).json({ message: "Course not found" });
        }
    
        res.status(200).json(user);
      } catch (error) {
        console.error("Error fetching course:", error.message);
    
        res.status(500).json({
          message: "Error fetching course",
          error: error.message,
        });
      }
    };
  
module.exports = { userSignup, userLogin,getAllUser ,addUserImage,updateProfile,updateStudentId,getuserById};
