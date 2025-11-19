'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Login</h1>

          <form className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Sign In
            </button>
          </form>

          <p className="text-gray-400 text-center mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-white font-semibold hover:text-gray-300">
              Sign Up
            </Link>
          </p>

          <p className="text-gray-400 text-center mt-2">
            <Link href="/forgot-password" className="hover:text-white">
              Forgot Password?
            </Link>
          </p>

          <Link
            href="/"
            className="block text-center text-gray-400 mt-6 hover:text-white"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
