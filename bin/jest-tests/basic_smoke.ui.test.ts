import { getFooApp } from '@cool/utilities-test-e2e-foo-driver'

describe('Native Smoke Test', () => {
  const fooApp = getFooApp()

  afterEach(async () => {
    await fooApp.stop()
  })
  jest.setTimeout(120000)
  it('should launch the app', async () => {
    await fooApp.launch({
      skipLogin: true,
    })
  })
})
