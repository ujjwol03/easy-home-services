const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const Service = require('../models/service.model');
const Staff = require('../models/staff.model');
const Payment = require('../models/payment.model');
const { sendRescheduleNotification, sendBookingConfirmationEmail, sendCompletionEmail, sendCancellationEmail, sendStaffBookingNotification } = require("../emailService");
const axios = require('axios');

// Add Booking
exports.addBooking = async (req, res) => {
  try {
    const { serviceId, userId, staffId, date, timeSlot } = req.body;

    // Validate service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Ensure staff belongs to the correct service category
    if (staff.category !== service.category) {
      return res.status(400).json({ error: 'Selected staff does not belong to the required service category.' });
    }

    // Check if the user already has an ongoing booking for this service
    const existingBooking = await Booking.findOne({
      user: userId,
      service: serviceId,
      status: { $in: ['pending', 'inprogress'] },
    });

    if (existingBooking) {
      return res.status(400).json({
        error: 'You already have an ongoing booking for this service. Please complete or cancel it before booking another one.',
      });
    }



    // Check if the selected staff is already booked in a pending or in-progress state
    const staffBooked = await Booking.findOne({
      staff: staffId,
      date,
      timeSlot,
      status: { $in: ['pending', 'inprogress'] },
    });

    if (staffBooked) {
      return res.status(400).json({
        error: 'This staff member is already booked for the selected time slot.',
      });
    }

    // ── Create Payment record (status: completed) ──
    const payment = new Payment({
      service: serviceId,
      user: userId,
      staff: staffId,
      userName: `${user.firstName} ${user.lastName}`,
      serviceName: service.name,
      staffName: staff.name,
      amount: service.price,
      date,
      timeSlot,
      status: 'completed',
    });
    await payment.save();

    // ── Create Booking record with all required fields ──
    const booking = new Booking({
      service: serviceId,
      user: userId,
      staff: staffId,
      staffCategory: staff.category,
      staffName: staff.name,
      serviceName: service.name,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      price: service.price,
      date,
      timeSlot,
      status: 'pending',
      paymentId: payment._id,
      paymentStatus: 'completed',
    });
    await booking.save();

    // ── Send confirmation email (non-blocking — don't fail booking if email errors) ──
    try {
      await sendBookingConfirmationEmail(
        user.email,
        user.firstName,
        service,
        staff,
        date,
        timeSlot
      );
      
      // Send notification to Staff
      if (staff.email) {
        await sendStaffBookingNotification(
          staff.email,
          staff.name,
          service.name,
          `${user.firstName} ${user.lastName}`,
          date,
          timeSlot
        );
      }
    } catch (emailErr) {
      console.warn('Booking confirmation email failed (booking still saved):', emailErr.message);
    }

    res.status(201).json({
      message: 'Booking created successfully!',
      booking: {
        id: booking._id,
        serviceName: service.name,
        staffName: staff.name,
        date,
        timeSlot,
        status: booking.status,
        price: service.price,
      },
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};


// Get all bookings
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('service', 'name image')
      .populate('user', 'firstName lastName email')
      .populate('staff', 'name phone image')
      .populate('paymentId', 'status amount');

    const result = bookings.map(booking => ({
      id: booking._id,
      service: {
        name: booking.serviceName,
        image: booking.service?.image || '',
      },
      user: {
        name: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`,
        email: booking.user?.email || '',
      },
      staff: {
        name: booking.staff?.name || 'Not Available',
        phone: booking.staff?.phone || 'Not Available',
        image: booking.staff?.image || '',
      },
      staffName: booking.staffName || 'Not Available',
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: booking.status,
      price: booking.price,
      payment: {
        status: booking.paymentId?.status || 'Not Paid',
        amount: booking.paymentId?.amount || 0,
      },
      paymentStatus: booking.paymentStatus || 'initiated',
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all bookings for a specific user
exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all bookings for the user
    const bookings = await Booking.find({ user: userId })
      .populate('service', 'name image')
      .populate('staff', 'name phone image')
      .populate('user', 'firstName lastName email')
      .populate('paymentId', 'status amount');

    // Check if no bookings are found
    const result = bookings.length > 0 ? bookings.map(booking => ({
      id: booking._id,
      service: {
        name: booking.serviceName,
        image: booking.service?.image || ' ',
      },
      user: {
        name: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`,
        email: booking.user?.email || '',
      },
      staff: {
        name: booking.staff?.name || 'Not Available',
        phone: booking.staff?.phone || 'Not Available',
        image: booking.staff?.image || ' ',
      },
      staffName: booking.staffName || 'Not Available',
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: booking.status,
      price: booking.price,
      payment: {
        status: booking.paymentId?.status || 'Not Paid',
        amount: booking.paymentId?.amount || 0,
      },
      paymentStatus: booking.paymentStatus || 'initiated',
    })) : [];

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all bookings for a specific staff
exports.getStaffBookings = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const bookings = await Booking.find({ staff: staffId })
      .populate('service')
      .populate('user')    
      .populate('paymentId', 'status amount');

    const result = bookings.length > 0 ? bookings.map(booking => ({
      id: booking._id,
      service: booking.service || {},
      user: booking.user || {},       
      staffName: booking.staffName || 'Not Available',
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: booking.status,
      price: booking.price,
      payment: {
        status: booking.paymentId?.status || 'Not Paid',
        amount: booking.paymentId?.amount || 0,
      },
      paymentStatus: booking.paymentStatus || 'initiated',
    })) : [];

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching staff bookings:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Time slot mapping

// Helper to parse any time string like "8AM", "10:30 AM", "2:00 PM" into hours and minutes
function parseTimeStr(timeStr) {
  const match = timeStr.match(/(\d+)(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;
  
  let [_, hours, minutes, period] = match;
  hours = parseInt(hours);
  minutes = parseInt(minutes || 0);
  
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  
  return { hours, minutes };
}

// Convert date and time slot to a full Date object
function getStartTimeFromSlot(dateString, timeSlot) {
  const parsedDate = new Date(`${dateString.trim()}, ${new Date().getFullYear()}`);
  
  const startTimePart = timeSlot.split('-')[0].trim();
  const time = parseTimeStr(startTimePart);
  
  if (!time) {
    throw new Error(`Invalid time format: ${timeSlot}`);
  }
  
  parsedDate.setHours(time.hours, time.minutes, 0, 0);
  return parsedDate;
}

// Get the next time slot (1 hour later) for cascading reschedule
function getNextTimeSlot(currentTimeSlot) {
  const parts = currentTimeSlot.split(' - ');
  if (parts.length < 2) return null;
  
  const start = parseTimeStr(parts[0]);
  const end = parseTimeStr(parts[1]);
  
  if (!start || !end) return null;
  
  // Calculate duration in minutes
  const startMins = start.hours * 60 + start.minutes;
  const endMins = end.hours * 60 + end.minutes;
  const duration = endMins - startMins;
  
  // New slot starts at the end of the current slot
  const nextStart = end;
  const nextEndMins = endMins + duration;
  const nextEndHours = Math.floor(nextEndMins / 60) % 24;
  const nextEndMinutes = nextEndMins % 60;
  
  function format(h, m) {
    const p = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${p}`;
  }
  
  return `${format(nextStart.hours, nextStart.minutes)} - ${format(nextEndHours, nextEndMinutes)}`;
}

// Delay function to avoid Gmail rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.rescheduleBooking = async (req, res) => {
  try {
    const { newDate, newTimeSlot } = req.body;
    const bookingId = req.params.id;

    // Log incoming request
    console.log(`Reschedule request for booking ${bookingId}:`, { newDate, newTimeSlot });

    // Validate request body
    if (!newDate || !newTimeSlot) {
      console.error('Missing newDate or newTimeSlot in request');
      return res.status(400).json({ error: 'newDate and newTimeSlot are required' });
    }

    // Validate time slot
    try {
      getStartTimeFromSlot(newDate, newTimeSlot);
    } catch (e) {
      console.error(`Invalid time slot provided: ${newTimeSlot}`);
      return res.status(400).json({ error: 'Invalid time slot format' });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('paymentId');
    if (!booking) {
      console.error(`Booking not found: ${bookingId}`);
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Log booking details
    console.log(`Found booking ${bookingId}:`, {
      user: booking.user,
      userEmail: booking.userEmail,
      userName: booking.userName,
      service: booking.service,
      serviceName: booking.serviceName,
      staff: booking.staff,
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: booking.status,
      paymentId: booking.paymentId?._id,
    });

    // Check booking status
    if (!['pending', 'inprogress'].includes(booking.status)) {
      console.error(`Cannot reschedule booking ${bookingId}: Invalid status ${booking.status}`);
      return res.status(400).json({
        error: "Only bookings with status 'pending' or 'inprogress' can be rescheduled",
      });
    }

    // Validate new start time
    const newStartTime = getStartTimeFromSlot(newDate, newTimeSlot);
    const now = new Date();
    if (newStartTime < now) {
      console.error(`Cannot reschedule booking ${bookingId} to past time: ${newStartTime}`);
      return res.status(400).json({ error: 'Cannot reschedule to a past date or time' });
    }

    // Store original date for conflict check
    const originalDate = booking.date.trim();
    const normalizedNewDate = newDate.trim();
    const updatedBookings = [];

    // Update the current booking
    booking.startTime = newStartTime;
    booking.timeSlot = newTimeSlot;
    booking.date = normalizedNewDate;
    await booking.save();
    updatedBookings.push(booking);
    console.log(`Booking ${bookingId} rescheduled to ${normalizedNewDate}, ${newTimeSlot}`);

    // Update the corresponding Payment record
    if (booking.paymentId) {
      const payment = await Payment.findById(booking.paymentId._id);
      if (payment) {
        payment.date = normalizedNewDate;
        payment.timeSlot = newTimeSlot;
        await payment.save();
        console.log(`Payment ${payment._id} updated to date: ${normalizedNewDate}, timeSlot: ${newTimeSlot}`);
      } else {
        console.warn(`Payment not found for booking ${bookingId}, paymentId: ${booking.paymentId._id}`);
      }
    } else {
      console.warn(`No paymentId associated with booking ${bookingId}`);
    }

    // Send email to the user who initiated the reschedule
    if (!booking.userEmail) {
      console.error(`No userEmail found for booking ${bookingId}`);
    } else {
      console.log(`Sending reschedule email to ${booking.userEmail} for booking ${bookingId}`);
      const emailSent = await sendRescheduleNotification(
        booking.userEmail,
        booking.userName || 'User',
        booking.serviceName || 'your service',
        booking.date,
        booking.timeSlot
      );
      if (!emailSent) {
        console.warn(`Failed to send reschedule email to ${booking.userEmail} for booking ${bookingId}`);
      }
    }

    // Check for consecutive booking conflicts on the same date
    if (originalDate === normalizedNewDate) {
      let currentTimeSlot = newTimeSlot;
      let currentBooking = booking;

      while (currentTimeSlot) {
        // Find conflicting booking for the same service, staff, and time slot
        console.log('Conflict query parameters:', {
          service: currentBooking.service,
          staff: currentBooking.staff,
          date: normalizedNewDate,
          timeSlot: currentTimeSlot,
          _id: { $ne: currentBooking._id },
        });

        const conflictingBooking = await Booking.findOne({
          service: currentBooking.service,
          staff: currentBooking.staff,
          date: normalizedNewDate,
          timeSlot: currentTimeSlot,
          _id: { $ne: currentBooking._id },
        }).populate('paymentId');

        if (!conflictingBooking) {
          console.log(`No conflicting booking found for ${normalizedNewDate}, ${currentTimeSlot}`);
          break;
        }

        console.log(`Found conflicting booking ${conflictingBooking._id} at ${normalizedNewDate}, ${currentTimeSlot}`, {
          conflictingBooking: {
            userEmail: conflictingBooking.userEmail,
            userName: conflictingBooking.userName,
            serviceName: conflictingBooking.serviceName,
            staff: conflictingBooking.staff,
            date: conflictingBooking.date,
            timeSlot: conflictingBooking.timeSlot,
          },
        });

        // Get the next time slot
        const nextTimeSlot = getNextTimeSlot(currentTimeSlot);
        if (!nextTimeSlot) {
          console.error(`No available time slot after ${currentTimeSlot} for booking ${conflictingBooking._id}`);
          return res.status(400).json({ error: `No available time slot after ${currentTimeSlot}` });
        }

        // Update the conflicting booking
        conflictingBooking.timeSlot = nextTimeSlot;
        conflictingBooking.startTime = getStartTimeFromSlot(normalizedNewDate, nextTimeSlot);
        conflictingBooking.date = normalizedNewDate;
        await conflictingBooking.save();
        updatedBookings.push(conflictingBooking);
        console.log(`Shifted booking ${conflictingBooking._id} to ${normalizedNewDate}, ${nextTimeSlot}`);

        // Update the corresponding Payment record for the conflicting booking
        if (conflictingBooking.paymentId) {
          const conflictingPayment = await Payment.findById(conflictingBooking.paymentId._id);
          if (conflictingPayment) {
            conflictingPayment.date = normalizedNewDate;
            conflictingPayment.timeSlot = nextTimeSlot;
            await conflictingPayment.save();
            console.log(`Payment ${conflictingPayment._id} updated to date: ${normalizedNewDate}, timeSlot: ${nextTimeSlot}`);
          } else {
            console.warn(`Payment not found for conflicting booking ${conflictingBooking._id}, paymentId: ${conflictingBooking.paymentId._id}`);
          }
        } else {
          console.warn(`No paymentId associated with conflicting booking ${conflictingBooking._id}`);
        }

        // Send email to the affected user
        if (!conflictingBooking.userEmail) {
          console.error(`No userEmail found for affected booking ${conflictingBooking._id}`);
        } else {
          console.log(`Sending reschedule email to ${conflictingBooking.userEmail} for booking ${conflictingBooking._id}`);
          const emailSent = await sendRescheduleNotification(
            conflictingBooking.userEmail,
            conflictingBooking.userName || 'User',
            conflictingBooking.serviceName || 'your service',
            conflictingBooking.date,
            conflictingBooking.timeSlot
          );
          if (!emailSent) {
            console.warn(`Failed to send reschedule email to ${conflictingBooking.userEmail} for booking ${conflictingBooking._id}`);
          }
          // Add delay to avoid Gmail rate limits
          await delay(500);
        }

        // Continue checking for conflicts in the next time slot
        currentTimeSlot = nextTimeSlot;
        currentBooking = conflictingBooking;
      }
    }

    res.status(200).json({
      message: 'Booking rescheduled successfully',
      updatedBookings,
    });
  } catch (err) {
    console.error(`Reschedule error for booking ${req.params.id}:`, err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate booking ID and status
    const booking = await Booking.findById(id)
      .populate('staff', 'name phone image')
      .populate('paymentId', 'status amount');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update status
    booking.status = status;
    await booking.save();

    // Send notification email if completed or cancelled
    const userEmail = booking.userEmail;
    const userName = booking.userName || 'User';
    const serviceName = booking.serviceName || 'Service';
    const date = booking.date;
    const timeSlot = booking.timeSlot;

    if (userEmail) {
      if (status === 'completed') {
        await sendCompletionEmail(userEmail, userName, serviceName, date, timeSlot);
      } else if (status === 'cancelled') {
        await sendCancellationEmail(userEmail, userName, serviceName, date, timeSlot);
      }
    }

    res.status(200).json({
      message: 'Booking status updated successfully',
      updatedBooking: {
        id: booking._id,
        service: booking.service,
        user: booking.user,
        staff: {
          name: booking.staff?.name || 'Not Assigned',
          phone: booking.staff?.phone || 'Not Available',
          image: booking.staff?.image || '',
        },
        date,
        timeSlot,
        status,
        payment: {
          status: booking.paymentId?.status || 'Not Paid',
          amount: booking.paymentId?.amount || 0,
        },
        paymentStatus: booking.paymentStatus || 'initiated',
      },
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await Booking.deleteOne({ _id: id });
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};