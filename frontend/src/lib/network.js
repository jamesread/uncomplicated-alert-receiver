export function isNetworkError (err) {
  return err instanceof TypeError && (err.message === 'Failed to fetch' || err.message === 'Load failed')
}
