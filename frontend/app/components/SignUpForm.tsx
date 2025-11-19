'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';

const Form = ({ onClose, onSwitchToSignIn }: { onClose?: () => void; onSwitchToSignIn?: () => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const { signUp } = useAuth();

  // Validate Google-affiliated email
  const validateEmail = async (email: string): Promise<boolean> => {
    // Check if email is from Google domain or uses Gmail
    const googleDomains = ['gmail.com', 'google.com', 'googlemail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) {
      setError('Invalid email format');
      return false;
    }

    // Check if it's a Google-affiliated domain
    const isGoogleAffiliated = googleDomains.includes(domain);
    
    if (!isGoogleAffiliated) {
      setError('Please use a Google-affiliated email (Gmail, Google.com, or Googlemail.com)');
      return false;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return false;
    }

    return true;
  };

  const handleVerifyEmail = async () => {
    setError('');
    
    // Validate email format
    const isEmailValid = await validateEmail(email);
    if (!isEmailValid) {
      return;
    }

    setSendingCode(true);

    try {
      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
      
      // Send verification code email
      await sendVerificationCodeEmail(email, code);
      
      // Show OTP input box
      setShowOtpInput(true);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyOtp = () => {
    setError('');
    
    if (enteredOtp !== verificationCode) {
      setError('Invalid verification code. Please try again.');
      return;
    }
    
    // OTP verified successfully
    setEmailVerified(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if email is verified
    if (!emailVerified) {
      setError('Please verify your email first');
      return;
    }

    // Validate name
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Create account with verified email
      await signUp(email, password, name);
      alert('✅ Account created successfully!');
      onClose?.();
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCodeEmail = async (email: string, code: string) => {
    // Send email with verification code
    // Using a backend API endpoint
    const response = await fetch('/api/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    if (!response.ok) {
      throw new Error('Failed to send verification code');
    }
  };



  return (
    <StyledWrapper>
      <form className="form" onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        
        <div className="flex-column">
          <label>Full Name</label>
        </div>
        <div className="inputForm">
          <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
          </svg>
          <input 
            type="text" 
            className="input" 
            placeholder="Enter your Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex-column">
          <label>Email</label>
        </div>
        <div className="inputForm-with-button">
          <div className="inputForm">
            <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24">
              <path d="M12 12.713l11.985-7.713h-23.97l11.985 7.713zm0 2.287l-12-7.713v11.713h24v-11.713l-12 7.713z" />
            </svg>
            <input 
              type="email" 
              className="input" 
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailVerified(false);
                setShowOtpInput(false);
                setEnteredOtp('');
              }}
              disabled={emailVerified}
              required
            />
          </div>
          {!emailVerified && (
            <button
              type="button"
              className="verify-button"
              onClick={handleVerifyEmail}
              disabled={!email || sendingCode}
            >
              {sendingCode ? 'Sending...' : 'Verify'}
            </button>
          )}
          {emailVerified && (
            <div className="verified-badge">✓ Verified</div>
          )}
        </div>

        {showOtpInput && !emailVerified && (
          <>
            <div className="flex-column">
              <label>Verification Code</label>
            </div>
            <div className="inputForm-with-button">
              <div className="inputForm">
                <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Enter 6-digit code"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
              </div>
              <button
                type="button"
                className="verify-button"
                onClick={handleVerifyOtp}
                disabled={enteredOtp.length !== 6}
              >
                Verify
              </button>
            </div>
            <p className="resend-text-inline">
              Didn't receive code? <span className="span" onClick={handleVerifyEmail}>Resend</span>
            </p>
          </>
        )}

        <div className="flex-column">
          <label>Password</label>
        </div>
        <div className="inputForm">
          <svg xmlns="http://www.w3.org/2000/svg" width={20} viewBox="-64 0 512 512" height={20}>
            <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0" />
            <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.169969 16-16 16zm0 0" />
          </svg>
          <input 
            type="password" 
            className="input" 
            placeholder="Enter your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div className="flex-column">
          <label>Confirm Password</label>
        </div>
        <div className="inputForm">
          <svg xmlns="http://www.w3.org/2000/svg" width={20} viewBox="-64 0 512 512" height={20}>
            <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0" />
            <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0" />
          </svg>
          <input 
            type="password" 
            className="input" 
            placeholder="Confirm your Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <button className="button-submit" type="submit" disabled={loading || !emailVerified}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
        
        <p className="p">
          Already have an account?{' '}
          <span className="span" onClick={onSwitchToSignIn}>
            Sign In
          </span>
        </p>
      </form>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: #ffffff;
    padding: 24px 30px;
    width: 450px;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .form .flex-column {
    margin-top: 4px;
  }
  
  .form .flex-column:first-of-type {
    margin-top: 0;
  }

  .error-message {
    background-color: #fee;
    color: #c00;
    padding: 10px;
    border-radius: 12px;
    font-size: 14px;
    text-align: center;
    margin-bottom: 10px;
  }

  ::placeholder {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
  }

  .flex-column > label {
    color: #151717;
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
    display: block;
  }

  .inputForm-with-button {
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
  }

  .inputForm {
    border: 1.5px solid #ecedec;
    border-radius: 12px;
    height: 44px;
    display: flex;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    transition: 0.2s ease-in-out;
    gap: 10px;
    flex: 1;
    min-width: 0;
    background-color: #ffffff;
  }

  .inputForm svg {
    flex-shrink: 0;
    fill: #151717;
    width: 20px;
    height: 20px;
  }

  .input {
    flex: 1;
    border: none;
    width: 100%;
    height: 100%;
    color: #151717;
    font-size: 15px;
    background-color: transparent;
    min-width: 0;
    outline: none;
  }
  
  .input::placeholder {
    color: #8b8b8b;
  }

  .input:disabled {
    background-color: #f8f8f8;
    color: #8b8b8b;
    cursor: not-allowed;
  }

  .inputForm:focus-within {
    border: 1.5px solid #2d79f3;
  }

  .verify-button {
    background-color: #2d79f3;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 0 16px;
    height: 38px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 70px;
  }

  .verify-button:hover:not(:disabled) {
    background-color: #1e5fd9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(45, 121, 243, 0.3);
  }

  .verify-button:disabled {
    background-color: #b0b0b0;
    cursor: not-allowed;
    transform: none;
  }

  .verified-badge {
    background-color: #10b981;
    color: white;
    border-radius: 10px;
    padding: 0 14px;
    height: 38px;
    display: flex;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .resend-text-inline {
    text-align: center;
    font-size: 12px;
    color: #8b8b8b;
    margin: -4px 0 0 0;
  }

  .span {
    font-size: 14px;
    color: #2d79f3;
    font-weight: 500;
    cursor: pointer;
  }

  .span:hover {
    text-decoration: underline;
  }

  .button-submit {
    margin: 12px 0 8px 0;
    background-color: #151717;
    border: none;
    color: white;
    font-size: 15px;
    font-weight: 600;
    border-radius: 16px;
    height: 46px;
    width: 100%;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .button-submit:disabled {
    background-color: #8b8b8b;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .button-submit:hover:not(:disabled) {
    background-color: #252727;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
  
  .button-submit:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .p {
    text-align: center;
    color: #151717;
    font-size: 14px;
    margin: 5px 0;
    font-weight: 400;
  }
`;

export default Form;
