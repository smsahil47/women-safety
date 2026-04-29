import 'dotenv/config';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
} else {
    console.warn("⚠️ Twilio credentials missing in .env. SMS will fallback to console mock only.");
}

/**
 * Format phone number for Twilio (ensure country code +91 for India if missing)
 */
function formatPhone(phone) {
    // Strip ALL non-digit characters (spaces, dashes, parentheses, +)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Already has country code 91 (12 digits starting with 91)
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        return `+${cleanPhone}`;
    }
    
    // Exactly 10 digits — standard Indian mobile number, add +91
    if (cleanPhone.length === 10) {
        return `+91${cleanPhone}`;
    }
    
    // Any other length — just prepend +
    if (cleanPhone.length > 10) {
        return `+${cleanPhone}`;
    }
    
    return phone; // Fallback (shouldn't happen)
}

/**
 * Sends an SMS using Twilio, with a console fallback.
 * @param {string} phone - Target phone number
 * @param {string} text - Message body
 */
export const sendSMS = async (phone, text) => {
    const formattedPhone = formatPhone(phone);

    if (client && twilioPhoneNumber) {
        try {
            console.log(`[Twilio] Attempting to send SMS to ${formattedPhone}...`);
            const message = await client.messages.create({
                body: text,
                from: twilioPhoneNumber,
                to: formattedPhone
            });
            console.log(`✅ [Twilio] Successfully sent SMS to ${formattedPhone} (SID: ${message.sid})`);
            return { sent: true };
        } catch (err) {
            // Common Twilio trial errors:
            // 21608 = unverified number (trial account restriction)
            // 21211 = invalid phone number
            const code = err.code || err.status || 'unknown';
            console.error(`❌ [Twilio] Failed to send SMS to ${formattedPhone} (code ${code}):`, err.message);
            if (code === 21608) {
                console.error(`   ⚠️  TRIAL ACCOUNT: ${formattedPhone} is not a verified Twilio number.`);
                console.error(`   ➡️  Verify it at: https://www.twilio.com/console/phone-numbers/verified`);
            }
            return { sent: false, error: err.message, code };
        }
    }
    
    // Console Mock Fallback (no Twilio credentials configured)
    console.log(`\n======================================`);
    console.log(`[MOCK SMS FALLBACK] To: ${formattedPhone}`);
    console.log(`[MESSAGE]:\n${text}`);
    console.log(`======================================\n`);
    return { sent: false, error: 'Twilio not configured (mock fallback)', code: 'no_credentials' };
};
