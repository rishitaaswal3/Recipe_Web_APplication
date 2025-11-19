'use client';

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface VerificationCodeFormProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onCancel: () => void;
}

const VerificationCodeForm = ({ email, onVerify, onResend, onCancel }: VerificationCodeFormProps) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    
    pastedData.split('').forEach((digit, index) => {
      if (index < 6) {
        newCode[index] = digit;
      }
    });
    
    setCode(newCode);
    
    // Focus on next empty input or last input
    const nextEmptyIndex = newCode.findIndex(val => !val);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await onVerify(verificationCode);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      await onResend();
      setResendCooldown(60); // 60 second cooldown
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledWrapper>
      <form className="verification-form" onSubmit={handleSubmit}>
        <div className="header">
          <h2>Verify Your Email</h2>
          <p className="email-text">
            We've sent a 6-digit verification code to
            <br />
            <strong>{email}</strong>
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="code-inputs">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="code-input"
              disabled={loading}
            />
          ))}
        </div>

        <button type="submit" className="verify-button" disabled={loading || code.join('').length !== 6}>
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <div className="resend-section">
          <p className="resend-text">
            Didn't receive the code?{' '}
            {resendCooldown > 0 ? (
              <span className="cooldown">Resend in {resendCooldown}s</span>
            ) : (
              <span className="resend-link" onClick={handleResend}>
                Resend Code
              </span>
            )}
          </p>
        </div>

        <button type="button" className="cancel-button" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </form>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .verification-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    background-color: #ffffff;
    padding: 32px;
    width: 450px;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    max-height: 90vh;
    overflow-y: auto;
  }

  .header {
    text-align: center;
    margin-bottom: 10px;
  }

  .header h2 {
    color: #151717;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 12px 0;
  }

  .email-text {
    color: #5f5f5f;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }

  .email-text strong {
    color: #151717;
    font-weight: 600;
  }

  .error-message {
    background-color: #fee;
    color: #c00;
    padding: 12px;
    border-radius: 12px;
    font-size: 14px;
    text-align: center;
  }

  .code-inputs {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin: 10px 0;
  }

  .code-input {
    width: 50px;
    height: 60px;
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    border: 2px solid #ecedec;
    border-radius: 12px;
    outline: none;
    transition: all 0.2s ease;
    color: #151717;
    font-family: 'Courier New', monospace;
  }

  .code-input:focus {
    border-color: #2d79f3;
    box-shadow: 0 0 0 3px rgba(45, 121, 243, 0.1);
  }

  .code-input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .verify-button {
    margin: 10px 0;
    background-color: #151717;
    border: none;
    color: white;
    font-size: 16px;
    font-weight: 600;
    border-radius: 16px;
    height: 50px;
    width: 100%;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .verify-button:hover:not(:disabled) {
    background-color: #252727;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  .verify-button:disabled {
    background-color: #8b8b8b;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .resend-section {
    text-align: center;
    margin: 10px 0;
  }

  .resend-text {
    color: #5f5f5f;
    font-size: 14px;
    margin: 0;
  }

  .resend-link {
    color: #2d79f3;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
  }

  .resend-link:hover {
    color: #1d69e3;
  }

  .cooldown {
    color: #8b8b8b;
    font-weight: 500;
  }

  .cancel-button {
    background-color: transparent;
    border: 1.5px solid #ecedec;
    color: #5f5f5f;
    font-size: 15px;
    font-weight: 500;
    border-radius: 16px;
    height: 46px;
    width: 100%;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .cancel-button:hover:not(:disabled) {
    border-color: #c00;
    color: #c00;
    background-color: #fee;
  }

  .cancel-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default VerificationCodeForm;
