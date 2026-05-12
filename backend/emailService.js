const axios = require('axios');

// ─── EmailJS Configuration ───────────────────────────────────────────────────
console.log('[EmailJS] Email Service initialized.');

const sendEmailViaEmailJS = async (templateParams) => {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  // Check if keys are placeholders or missing
  if (!serviceId || serviceId.includes('your_') ||
      !publicKey  || publicKey.includes('your_')  ||
      !templateId || templateId.includes('your_')) {
    console.warn('[EmailJS] Not configured — keys are missing or placeholder values.');
    return false;
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: templateParams,
  };

  // Include accessToken (private key) if available
  if (privateKey && !privateKey.includes('your_')) {
    payload.accessToken = privateKey;
  }

  try {
    console.log(`[EmailJS] Sending email to: ${templateParams.email}`);
    const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload, {
      headers: {
        'Origin': 'http://localhost:3000',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    console.log(`[EmailJS] Email sent successfully. Status: ${response.status}`);
    return true;
  } catch (error) {
    const status = error.response ? error.response.status : 'N/A';
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[EmailJS] Failed to send. Status ${status}: ${errorMsg}`);
    return false;
  }
};

// ─── Email Sending Functions ─────────────────────────────────────────────────

// Send OTP Verification Code (for Registration & Forgot Password)
const sendVerificationCode = async (email, code, firstName) => {
  // Variable names MUST match the EmailJS template:
  //   {{email}}    -> "To Email" field
  //   {{passcode}} -> OTP code in message body
  //   {{time}}     -> expiry time string
  const sent = await sendEmailViaEmailJS({
    email: email,
    passcode: code,
    time: '15 minutes',
  });

  if (!sent) {
    console.error(`[EmailJS] Failed to send verification code to ${email}`);
  }
};

// Send Welcome Email (reuses the same template)
const sendWelcomeEmail = async (email, firstName) => {
  const sent = await sendEmailViaEmailJS({
    email: email,
    passcode: 'Welcome!',
    time: 'N/A',
  });

  if (!sent) {
    console.error(`[EmailJS] Failed to send welcome email to ${email}`);
  }
};

// Send Booking Confirmation Email
const sendBookingConfirmationEmail = async (email, firstName, service, staff, date, timeSlot) => {
  const sent = await sendEmailViaEmailJS({
    email: email,
    passcode: `Booking Confirmed!\n\nService: ${service.name}\nPrice: NPR ${service.price}\nDate: ${date}\nTime: ${timeSlot}\nStaff: ${staff.name} (${staff.phone})`,
    time: date,
  });

  if (!sent) {
    console.error(`[EmailJS] Failed to send booking confirmation to ${email}`);
  }
};

// Send Service Completion Email
const sendCompletionEmail = async (email, firstName, serviceName, date, timeSlot) => {
  const sent = await sendEmailViaEmailJS({
    email: email,
    passcode: `Service Completed ✅\n\nYour ${serviceName} service has been completed.\nDate: ${date}\nTime: ${timeSlot}`,
    time: date,
  });

  if (!sent) {
    console.error(`[EmailJS] Failed to send completion email to ${email}`);
  }
};

// Send Cancellation Email
const sendCancellationEmail = async (email, firstName, serviceName, date, timeSlot) => {
  const sent = await sendEmailViaEmailJS({
    email: email,
    passcode: `Service Cancelled ❌\n\nYour ${serviceName} appointment on ${date} at ${timeSlot} has been cancelled.\n\nIf payment was made, a full refund will be issued within 2-3 business days.`,
    time: date,
  });

  if (!sent) {
    console.error(`[EmailJS] Failed to send cancellation email to ${email}`);
  }
};

// Send Reschedule Notification
const sendRescheduleNotification = async (email, firstName, serviceName, newDate, newSlot) => {
  if (!email) {
    console.error('[EmailJS] Cannot send reschedule email: No email provided');
    return false;
  }
  if (!newDate || !newSlot) {
    console.error(`[EmailJS] Cannot send reschedule email to ${email}: Missing date or slot`);
    return false;
  }

  const sent = await sendEmailViaEmailJS({
    email: email,
    passcode: `Booking Rescheduled\n\nYour ${serviceName || 'service'} appointment has been rescheduled.\nNew Date: ${newDate}\nNew Time: ${newSlot}`,
    time: newDate,
  });

  return sent;
};

// Send Staff Approval Email
const sendStaffApprovalEmail = async (email, firstName) => {
  if (!email) {
    console.error('[EmailJS] No email provided for staff approval notification');
    return;
  }

  const sent = await sendEmailViaEmailJS({
    email: email,
    passcode: `Application Approved 🎉\n\nHi ${firstName}, your staff application at EasyHomeServices has been approved!\nYou can now log in with your registered email and password.`,
    time: 'N/A',
  });

  if (!sent) {
    console.error(`[EmailJS] Failed to send staff approval email to ${email}`);
    throw new Error('Failed to send staff approval email');
  }
};

// Send Staff Booking Notification
const sendStaffBookingNotification = async (email, staffName, serviceName, userName, date, timeSlot) => {
  if (!email) return;

  const sent = await sendEmailViaEmailJS({
    email: email,
    passcode: `New Booking Assigned 📅\n\nHi ${staffName}, you have a new booking!\nService: ${serviceName}\nClient: ${userName}\nDate: ${date}\nTime: ${timeSlot}`,
    time: date,
  });

  if (!sent) {
    console.error(`[EmailJS] Failed to send staff booking notification to ${email}`);
  }
};

module.exports = {
  sendVerificationCode,
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendRescheduleNotification,
  sendCompletionEmail,
  sendCancellationEmail,
  sendStaffApprovalEmail,
  sendStaffBookingNotification,
};