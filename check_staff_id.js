const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const Staff = require('./backend/models/staff.model');

async function checkStaff() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const staffId = '66ba2d28f2963dd855c1';
    const staff = await Staff.findById(staffId);
    
    if (staff) {
      console.log('Staff found:', staff.name, 'isApproved:', staff.isApproved);
    } else {
      console.log('Staff NOT found with ID:', staffId);
    }

    // List some staff IDs
    const allStaff = await Staff.find().limit(5);
    console.log('First 5 Staff IDs:');
    allStaff.forEach(s => console.log(s._id.toString()));

    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkStaff();
