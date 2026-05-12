const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const staffSchema = new Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'staff',
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      match: /(?=.*[!@#$%^&*(),.?":{}|<>])/,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '', // Optional profile picture
    },
  },
  { collection: 'Staff' }
);

module.exports = mongoose.model('Staff', staffSchema);