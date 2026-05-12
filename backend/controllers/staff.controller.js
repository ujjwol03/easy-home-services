const bcrypt = require('bcrypt'); // for password hashing
const Staff = require('../models/staff.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const fs = require('fs');
const path = require('path');

// Default password for all staff
const defaultPassword = 'Staff@123';

// Add Staff
exports.addStaff = async (req, res) => {
  try {
    const { name, address, phone, categoryName} = req.body;

    // Validate name and address
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required and cannot be empty.' });
    }

    if (!address || address.trim() === '') {
      return res.status(400).json({ error: 'Address is required and cannot be empty.' });
    }


    // Validate phone number format
    const phoneRegex = /^(97|98)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number. It must start with 97 or 98 and be 10 digits long.' });
    }

    // Check if the phone already exists in Staff or User
    const phoneExistsInStaff = await Staff.findOne({ phone });
    const phoneExistsInUser = await User.findOne({ phoneNumber: phone });

    if (phoneExistsInStaff || phoneExistsInUser) {
      return res.status(400).json({ error: 'Phone number already in use' });
    }

    // Check if the category name exists in a case-insensitive manner
    const existingCategory = await Category.findOne({ name: new RegExp(`^${categoryName}$`, 'i') });
    if (!existingCategory) {
      return res.status(400).json({ error: 'Invalid category name' });
    }

    // Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Check if an image was uploaded
    const imageFile = req.files && req.files.image ? req.files.image[0] : null;
    if (!imageFile) {
      return res.status(400).json({ error: 'Image is required.' });
    }

    // Validate image format (JPEG, JPG, PNG)
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(imageFile.originalname).toLowerCase());
    const mimetype = fileTypes.test(imageFile.mimetype);

    if (!extname || !mimetype) {
      return res.status(400).json({ error: 'Only JPEG, JPG, or PNG images are allowed.' });
    }

    // Create a new staff object
    const staff = new Staff({
      name,
      address,
      phone,
      password: hashedPassword,
      role: 'staff',
      image: imageFile.path,
      categoryId: existingCategory._id,
      category: existingCategory.name,
    });

    await staff.save();
    res.status(201).json({ message: 'Staff added successfully', staff });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Freelance Staff Registration
exports.registerStaff = async (req, res) => {
  try {
    const { name, email, address, phone, categoryName } = req.body;

    // Validate inputs
    if (!name || !email || !address || !phone || !categoryName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const phoneRegex = /^(97|98)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Check unique constraints across Staff and User
    const phoneExistsInUser = await User.findOne({ phoneNumber: phone });
    const emailExistsInUser = await User.findOne({ email });
    const phoneExistsInStaff = await Staff.findOne({ phone });
    const emailExistsInStaff = await Staff.findOne({ email });

    if (phoneExistsInUser || phoneExistsInStaff) return res.status(400).json({ error: 'Phone number already in use' });
    if (emailExistsInUser || emailExistsInStaff) return res.status(400).json({ error: 'Email already in use' });

    // Check for category
    const existingCategory = await Category.findOne({ name: new RegExp(`^${categoryName}$`, 'i') });
    if (!existingCategory) return res.status(400).json({ error: 'Invalid category name' });

    // Validate image format (Certificate)
    const imageFile = req.files && req.files.image ? req.files.image[0] : null;
    if (!imageFile) return res.status(400).json({ error: 'Certificate proof image is required.' });
    
    const fileTypes = /jpeg|jpg|png/;
    if (!fileTypes.test(path.extname(imageFile.originalname).toLowerCase()) || !fileTypes.test(imageFile.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, JPG, or PNG images are allowed.' });
    }

    // Use password from request or default
    const passwordToUse = req.body.password || defaultPassword;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordToUse, salt);

    // Save staff (defaults isApproved to false)
    const staff = new Staff({
      name,
      email,
      address,
      phone,
      password: hashedPassword,
      role: 'staff',
      image: imageFile.path,
      categoryId: existingCategory._id,
      category: existingCategory.name,
      isApproved: false
    });

    await staff.save();
    res.status(201).json({ message: 'Registration submitted successfully. Pending Admin approval.', staff });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin Approve/Decline Staff
const emailService = require('../emailService');

exports.approveStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body; // boolean

    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    if (approve === true) {
      staff.isApproved = true;
      await staff.save();
      console.log(`[DEBUG] Staff ${staff.name} approved. Attempting to send email to ${staff.email}`);
      // Send approval notification email
      try {
        await emailService.sendStaffApprovalEmail(staff.email, staff.name);
        console.log(`[DEBUG] Email sent successfully to ${staff.email}`);
      } catch (err) {
        console.error(`[DEBUG] Failed to send email to ${staff.email}:`, err.message);
      }
      return res.status(200).json({ message: 'Staff approved successfully', staff });
    } else {
      // If Admin declines (deletes request entirely)
      if (staff.image && fs.existsSync(path.join(__dirname, '../', staff.image))) {
        fs.unlinkSync(path.join(__dirname, '../', staff.image));
      }
      await Staff.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Staff application declined and removed.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};


// Update Staff
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, categoryName} = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Check if phone is being updated
    if (phone && phone !== staff.phone) {
      const phoneRegex = /^(97|98)\d{8}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number. It must start with 97 or 98 and be 10 digits long.' });
      }

      // Check if the phone number already exists (not the same as the current phone)
      const phoneExistsInStaff = await Staff.findOne({ phone });
      const phoneExistsInUser = await User.findOne({ phoneNumber: phone });

      if (phoneExistsInStaff || phoneExistsInUser) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }

      staff.phone = phone; // Update phone number if valid and unique
    }

    // Update the name if provided and different from the existing name
    if (name && name !== staff.name) {
      staff.name = name;
    }

    // Log the category name received in the request
    console.log('Category Name received for update:', categoryName);

    // Validate and update category if provided
    if (categoryName && categoryName !== staff.category) {
      const existingCategory = await Category.findOne({ name: new RegExp(`^${categoryName}$`, 'i') });
      if (!existingCategory) {
        return res.status(400).json({ error: 'Invalid category name' });
      }
      staff.categoryId = existingCategory._id;
      staff.category = existingCategory.name;
    }

    // Update other fields like address
    if (address) staff.address = address;

    // Handle Certificate Image update (field: image)
    const imageFile = req.files && req.files.image ? req.files.image[0] : null;
    if (imageFile) {
      const fileTypes = /jpeg|jpg|png/;
      const extname = fileTypes.test(path.extname(imageFile.originalname).toLowerCase());
      const mimetype = fileTypes.test(imageFile.mimetype);

      if (extname && mimetype) {
        if (staff.image) {
          const oldPath = path.join(__dirname, '../', staff.image);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        staff.image = imageFile.path;
      }
    }

    // Handle Profile Picture update (field: profileImage)
    const profileImageFile = req.files && req.files.profileImage ? req.files.profileImage[0] : null;
    if (profileImageFile) {
      const fileTypes = /jpeg|jpg|png/;
      const extname = fileTypes.test(path.extname(profileImageFile.originalname).toLowerCase());
      const mimetype = fileTypes.test(profileImageFile.mimetype);

      if (extname && mimetype) {
        if (staff.profileImage) {
          const oldPath = path.join(__dirname, '../', staff.profileImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        staff.profileImage = profileImageFile.path;
      }
    }

    await staff.save();
    res.status(200).json({ message: 'Staff updated successfully', staff });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateStaffPassword = async (req, res) => {
  try {
    const { staffId, phone, oldPassword, newPassword, confirmPassword } = req.body;

    if (!staffId || !phone || !oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required: staffId, phone, oldPassword, newPassword, confirmPassword.' });
    }

    // Password validation
    const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long and contain at least one special character.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }

    const staff = await Staff.findOne({ _id: staffId, phone });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found with provided ID and phone.' });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, staff.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Old password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    staff.password = hashedPassword;
    await staff.save();

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reset Staff Password to Default
exports.resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const defaultPassword = 'Staff@123';

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    staff.password = hashedPassword;
    await staff.save();

    res.status(200).json({ message: 'Password reset to default successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete Staff
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Delete image file from server
    const imagePath = staff.image;
    if (imagePath) {
      const fullImagePath = path.join(__dirname, '../', imagePath);
      if (fs.existsSync(fullImagePath)) {
        fs.unlinkSync(fullImagePath); // Delete image file
      }
    }

    await Staff.findByIdAndDelete(id);
    res.status(200).json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all Staff
exports.getAllStaff = async (req, res) => {
  try {
      const staff = await Staff.find().populate('categoryId', 'name');
      res.status(200).json(staff);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
  }
};

// Get Single Staff by ID
exports.getStaffById = async (req, res) => {
  try {
      const { id } = req.params;
      const staff = await Staff.findById(id).populate('categoryId', 'name');
      if (!staff) {
          return res.status(404).json({ error: 'Staff not found' });
      }
      res.status(200).json(staff);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
  }
};
