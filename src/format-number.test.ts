import formatNumber from './format-number'

describe('formatNumber', () => {
  it('Formats basic numbers', () => {
    expect(formatNumber('123')).toBe('123')
    expect(formatNumber('1234')).toBe('1,234')
    expect(formatNumber('12.34')).toBe('12.34')
    expect(formatNumber('1234.5678')).toBe('1,234.5678')
  })

  it('Tries to constrain the number to a maximum length', () => {
    expect(formatNumber('123456789.12345')).toBe('123,456,789.123')
    expect(formatNumber('2345678901.15345')).toBe('2,345,678,901.2')
  })

  it('Leaves any dangling decimal points', () => {
    expect(formatNumber('1.')).toBe('1.')
  })

  it('Does not strip trailing zeroes', () => {
    expect(formatNumber('1.000')).toBe('1.000')
  })

  it('Handles scientific notation', () => {
    expect(formatNumber('1.23e45')).toBe('1.23e45')
  })

  it('Does not break on small numbers', () => {
    expect(formatNumber('0.00000000000025')).toBe('0.0000000000003')
  })
})
