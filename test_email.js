require('dotenv').config({ path: __dirname + '/backend/.env' });
const { sendVerificationCode } = require('./backend/emailService');

async function test() {
  console.log("Testing emailJS...");
  await sendVerificationCode('test@test.com', '1234', 'Ujjwol');
  console.log("Test finished.");
}

test();
