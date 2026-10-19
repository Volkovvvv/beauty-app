import { matchesMime } from './photo-signature'

const pad = (head: number[]) => Buffer.concat([Buffer.from(head), Buffer.alloc(16)])

describe('matchesMime', () => {
  it('узнаёт JPEG, PNG и WebP по первым байтам', () => {
    expect(matchesMime(pad([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(true)
    expect(matchesMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true)
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)])
    expect(matchesMime(webp, 'image/webp')).toBe(true)
  })

  it('не пускает HTML под видом картинки', () => {
    expect(matchesMime(Buffer.from('<html><script>alert(1)</script></html>'), 'image/png')).toBe(false)
  })

  it('не путает форматы и отклоняет обрывки', () => {
    expect(matchesMime(pad([0xff, 0xd8, 0xff]), 'image/png')).toBe(false)
    expect(matchesMime(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(false)
  })
})
