import { getFooApp } from "@cool/utilities-test-e2e-foo-driver";

describe("Native Smoke Test", () => {
  const fooApp = getFooApp();

  afterEach(async () => {
    await fooApp.stop();
  });

  it("should launch the app", async () => {
    await fooApp.launch({
      skipLogin: true,
    });
  });
});
