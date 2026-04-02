import {
  ADMIN_EMAILS,
  MAX_RATING_USER,
  MAX_RATING_ADMIN,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/constants'

describe('constants', () => {
  describe('ADMIN_EMAILS', () => {
    it('contains exactly two admin email addresses', () => {
      expect(ADMIN_EMAILS).toHaveLength(2)
    })

    it('includes tesscampbell30@gmail.com', () => {
      expect(ADMIN_EMAILS).toContain('tesscampbell30@gmail.com')
    })

    it('includes corbyagain@gmail.com', () => {
      expect(ADMIN_EMAILS).toContain('corbyagain@gmail.com')
    })

    it('does not include arbitrary emails', () => {
      expect(ADMIN_EMAILS).not.toContain('hacker@evil.com')
      expect(ADMIN_EMAILS).not.toContain('admin@statesstics.com')
    })

    it('is case-sensitive (no uppercase variants)', () => {
      expect(ADMIN_EMAILS).not.toContain('TESSCAMPBELL30@GMAIL.COM')
    })
  })

  describe('MAX_RATING_USER', () => {
    it('equals 2', () => {
      expect(MAX_RATING_USER).toBe(2)
    })

    it('is a number', () => {
      expect(typeof MAX_RATING_USER).toBe('number')
    })
  })

  describe('MAX_RATING_ADMIN', () => {
    it('equals 3', () => {
      expect(MAX_RATING_ADMIN).toBe(3)
    })

    it('is greater than MAX_RATING_USER', () => {
      expect(MAX_RATING_ADMIN).toBeGreaterThan(MAX_RATING_USER)
    })
  })

  describe('MAX_IMAGE_SIZE_BYTES', () => {
    it('equals 10 MB in bytes', () => {
      expect(MAX_IMAGE_SIZE_BYTES).toBe(10 * 1024 * 1024)
    })

    it('equals 10485760', () => {
      expect(MAX_IMAGE_SIZE_BYTES).toBe(10485760)
    })
  })
})
