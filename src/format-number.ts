const formatNumber = (n: string | number) => {
  const parts = n.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  let maxOverallLength = 14
  let e = ''
  if (parts[1] && parts[1].includes('e')) {
    const spl = parts[1].split('e')
    maxOverallLength -= spl[1].length
    e = 'e' + spl[1]
  }
  if (parts[1] && parts[0].length + parts[1].length > maxOverallLength) {
    const decimalPart = parts[1].slice(0, maxOverallLength - parts[0].length + 1)
    const beginningPaddedDecimalPart = '1' + decimalPart
    const rounded = Math.round(+beginningPaddedDecimalPart / 10).toString().slice(1)
    parts[1] = rounded.toString() + e
  }
  return parts.join('.')
}

export default formatNumber
