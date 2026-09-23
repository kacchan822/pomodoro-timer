// Vitest global setup
//
// @testing-library/vue appends rendered DOM to document.body.
// Without an explicit cleanup, DOM accumulates between tests and
// getByText / getByRole fail with "Found multiple elements".
// Independent of globals:true, run cleanup after each test.
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/vue'

afterEach(() => {
  cleanup()
})
