const ansiEscapes = require('ansi-escapes');
const chalk = require('chalk');
const fs = require('fs');
const minimist = require('minimist');
const path = require('path');
const ProgressBar = require('clui').Progress;
const shell = require('shelljs');

const LOG_FILE = process.cwd() + '/renameJsFiles.log';

const getJsFiles = (path, jsFiles) => {
  const filesInDir = fs.readdirSync(path);

  for (let file of filesInDir) {
    const filePath = `${path}/${file}`;

    if (filePath.includes('assets')) {
      continue;
    }

    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      getJsFiles(filePath, jsFiles);
    } else if (stats.isFile() && /\.js$/.test(filePath)) {
      jsFiles.push(filePath);
    }
  }
};

const renameJsFiles = () => {
  const rootDir = process.cwd() + '/app/modules';
  const files = [];
  getJsFiles(rootDir, files);

  const progressBar = new ProgressBar(50);
  write('\n');
  write(progressBar.update(0, files.length));
  write(ansiEscapes.cursorHide);
  write('\n');

  for (let n = 0; n < files.length; n++) {
    handleJsFile(files[n]);

    write(ansiEscapes.cursorUp());
    write(ansiEscapes.cursorLeft);
    write(ansiEscapes.eraseLine);
    write(progressBar.update(n, files.length));
    write('\n');
  }

  write('\n');
};

const handleJsFile = (file) => {
  // under version control?
  const result = shell.exec(`git ls-files ${file}`, { silent: true });

  if (!result.stdout) {
    return;
  }

  // already created from an existing .ts file?
  const tsFile = file.replace(/\.js$/, '.ts');

  if (!fs.existsSync(tsFile)) {
    // rename file to have .ts extension
    const result = shell.exec(`git mv ${file} ${tsFile}`, { silent: true });

    if (result.code === 0) {
      fs.appendFileSync(LOG_FILE, `${tsFile}\n`);

      write(ansiEscapes.cursorLeft);
      write(ansiEscapes.eraseLine);
      write(chalk.green(`${path.basename(file)} --> ${path.basename(tsFile)}`));
    } else {
      console.log(chalk.red(`Failed to convert ${file}`));
      handleError(result.stderr);
    }
  }
};

const verify = (renameCommit) => {
  if (!fs.existsSync(LOG_FILE)) {
    handleError('Log file does not exist');
  }

  const errorFiles = [];
  const lines = fs.readFileSync(LOG_FILE).toString().split('\n');
  const progressBar = new ProgressBar(50);

  if (!lines[lines.count - 1]) {
    lines.pop();
  }

  write('\n');
  write(progressBar.update(0, lines.length - 1));
  write(ansiEscapes.cursorHide);
  write('\n');

  for (let n = 0; n < lines.length; n++) {
    const result = shell.exec(`git log --oneline --follow ${lines[n]}`, { silent: true });
    let history = result.stdout;
    const regex = new RegExp('^' + renameCommit + '.*\n');
    history = history.replace(regex, '');

    if (history) {
      write(ansiEscapes.cursorUp());
      write(ansiEscapes.cursorLeft);
      write(ansiEscapes.eraseLine);
      write(progressBar.update(n, lines.length - 1));
      write('\n');
      write(ansiEscapes.cursorLeft);
      write(ansiEscapes.eraseLine);
      write(chalk.green(`\u2714 ${path.basename(lines[n])}`));
    } else {
      errorFiles.push(lines[n]);

      write(ansiEscapes.cursorLeft);
      write(ansiEscapes.eraseLine);
      write(chalk.red(`\u2716 No commit history for ${lines[n]}`));
    }
  }

  write('\n\n');

  if (errorFiles.length === 0) {
    console.log(chalk.green('All files have retained their commit history'))
  } else {
    console.log(chalk.red('The following files are missing their commit history:'))

    for (file of errorFiles) {
      console.log(chalk.red(file));
    }
  }

  console.log();
};

const handleError = (err) => {
  if (err) {
    console.error(err);
    process.exit();
  }
};

const handleExit = () => {
  write(ansiEscapes.cursorShow);
};

const write = (m) => {
  process.stdout.write(m);
};

// START SCRIPT
process.on('exit', handleExit);
process.on('SIGINT', handleExit); // ctrl+c

const argv = minimist(process.argv.slice(2));

if (argv.verify) {
  if (argv.verify.length !== 7) {
    console.log(chalk.red('Please provide a valid abbreviated commit hash of the commit that renamed the files. ' +
      'Example: node renameJsFiles.js --verify=b241a87'));
    process.exit();
  }

  verify(argv.verify);
} else {
  renameJsFiles();

  console.log();
  console.log(chalk.cyan(chalk.bold('COMMIT THE RENAMED FILES BEFORE MODIFYING ANY OF THEM. MODIFYING A FILE BEFORE ' +
    'COMMITTING IT COULD RESULT IN LOSING THAT FILE\'S COMMIT HISTORY.')));
  console.log();
  console.log(chalk.cyan('After committing, run the following to verify that the renamed files have retained their ' +
    'commit history\n(replace b241a87 with the abbreviated commit hash that corresponds to the commit that renamed ' +
    'the files):'));
  console.log(chalk.gray('node renameJsFiles.js --verify=b241a87'));
  console.log();
}
// END SCRIPT