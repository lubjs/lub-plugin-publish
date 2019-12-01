'use strict';

const fs = require('fs');
const Command = require('lub-command');
const path = require('path');
const utility = require('utility');
const inquirer = require('inquirer');
const safePublishTag = require('safe-publish-tag');
const extend = require('extend');
const cp = require('child_process');
const log = require('lub-log')('lub-plugin-publish');
const semver = require('semver');

const COMMITS = Symbol('PublishCommand#commits');

class PublishCommand extends Command {
  constructor(rawArgv, config) {
    // don't forget this line
    super(rawArgv, config);

    // define your command's usage and description info
    this.usage = 'Usage: lub publish [major | minor | patch | version]';
    this.options = {
      registry: {
        alias: 'r',
        description: "set npm's registry",
        default: 'https://registry.npmjs.org',
        type: 'string',
      },
      filename: {
        alias: 'f',
        description: 'changelog file name',
        default: 'CHANGELOG',
        type: 'string',
      },
      client: {
        alias: 'c',
        description: 'npm client',
        default: 'npm',
        type: 'string',
      },
      npm: {
        alias: 'n',
        default: true,
        description: 'whether to publish to npm',
        type: 'boolean',
      },
    };
  }

  get description() {
    return 'Generate changelog, publish to npm and push to git';
  }

  checkVersion(version) {
    if ([ 'major', 'minor', 'patch' ].includes(version)) return true;
    if (semver.valid(version)) return true;
    log.error(
      'version(%s) is not in major/minor/patch and semver format',
      version
    );
    process.exit(1);
  }

  prepare(context) {
    this.pkgPath = path.join(context.cwd, 'package.json');
    this.rootPath = context.cwd;
    this.pkg = JSON.parse(fs.readFileSync(this.pkgPath, 'utf8'));
    const version = this.pkg.version;
    this.incVersions = {
      major: semver.inc(version, 'major'),
      minor: semver.inc(version, 'minor'),
      patch: semver.inc(version, 'patch'),
    };
  }

  getCommits() {
    if (!this[COMMITS]) {
      const featCommits = [];
      const fixCommits = [];
      const otherCommits = [];
      const rawCommits = [];
      cp.execSync('git fetch');
      cp.execSync(path.join(__dirname, '../scripts/commits.sh'))
        .toString()
        .split('\n')
        .forEach(commit => {
          if (commit.match(/- release \d+\.\d+\.\d+/i)) return;
          rawCommits.push(commit.slice(commit.indexOf(' - ') + 3));
          if (commit.match(/ - feat(\([\w-]+\))?:/i)) {
            return featCommits.push(commit);
          }
          if (commit.match(/ - fix(\([\w-]+\))?:/i)) {
            return fixCommits.push(commit);
          }
          otherCommits.push(commit);
        });
      this[COMMITS] = {
        featCommits,
        fixCommits,
        otherCommits,
        rawCommits,
      };
    }
    return this[COMMITS];
  }

  showCommits() {
    const { rawCommits } = this.getCommits();
    log.info('commits to publish:');
    for (const commit of rawCommits) {
      log.info(commit);
    }
    console.log();
  }

  parseVersion(version) {
    if (semver.valid(version)) return version;
    return this.incVersions[version];
  }

  async askVersion() {
    const answer = await inquirer.prompt({
      name: 'version',
      type: 'list',
      message: 'please choose the version to publish',
      choices: [
        {
          name: `patch(${this.incVersions.patch}) -- bug fix`,
          value: 'patch',
        },
        {
          name: `minor(${this.incVersions.minor}) -- compatible modification`,
          value: 'minor',
        },
        {
          name: `major(${this.incVersions.major}) -- incompatible modification`,
          value: 'major',
        },
        { name: 'other', value: 'other' },
      ],
    });

    /* istanbul ignore next */
    if (answer.version === 'other') {
      const answer = await inquirer.prompt([
        {
          name: 'version',
          message: 'version',
          validate(input) {
            if (semver.valid(input)) return true;
            return 'not in semver format';
          },
        },
      ]);
      return answer.version;
    }
    return answer.version;
  }

  /* istanbul ignore next */
  async preReleaseCheck(context) {
    const ypkgfilesArgs = [
      '--entry',
      'app',
      '--entry',
      'config',
      '--entry',
      '*.js',
      '--check',
    ];
    try {
      log.info(
        'checking by ypkgfiles if all files are added into package.files'
      );
      await this.helper.forkNode(
        require.resolve('ypkgfiles/bin/ypkgfiles.js'),
        ypkgfilesArgs,
        { cwd: context.cwd }
      );
    } catch (_) {
      const answers = await inquirer.prompt([
        {
          name: 'files',
          type: 'confirm',
          message: 'whether all new files are added into package.files',
        },
      ]);
      if (!answers.files) {
        log.error('please add new files into package.files first');
        return false;
      }
    }

    try {
      log.info(
        'checking by autod if all dependencies are added into package.dependencies'
      );
      const registry =
        (this.pkg.publishConfig && this.pkg.publishConfig.registry) ||
        context.argv.registry;
      await this.helper.forkNode(
        require.resolve('autod/bin/autod.js'),
        [ '--check', '--registry', registry ],
        { cwd: context.cwd }
      );
      log.info('all dependencies have been added into package.dependencies');
    } catch (_) {
      const answers = await inquirer.prompt([
        {
          name: 'dependencies',
          type: 'confirm',
          message:
            'whether all dependencies are added into package.dependencies',
        },
      ]);
      if (!answers.dependencies) {
        log.error('please add all new dependencies into package.dependencies');
        return false;
      }
    }

    const answers = await inquirer.prompt([
      {
        name: 'changelog',
        type: 'confirm',
        message: 'whether to update CHANGELOG.md',
      },
    ]);
    return answers;
  }

  /* istanbul ignore next */
  updateChangeLog(version, filename) {
    const { featCommits, fixCommits, otherCommits } = this.getCommits();
    const changelogPath = path.join(this.rootPath, `${filename}.md`);
    const changelogExists = fs.existsSync(changelogPath);
    const changelogContent = changelogExists
      ? fs.readFileSync(changelogPath, 'utf8')
      : '';
    let appendHistoryContent = `\n${version} / ${utility.YYYYMMDD(
      '-'
    )}\n==================\n`;
    if (featCommits.length) {
      appendHistoryContent = `${appendHistoryContent}\n**features**\n${featCommits.join(
        '\n'
      )}\n`;
    }
    if (fixCommits.length) {
      appendHistoryContent = `${appendHistoryContent}\n**fixes**\n${fixCommits.join(
        '\n'
      )}\n`;
    }
    if (otherCommits.length) {
      appendHistoryContent = `${appendHistoryContent}\n**others**\n${otherCommits.join(
        '\n'
      )}\n`;
    }

    fs.writeFileSync(
      changelogPath,
      `${appendHistoryContent}${changelogContent}`
    );
  }

  updatePackage(obj) {
    const pkg = JSON.parse(fs.readFileSync(this.pkgPath, 'utf8'));
    extend(true, pkg, obj);
    fs.writeFileSync(this.pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  async pushToNpm(client, version, tag, registry) {
    /* istanbul ignore next */
    tag = tag || 'latest';

    const args = [ 'publish' ];
    /* istanbul ignore next */
    if (tag !== 'latest') {
      args.push('--tag');
      args.push(tag);
    }
    args.push(
      `--registry=${(this.pkg.publishConfig &&
        /* istanbul ignore next*/
        this.pkg.publishConfig.registry) ||
        registry}`
    );
    await this.helper.spawn(client, args);
    await this.helper.spawn(client, [ 'dist-tag', 'ls' ]);
    log.success(
      'publish new verson（version: %s, tag: %s）finished',
      version,
      tag
    );
  }

  async pushToGit(version) {
    const options = { stdio: [ 'ignore', 'pipe', 'ignore' ] };
    await this.helper.spawn(
      'git',
      [ 'add', 'package.json', 'CHANGELOG.md' ],
      options
    );
    await this.helper.spawn(
      'git',
      [ 'commit', '-am', `Release ${version}` ],
      options
    );
    await this.helper.spawn('git', [ 'tag', version ], options);
    await this.helper.spawn('git', [ 'push', 'origin' ], options);
    await this.helper.spawn('git', [ 'push', 'origin', '--tags' ], options);
    log.success('push %s to git successfully', version);
  }

  async run(context) {
    const { registry, filename, client, npm } = context.argv;
    this.prepare(context);

    let version = context.argv._[0];
    if (version) {
      this.checkVersion(version);
    }
    if (!version) {
      version = await this.askVersion();
    }
    version = this.parseVersion(version);

    this.showCommits();

    let safeTag = '';
    if (npm) {
      safeTag = await safePublishTag(this.pkg.name, version, {
        registry:
          /* istanbul ignore next*/
          (this.pkg.publishConfig && this.pkg.publishConfig.registry) ||
          registry,
      });
      log.info('to publish version: %s, tag: %s', version, safeTag);
    } else {
      log.info('to publish version: %s', version);
    }

    // check before publish
    const answers = await this.preReleaseCheck(context);
    if (!answers) process.exit(0);

    if (answers.changelog) this.updateChangeLog(version, filename);

    // update package.json
    this.updatePackage({ version });

    // publish npm
    if (npm) {
      await this.pushToNpm(client, version, safeTag, registry);
    }

    // push to git
    await this.pushToGit(version);
  }
}

module.exports = PublishCommand;
