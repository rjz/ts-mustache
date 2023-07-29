import path from 'path'
import { DefaultLoader } from './facilities'

const TEMPLATES_DIR = path.resolve(__dirname, '__fixtures__')

describe('Loader', function () {
  it('loads files', async function () {
    const loader = new DefaultLoader({ dir: TEMPLATES_DIR })
    const templateMap = await loader.load()
    expect(Object.keys(templateMap).sort()).toEqual([
      'partials/_test-partial',
      'test-partials',
      'test-scalars',
      'test-sections',
    ])
  })
})
