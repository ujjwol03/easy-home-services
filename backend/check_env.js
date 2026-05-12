require('dotenv').config();


const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

if (!uri) {
    console.log("MONGO_URI is NOT set.");
} else {
    console.log("Attempting to connect...");
    mongoose.connect(uri)
        .then(() => {
            console.log("Connection SUCCESSFUL!");
            process.exit(0);
        })
        .catch(err => {
            console.error("Connection FAILED:");
            console.error(err);
            process.exit(1);
        });
}
