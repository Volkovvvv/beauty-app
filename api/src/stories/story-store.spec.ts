import { StoryStore, STORY_TTL_MS } from './story-store'

describe('StoryStore', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0])

  it('отдаёт картинку по id, пока не истёк срок', () => {
    let t = 0
    const store = new StoryStore(() => t)
    const id = store.put('m1', jpeg)
    expect(id).toMatch(/^[0-9a-f]{32}$/)
    expect(store.get(id)).toEqual(jpeg)
    t = STORY_TTL_MS
    expect(store.get(id)).toBeNull()
  })

  it('держит у мастера только три последние картинки', () => {
    const store = new StoryStore(() => 0)
    const ids = [1, 2, 3, 4].map(() => store.put('m1', jpeg))
    const other = store.put('m2', jpeg)
    expect(store.get(ids[0])).toBeNull()
    expect(ids.slice(1).every((id) => store.get(id))).toBe(true)
    expect(store.get(other)).not.toBeNull()
  })
})
