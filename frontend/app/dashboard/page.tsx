'use client';

import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Navbar />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Dashboard</h1>
          <p className="text-gray-400 text-lg">Welcome back! Here's your overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Users', value: '1,234', icon: '👥' },
            { label: 'Revenue', value: '$45,231', icon: '💰' },
            { label: 'Orders', value: '856', icon: '📦' },
            { label: 'Growth', value: '+12.5%', icon: '📈' },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all duration-300 hover:shadow-lg"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
              <p className="text-white text-2xl font-bold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Chart Area */}
          <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
            <div className="bg-gray-900/50 rounded p-8 flex items-center justify-center h-64">
              <p className="text-gray-500">Chart area - Add your data visualization here</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all duration-300 text-sm">
                Create New
              </button>
              <button className="w-full px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-300 text-sm">
                View Reports
              </button>
              <button className="w-full px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-300 text-sm">
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Recent Items Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Recent Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 font-semibold text-gray-300">Name</th>
                  <th className="pb-3 font-semibold text-gray-300">Date</th>
                  <th className="pb-3 font-semibold text-gray-300">Status</th>
                  <th className="pb-3 font-semibold text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Item 1', date: 'Oct 17, 2025', status: 'Active' },
                  { name: 'Item 2', date: 'Oct 16, 2025', status: 'Pending' },
                  { name: 'Item 3', date: 'Oct 15, 2025', status: 'Active' },
                ].map((item, index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 text-white">{item.name}</td>
                    <td className="py-3 text-gray-400">{item.date}</td>
                    <td className="py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'Active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button className="text-blue-400 hover:text-blue-300 font-semibold text-xs">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-12">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
