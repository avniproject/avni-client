const babel = require('@babel/core');
const fs = require('fs');

const code = fs.readFileSync('src/action/beneficiaryMode/BeneficiaryDashboardActions.js', 'utf8');
const babelConfig = require('./babel.config.js');

console.log('=== BABEL CONFIG ===');
console.log(JSON.stringify(babelConfig, null, 2));

const result = babel.transformSync(code, {
  ...babelConfig,
  filename: 'BeneficiaryDashboardActions.js',
});

console.log('\n=== TRANSFORMED CODE (first 500 chars) ===');
console.log(result.code.substring(0, 500));
