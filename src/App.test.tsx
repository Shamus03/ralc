import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('Renders', () => {
    expect(render(<App />)).toBeTruthy()
  })
})
