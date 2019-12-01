# lub-plugin-publish



[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/lub-plugin-publish.svg?style=flat-square
[npm-url]: https://npmjs.org/package/lub-plugin-publish
[travis-image]: https://img.shields.io/travis/lubjs/lub-plugin-publish.svg?style=flat-square
[travis-url]: https://travis-ci.org/lubjs/lub-plugin-publish
[codecov-image]: https://codecov.io/gh/lubjs/lub-plugin-publish/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/lubjs/lub-plugin-publish
[david-image]: https://img.shields.io/david/lubjs/lub-plugin-publish.svg?style=flat-square
[david-url]: https://david-dm.org/lubjs/lub-plugin-publish
[snyk-image]: https://snyk.io/test/npm/lub-plugin-publish/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/lub-plugin-publish
[download-image]: https://img.shields.io/npm/dm/lub-plugin-publish.svg?style=flat-square
[download-url]: https://npmjs.org/package/lub-plugin-publish

This lub plugin help you to publish and tag your package quickly and formaly based on [Semantic Versioning Specification](https://github.com/semver/semver).

Featrues:
- generate changelog
- check version
- check npm package tag

---

## Install

```bash
npm i lub-plugin-publish --save
```

## Usage:

Add this plugin to lub config files like: `.lubrc` , `.lubrc.json`, `.lubrc.js`

```javascript
// .lubrc.js
"use strict";

const path = require("path");

module.exports = {
  plugins: ['lub-plugin-publish']
};

```

Then publish with this plugin:
```bash
lub publish [major | minor | patch | version]
```

## argvs

use `lub publish -h` to view all the help info

```bash
Usage: lub publish [major | minor | patch | version]

Global Options:
  -h, --help     Show help                         [boolean]
  -v, --version  Show version number               [boolean]

Options:
  --registry, -r  set npm's registry                [string] [default: "https://registry.npmjs.org"]
  --filename, -f  changelog file name               [string] [default: "CHANGELOG"]
  --client, -c    npm client                        [string] [default: "npm"]
  --npm, -n       whether to publish to npm         [boolean] [default: true]
```

**tip**

You can run `lub pubish [version] --no-npm` to only publish to git.

## License

[MIT](LICENSE)