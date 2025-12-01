'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

interface Record {
  _id: string
  sourceId: string
  originalId: string
  capturedAt: string
  normalizedFields: {
    title: string
    content: string
    author: string
  }
  dedupStatus: string
}

export default function RecordsList() {
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    fetchRecords()
  }, [page])

  const fetchRecords = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reporting/records`,
        {
          params: {
            limit,
            offset: (page - 1) * limit,
          },
        }
      )
      setRecords(response.data.records)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-xl text-gray-600">Loading records...</div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Records</h2>
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record._id}
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedRecord(record)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {record.normalizedFields.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {record.normalizedFields.content}
                  </p>
                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Source: {record.sourceId}</span>
                    <span>Author: {record.normalizedFields.author}</span>
                    <span
                      className={`px-2 py-1 rounded ${
                        record.dedupStatus === 'unique'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {record.dedupStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to{' '}
            {Math.min(page * limit, total)} of {total} records
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedRecord.normalizedFields.title}
                </h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-semibold">ID:</span> {selectedRecord._id}
                </p>
                <p>
                  <span className="font-semibold">Source:</span>{' '}
                  {selectedRecord.sourceId}
                </p>
                <p>
                  <span className="font-semibold">Author:</span>{' '}
                  {selectedRecord.normalizedFields.author}
                </p>
                <p>
                  <span className="font-semibold">Captured At:</span>{' '}
                  {new Date(selectedRecord.capturedAt).toLocaleString()}
                </p>
                <p>
                  <span className="font-semibold">Status:</span>{' '}
                  <span
                    className={`px-2 py-1 rounded ${
                      selectedRecord.dedupStatus === 'unique'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedRecord.dedupStatus}
                  </span>
                </p>
                <div className="mt-4">
                  <p className="font-semibold mb-2">Content:</p>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedRecord.normalizedFields.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



