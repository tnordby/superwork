import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Sender configuration
export const SENDER_EMAIL = 'no-reply@superwork.co';
export const SENDER_NAME = 'Superwork';
export const FROM = `${SENDER_NAME} <${SENDER_EMAIL}>`;
