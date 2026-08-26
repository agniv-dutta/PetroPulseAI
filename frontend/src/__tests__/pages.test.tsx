import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AssetLeaderboard } from '../pages/AssetLeaderboard';
import { Dashboard } from '../pages/Dashboard';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('AssetLeaderboard', () => {
  it('renders without crashing', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { asset_id: 'MH-07', name: 'Mumbai High North-7', aips_score: 65 },
      ],
    });
    const { container } = renderWithRouter(<AssetLeaderboard />);
    expect(container).toBeTruthy();
  });
});

describe('Dashboard', () => {
  it('renders without crashing', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    const { container } = renderWithRouter(<Dashboard />);
    expect(container).toBeTruthy();
  });
});
