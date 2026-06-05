import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '@/components/Dashboard';

jest.mock('@/stores/cloudStore', () => ({
  useCloudStore: jest.fn(() => ({
    resources: [],
    loading: false,
    error: null,
  })),
}));

describe('Dashboard', () => {
  it('renders dashboard title', () => {
    render(<Dashboard />);
    expect(screen.getByText('Cloud Manager')).toBeInTheDocument();
  });

  it('shows total resources', () => {
    render(<Dashboard />);
    expect(screen.getByText('Total Resources')).toBeInTheDocument();
  });
});
