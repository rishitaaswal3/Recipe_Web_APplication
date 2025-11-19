'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Sign Up</h1>

          <form className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Create Account
            </button>
          </form>

          <p className="text-gray-400 text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-white font-semibold hover:text-gray-300">
              Sign In
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
