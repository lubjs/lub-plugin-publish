'use strict';

const cp = require('child_process');
const mm = require('mm');
const { helper } = require('lub-command');
const inquire = require('inquirer');

mm(cp, 'execSync', bin => {
  if (bin === 'git fetch') {
    return true;
  }
  if (/.*commits\.sh/.test(bin)) {
    return Buffer.from(
      '  * [[`6515883`](http://github.com/ahungrynoob/lub-plugin-publish/commit/651588536b408e5e70d73e2da7005f297486d650)] - release 0.1.0 (ahungrynoob <<dxd_sjtu@outlook.com.com>>)\n  * [[`6515885`](http://github.com/lub-plugin-publish/commit/651588536b408e5e70d73e2da7005f297486d651)] - test: add some test cases (ahungrynoob <<dxd_sjtu@outlook.com>>)\n  * [[`6515886`](http://github.com/lub-plugin-publish/commit/651588536b408e5e70d73e2da7005f297486d652)] - feat: feat foo (ahungrynoob <<dxd_sjtu@outlook.com>>)\n   * [[`6515887`](http://github.com/lub-plugin-publish/commit/651588536b408e5e70d73e2da7005f297486d653)] - fix: fix some bugs (ahungrynoob <<dxd_sjtu@outlook.com>>)'
    );
  }
});

mm(inquire, 'prompt', param => {
  if (!Array.isArray(param)) {
    if (param.name === 'version') {
      return {
        version: 'major',
      };
    }
  }
  if (param[0].name === 'dependencies') {
    return {
      dependencies: true,
    };
  }
  if (param[0].name === 'files') {
    return {
      files: true,
    };
  }
  if (param[0].name === 'changelog') {
    return {
      changelog: false,
    };
  }
  if (param[0].name === 'version') {
    if (param[0].validate('1.0.0')) {
      return {
        version: '1.0.0',
      };
    }
  }
  return true;
});

mm(helper, 'spawn', () => {
  return new Promise(resolve => resolve('ok'));
});
