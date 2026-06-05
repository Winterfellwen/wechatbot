'use client';

import { useCloudStore } from '@/stores/cloudStore';
import Terminal from './Terminal';

export default function Dashboard() {
  const { resources, loading, error } = useCloudStore();

  if (loading) {
    return <div className="text-center">Loading resources...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 border rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Resources</h3>
          <p className="text-3xl font-bold">{resources?.length || 0}</p>
        </div>
        <div className="p-6 border rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Cloud Providers</h3>
          <p className="text-3xl font-bold">AWS, Azure, GCP</p>
        </div>
        <div className="p-6 border rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Active Sessions</h3>
          <p className="text-3xl font-bold">1</p>
        </div>
      </div>

      <div className="border rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Terminal</h3>
        <Terminal />
      </div>
    </div>
  );
}
