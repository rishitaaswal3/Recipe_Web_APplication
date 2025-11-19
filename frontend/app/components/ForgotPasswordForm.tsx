'use client';

import { useState } from 'react';
import styled from 'styled-components';

const FormContainer = styled.div`
  width: 420px;
  max-width: 420px;
  background-color: #fff;
  padding: 32px 24px;
  font-size: 14px;
  font-family: inherit;
  color: #212121;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
  border-radius: 10px;
  box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.084), 0px 2px 3px rgba(0, 0, 0, 0.168);

  button:active {
    scale: 0.95;
  }
`;

const LogoContainer = styled.div`
  text-align: center;
  font-weight: 600;
  font-size: 18px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: inherit;
    border: 1px solid #ccc;
    box-sizing: border-box;

    &::placeholder {
      opacity: 0.5;
    }

    &:focus {
      outline: none;
      border-color: #1778f2;
    }
  }
`;

const SubmitButton = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: inherit;
  color: #fff;
  background-color: #212121;
  border: none;
  width: 100%;
  padding: 12px 16px;
  font-size: inherit;
  gap: 8px;
  margin: 12px 0;
  cursor: pointer;
  border-radius: 6px;
  box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.084), 0px 2px 3px rgba(0, 0, 0, 0.168);

  &:hover {
    background-color: #313131;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const Link = styled.a`
  color: #1778f2;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const BackLink = styled.p`
  align-self: center;
  font-weight: 500;

  .link {
    font-weight: 400;
  }
`;

const Message = styled.div<{ type: 'success' | 'error' }>`
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  background-color: ${props => props.type === 'success' ? '#d4edda' : '#f8d7da'};
  color: ${props => props.type === 'success' ? '#155724' : '#721c24'};
  border: 1px solid ${props => props.type === 'success' ? '#c3e6cb' : '#f5c6cb'};
`;

interface ForgotPasswordFormProps {
  onBackToSignIn: () => void;
}

export default function ForgotPasswordForm({ onBackToSignIn }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Import Firebase auth dynamically
      const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
      const auth = getAuth();

      await sendPasswordResetEmail(auth, email);
      
      setMessage({
        type: 'success',
        text: 'Password reset email sent! Check your inbox.'
      });
      setEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <LogoContainer>Forgot Password</LogoContainer>

      {message && (
        <Message type={message.type}>
          {message.text}
        </Message>
      )}

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormGroup>

        <SubmitButton type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Email'}
        </SubmitButton>
      </Form>

      <BackLink>
        Remember your password?{' '}
        <Link className="link" onClick={onBackToSignIn}>
          Back to Sign In
        </Link>
      </BackLink>
    </FormContainer>
  );
}
