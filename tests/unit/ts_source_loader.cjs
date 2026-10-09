// Compile actual runtime imports into a disposable unit directory. No mocks.
const fs = require('fs'), path = require('path'), ts = require('typescript');
module.exports = (directory) => {
  const compiled = new Set();
  function compile(name) {
    if (compiled.has(name)) return;
    compiled.add(name);
    const source = path.resolve('apps/vehicle-app/src/utils', name + '.ts');
    const target = path.join(directory, name + '.js');
    const output = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    fs.writeFileSync(target, output);
    for (const match of output.matchAll(/require\(["'](\.\/[^"']+)["']\)/g)) {
      const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(name), match[1]));
      if (fs.existsSync(path.resolve('apps/vehicle-app/src/utils', dependency + '.ts'))) compile(dependency);
    }
  }
  return name => { compile(name); return require(path.join(directory, name + '.js')); };
};
