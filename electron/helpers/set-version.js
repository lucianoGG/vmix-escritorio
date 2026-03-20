const path = require('path');
const fs = require('fs');

let version = '1.0.0';

const ref = process.env.GITHUB_REF;
if (ref && ref.startsWith('refs/tags/v')) {
  version = ref.replace('refs/tags/v', '');
}

console.log('Version:', version);

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');

let data = fs.readFileSync(packageJsonPath, 'utf8');

data = data.replace(/"version": "[^"]+"/, `"version": "${version}"`);

fs.writeFileSync(packageJsonPath, data);
