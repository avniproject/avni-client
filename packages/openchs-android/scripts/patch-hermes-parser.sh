#!/bin/bash
# Patch babel-plugin-syntax-hermes-parser to support decorators
# React Native 0.76.5's hermes parser doesn't support decorator syntax
# This stub allows Babel to use its default parser which supports decorators

echo "🔧 Patching babel-plugin-syntax-hermes-parser to support decorators..."

mkdir -p node_modules/babel-plugin-syntax-hermes-parser

cat > node_modules/babel-plugin-syntax-hermes-parser/index.js << 'EOF'
// Stub to disable hermes parser and allow decorator support in React Native 0.76.5
// The hermes parser plugin doesn't support decorator syntax (@Action, @Path, etc.)
// This no-op plugin allows Babel to use its default parser which supports decorators
module.exports = function() {
    return {
        name: "syntax-hermes-parser-noop",
        manipulateOptions() {
            // Do nothing - let Babel use its default parser
        }
    };
};
EOF

cat > node_modules/babel-plugin-syntax-hermes-parser/package.json << 'EOF'
{
  "name": "babel-plugin-syntax-hermes-parser",
  "version": "0.0.0-stub",
  "description": "Stub to enable decorator support in React Native 0.76.5"
}
EOF

echo "✅ babel-plugin-syntax-hermes-parser patched successfully"
