'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: '对话', href: '/', icon: 'chat' },
    { name: '资源', href: '/resources', icon: 'server' },
    { name: '拓扑图', href: '/topology', icon: 'diagram' },
    { name: '凭证', href: '/credentials', icon: 'key' },
    { name: '设置', href: '/settings', icon: 'cog' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-bold">Multi-Cloud Manager</h1>
      </div>
      <nav className="flex-1 p-4">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`block p-2 rounded mb-2 ${
              pathname === item.href
                ? 'bg-gray-700'
                : 'hover:bg-gray-800'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
