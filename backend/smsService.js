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
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Already has country code +91 (12 digits starting with 91)
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        return `+${cleanPhone}`;
    }
    
    // Exactly 10 digits — standard Indian mobile number, add +91
    if (cleanPhone.length === 10) {
        return `+91${cleanPhone}`;
    }
    
    // Any other length with digits — prepend +
    if (cleanPhone.length > 10) {
        return `+${cleanPhone}`;
    }
    
    return phone; // Fallback
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
            return true;
        } catch (err) {
            console.error(`❌ [Twilio] Failed to send SMS to ${formattedPhone}:`, err.message);
            // Fallback to console mock below on failure
        }
    }
    
    // Console Mock Fallback
    console.log(`\n======================================`);
    console.log(`[MOCK SMS FALLBACK] To: ${formattedPhone}`);
    console.log(`[MESSAGE]:\n${text}`);
    console.log(`======================================\n`);
    return false;
};
