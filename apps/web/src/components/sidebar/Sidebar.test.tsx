import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Sidebar', () => {
  it('should render navigation links', () => {
    render(<Sidebar />);

    expect(screen.getByText('对话')).toBeInTheDocument();
    expect(screen.getByText('资源')).toBeInTheDocument();
    expect(screen.getByText('拓扑图')).toBeInTheDocument();
    expect(screen.getByText('凭证')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('should highlight current path', () => {
    render(<Sidebar />);

    const对话Link = screen.getByText('对话');
    expect(对话Link).toHaveClass('bg-gray-700');
  });
});
