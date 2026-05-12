const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Service = require('./models/service.model');
const Category = require('./models/category.model');
const User = require('./models/user.model');
const Staff = require('./models/staff.model');
const Booking = require('./models/booking.model');
const Payment = require('./models/payment.model');

dotenv.config();

const categories = [
    { name: 'Plumbing', image: 'uploads/categories/placeholder.jpg' },
    { name: 'Electrical', image: 'uploads/categories/placeholder.jpg' },
    { name: 'Cleaning', image: 'uploads/categories/placeholder.jpg' },
    { name: 'Painting', image: 'uploads/categories/placeholder.jpg' }
];

const servicesData = [
    {
        name: 'Pipe Leaking Fix',
        category: 'Plumbing',
        price: 1500,
        description: 'Fixing all kinds of pipe leaks professionally.',
        image: 'uploads/services/placeholder.jpg'
    },
    {
        name: 'Full Home Wiring',
        category: 'Electrical',
        price: 5000,
        description: 'Complete home wiring services by certified electricians.',
        image: 'uploads/services/placeholder.jpg'
    },
    {
        name: 'Deep Cleaning',
        category: 'Cleaning',
        price: 3000,
        description: 'Deep cleaning of your entire home including corners.',
        image: 'uploads/services/placeholder.jpg'
    },
    {
        name: 'Wall Painting',
        category: 'Painting',
        price: 8000,
        description: 'Professional wall painting with high quality paints.',
        image: 'uploads/services/placeholder.jpg'
    }
];

const usersData = [
    { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: 'password123', role: 'admin', phoneNumber: '9800000000', address: 'Baneshwor, Kathmandu' },
    { firstName: 'Ujjwal', lastName: 'Thapa', email: 'ujjwal@example.com', password: 'password123', role: 'user', phoneNumber: '9800000001', address: 'Koteshwor, Kathmandu' },
    { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', password: 'password123', role: 'user', phoneNumber: '9800000002', address: 'Lagankhel, Lalitpur' },
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', password: 'password123', role: 'user', phoneNumber: '9800000003', address: 'Suryabinayak, Bhaktapur' },
    { firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com', password: 'password123', role: 'user', phoneNumber: '9800000004', address: 'Thamel, Kathmandu' }
];

const staffData = [
    { name: 'Mike Plumber', email: 'mike@example.com', phone: '9811111111', role: 'Staff', specialty: 'Plumbing', status: 'Active', image: 'uploads/staff/placeholder.jpg' },
    { name: 'Sarah Spark', email: 'sarah@example.com', phone: '9811111112', role: 'Staff', specialty: 'Electrical', status: 'Active', image: 'uploads/staff/placeholder.jpg' },
    { name: 'Clean Co', email: 'clean@example.com', phone: '9811111113', role: 'Staff', specialty: 'Cleaning', status: 'Active', image: 'uploads/staff/placeholder.jpg' }
];

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            // Clear existing data
            await Category.deleteMany({});
            await Service.deleteMany({});
            await User.deleteMany({});
            await Staff.deleteMany({});
            await Booking.deleteMany({});
            await Payment.deleteMany({});
            console.log('Cleared existing data');

            // Insert Categories
            const createdCategories = await Category.insertMany(categories);
            console.log('Inserted categories');

            // Insert Services
            const createdServices = await Service.insertMany(servicesData);
            console.log('Inserted services');

            // Insert Users (Hash passwords)
            const hashedUsers = await Promise.all(usersData.map(async (user) => {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                return { ...user, password: hashedPassword };
            }));
            const createdUsers = await User.insertMany(hashedUsers);
            console.log('Inserted users');

            // Insert Staff
            // We need to map staff to categories. Let's assign them round-robin or specific mapping.
            const hashedPassword = await bcrypt.hash('password123', 10);

            const staffWithIds = staffData.map((staff, index) => {
                // Find category based on staff specialty/category name
                const category = createdCategories.find(c => c.name === staff.specialty || c.name === 'Plumbing'); // Fallback
                return {
                    ...staff,
                    categoryId: category ? category._id : createdCategories[0]._id, // Required field
                    category: category ? category.name : createdCategories[0].name,
                    address: 'Kathmandu, Nepal', // Required field
                    password: hashedPassword // Required field
                };
            });

            const createdStaff = await Staff.insertMany(staffWithIds);
            console.log('Inserted staff');

            // Insert Bookings
            const bookings = [];
            const user = createdUsers.find(u => u.role === 'user'); // Use first user for bookings
            const staffMember = createdStaff[0];

            for (let i = 0; i < 10; i++) {
                const service = createdServices[i % createdServices.length];
                bookings.push({
                    user: user._id,
                    userName: `${user.firstName} ${user.lastName}`, // Required
                    userEmail: user.email, // Required
                    service: service._id,
                    serviceName: service.name,
                    // This might be redundant if we have service reference but model has it? booking model doesn't explicitly have category field but let's check. 
                    // Wait, booking model does NOT have 'category' field in previous view_file output, but it DOES have 'staffCategory'.
                    // Let's re-read booking.model.js content from Step 155.
                    // properties: service, staff, staffCategory, staffName, user, serviceName, userName, userEmail, price, date, timeSlot, status...
                    staff: staffMember._id,
                    staffName: staffMember.name,
                    staffCategory: staffMember.category,
                    price: service.price,
                    date: '2023-05-24', // Use a static date or generate one
                    timeSlot: '10:00 AM',
                    status: 'completed', // 'pending', 'inprogress', 'cancelled', 'completed'
                    paymentStatus: i % 2 === 0 ? 'completed' : 'initiated'
                });
            }
            const createdBookings = await Booking.insertMany(bookings);
            console.log('Inserted bookings');

            // Insert Payments
            const payments = createdBookings.map((booking, index) => {
                return {
                    service: booking.service,
                    user: booking.user,
                    staff: booking.staff, // Payment model requires staff
                    userName: booking.userName,
                    serviceName: booking.serviceName,
                    amount: booking.price,
                    date: booking.date,
                    timeSlot: booking.timeSlot,
                    status: booking.paymentStatus,
                    pidx: `PIDX-${Date.now()}-${index}`
                };
            });
            await Payment.insertMany(payments);
            console.log('Inserted payments');

        } catch (err) {
            console.error('Error seeding data:', err);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => {
        console.error('Connection error:', err);
    });
