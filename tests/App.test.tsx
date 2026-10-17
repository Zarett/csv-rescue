import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, it, expect } from 'vitest';
import App from '../src/App';
afterEach(cleanup);
it('offers an accessible upload and privacy statement', () => { render(<App/>); expect(screen.getByRole('button',{name:/Browse files/})).toBeVisible(); expect(screen.getByLabelText('Choose CSV file')).toHaveAttribute('type','file'); expect(screen.getByText('Your files stay in your browser')).toBeVisible(); });
it('displays file validation errors', async () => { render(<App/>); fireEvent.change(screen.getByLabelText('Choose CSV file'),{target:{files:[new File(['x'],'bad.exe')]}}); await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Choose a CSV')); });
