import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid build issues
let Resend: any;
let nodemailer: any;

async function getResend() {
  if (!Resend) {
    const resendModule = await import('resend');
    Resend = resendModule.Resend;
  }
  return Resend;
}

async function getNodemailer() {
  if (!nodemailer) {
    nodemailer = await import('nodemailer');
  }
  return nodemailer;
}

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Log for development
    console.log(`Sending verification code to ${email}: ${code}`);

    // HTML email template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #151717; margin-bottom: 20px;">Verify Your Email</h2>
        <p style="color: #151717; font-size: 16px; line-height: 1.5;">
          Thank you for signing up for Recipe App! To complete your registration, please use the verification code below:
        </p>
        <div style="background-color: #f4f4f4; padding: 30px; text-align: center; margin: 30px 0; border-radius: 12px;">
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #2d79f3;">
            ${code}
          </div>
        </div>
        <p style="color: #8b8b8b; font-size: 14px; line-height: 1.5;">
          This code will expire in 10 minutes for security purposes.
        </p>
        <p style="color: #8b8b8b; font-size: 14px; line-height: 1.5;">
          If you didn't request this code, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #ecedec; margin: 30px 0;" />
        <p style="color: #8b8b8b; font-size: 12px;">
          Recipe App - Your Personal Recipe Manager
        </p>
      </div>
    `;

    // Try Gmail SMTP first (can send to any email)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const nodemailerModule = await getNodemailer();
        const transporter = nodemailerModule.default.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"Recipe App" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: 'Verify Your Email - Recipe App',
          html: emailHtml,
        });

        console.log('✅ Email sent successfully via Gmail SMTP');
        return NextResponse.json({ 
          success: true,
          message: 'Verification code sent successfully'
        });
      } catch (gmailError: any) {
        console.error('Gmail SMTP error:', gmailError);
        // Fall through to Resend
      }
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  No email service configured. Set up Gmail SMTP or Resend API key.');
      return NextResponse.json({ 
        success: true,
        message: 'Verification code sent (dev mode)',
        ...(process.env.NODE_ENV === 'development' && { code })
      });
    }

    // Fallback to Resend (limited to verified emails)
    try {
      const ResendClass = await getResend();
      const resend = new ResendClass(process.env.RESEND_API_KEY);
      
      const { data, error } = await resend.emails.send({
        from: 'Recipe App <onboarding@resend.dev>',
        to: [email],
        subject: 'Verify Your Email - Recipe App',
        html: emailHtml,
      });

      if (error) {
        console.error('Resend error:', error);
        return NextResponse.json(
          { error: 'Failed to send verification email', details: error },
          { status: 500 }
        );
      }

      console.log('Email sent successfully:', data);

      return NextResponse.json({ 
        success: true,
        message: 'Verification code sent successfully',
        // Only return code in development for testing
        ...(process.env.NODE_ENV === 'development' && { code })
      });

    } catch (emailError: any) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email', details: emailError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process verification request', details: error.message },
      { status: 500 }
    );
  }
}
