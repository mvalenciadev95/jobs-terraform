'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface AnalyticsProps {
  data: {
    total: number
    bySource: Array<{ _id: string; count: number; unique: number; duplicates: number }>
    byDate: Array<{ _id: string; count: number }>
  }
}

export default function Analytics({ data }: AnalyticsProps) {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="text-sm font-medium text-primary-600">Total Records</div>
              <div className="text-3xl font-bold text-primary-900 mt-2">{data.total}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Unique Records</div>
              <div className="text-3xl font-bold text-green-900 mt-2">
                {data.bySource.reduce((sum, s) => sum + s.unique, 0)}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm font-medium text-yellow-600">Duplicates</div>
              <div className="text-3xl font-bold text-yellow-900 mt-2">
                {data.bySource.reduce((sum, s) => sum + s.duplicates, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Records by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.bySource}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0ea5e9" name="Total" />
              <Bar dataKey="unique" fill="#10b981" name="Unique" />
              <Bar dataKey="duplicates" fill="#f59e0b" name="Duplicates" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Records by Date</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.byDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" name="Records" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}



