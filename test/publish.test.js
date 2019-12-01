"use strict";

const path = require("path");
const fs = require("fs");
const coffee = require("coffee");
const assert = require("assert");
const rimraf = require("rimraf");

describe("test/publish.test.js", () => {
  const fixturePath = path.join(__dirname, "fixtures/publish");
  const mockPath = path.join(fixturePath, "mock.js");

  beforeEach(() => {
    fs.writeFileSync(
      path.join(fixturePath, "package.json"),
      JSON.stringify(
        {
          name: "foo",
          version: "0.1.0"
        },
        null,
        2
      )
    );
    rimraf.sync(path.join(fixturePath, "*.md"));
  });

  it("should log help info", done => {
    coffee
      .fork(require.resolve("lub/bin/lub.js"), ["publish", "-h"], {
        cwd: fixturePath
      })
      .expect(
        "stdout",
        /Usage: lub publish \[major \| minor \| patch \| version]/
      )
      .expect("stdout", /.*--registry, -r {2}set npm's registry.*/)
      .expect("stdout", /.*--filename, -f {2}changelog file name.*/)
      .expect("stdout", /.*--client, -c {4}npm client.*/)
      .expect("stdout", /.*--npm, -n {7}whether to publish to npm.*/)
      .end(done);
  });

  it("should log error when version is not valid", done => {
    coffee
      .fork(require.resolve("lub/bin/lub.js"), ["publish", "invalidVersion"], {
        cwd: fixturePath
      })
      .expect(
        "stdout",
        /version\(invalidVersion\) is not in major\/minor\/patch and semver format/
      )
      .end(done);
  });

  it("should output CHANGELOG.md", async () => {
    await coffee
      .fork(require.resolve("lub/bin/lub.js"), ["publish", "patch"], {
        cwd: fixturePath
      })
      .beforeScript(mockPath)
      .expect("stdout", /commits to publish/)
      .expect("stdout", /publish new verson.*finished/)
      .expect("stdout", /push.*to git successfully/)
      .end();
    assert(fs.existsSync(path.join(fixturePath, "CHANGELOG.md")));
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(fixturePath, "package.json")))
        .version,
      "0.1.1"
    );
  });

  it("should not pubish to npm", async () => {
    await coffee
      .fork(
        require.resolve("lub/bin/lub.js"),
        ["publish", "--no-npm", "--filename=HISTORY"],
        {
          cwd: fixturePath
        }
      )
      .beforeScript(mockPath)
      .debug()
      .expect("stdout", /commits to publish/)
      .notExpect("stdout", /publish new verson.*finished/)
      .expect("stdout", /push.*to git successfully/)
      .end();
    assert(fs.existsSync(path.join(fixturePath, "HISTORY.md")));
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(fixturePath, "package.json")))
        .version,
      "1.0.0"
    );
  });

  it("should exit(0) when preleaseCheck return false", async () => {
    const mock = path.join(fixturePath, "/rejectPreleaseCheck");

    await coffee
      .fork(require.resolve("lub/bin/lub.js"), ["publish", "2.0.0"], {
        cwd: fixturePath
      })
      .beforeScript(mock)
      .expect("code", 0)
      .end();
    const pkg = JSON.parse(
      fs.readFileSync(path.join(fixturePath, "package.json"))
    );
    assert.equal(pkg.version, "0.1.0");
    assert(!fs.existsSync(path.join(fixturePath, "CHANGELOG.md")));
  });

  it("should not output changelog.md", async () => {
    const mock = path.join(fixturePath, "/rejectChangelog");

    await coffee
      .fork(require.resolve("lub/bin/lub.js"), ["publish", "1.0.0"], {
        cwd: fixturePath
      })
      .beforeScript(mock)
      .expect("code", 0)
      .end();
    const pkg = JSON.parse(
      fs.readFileSync(path.join(fixturePath, "package.json"))
    );
    assert.equal(pkg.version, "1.0.0");
    assert(!fs.existsSync(path.join(fixturePath, "CHANGELOG.md")));
  });
});
