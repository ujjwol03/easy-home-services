const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Service = require('./models/service.model');
const Category = require('./models/category.model');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            const serviceCount = await Service.countDocuments();
            console.log(`Total Services: ${serviceCount}`);

            const categoryCount = await Category.countDocuments();
            console.log(`Total Categories: ${categoryCount}`);

            if (serviceCount > 0) {
                const services = await Service.find().limit(2);
                console.log('Sample Services:', JSON.stringify(services, null, 2));
            }
        } catch (err) {
            console.error('Error counting documents:', err);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => {
        console.error('Connection error:', err);
    });
