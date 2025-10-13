#!/usr/bin/env node

/**
 * Generate autolinking.json for React Native 0.76.5+
 * This script creates the autolinking configuration file required by the React Gradle Plugin
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../android/build/generated/autolinking');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'autolinking.json');

console.log('🔧 Generating autolinking configuration for React Native 0.76.5...');

try {
  // Get React Native CLI config
  console.log('📋 Reading React Native configuration...');
  const configOutput = execSync('npx @react-native-community/cli config', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const config = JSON.parse(configOutput);

  // Extract autolinking dependencies
  const dependencies = {};
  
  if (config.dependencies) {
    Object.entries(config.dependencies).forEach(([name, depConfig]) => {
      if (depConfig.platforms && depConfig.platforms.android) {
        dependencies[name] = {
          root: depConfig.root,
          name: name,
          platforms: {
            android: depConfig.platforms.android
          }
        };
        console.log(`  ✓ Found: ${name}`);
      }
    });
  }

  // Create autolinking configuration
  const autolinkingConfig = {
    reactNativeVersion: config.reactNativeVersion || '0.76.5',
    dependencies: dependencies,
    project: config.project
  };

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write autolinking.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(autolinkingConfig, null, 2));

  console.log(`✅ Successfully generated autolinking.json`);
  console.log(`   Location: ${OUTPUT_FILE}`);
  console.log(`   Dependencies: ${Object.keys(dependencies).length} Android packages`);

} catch (error) {
  console.error('❌ Failed to generate autolinking configuration:', error.message);
  
  // Create minimal fallback configuration
  console.log('⚠️  Creating fallback autolinking configuration...');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const fallbackConfig = {
    reactNativeVersion: '0.76.5',
    dependencies: {},
    project: {
      android: {
        packageName: 'com.openchsclient'
      }
    }
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fallbackConfig, null, 2));
  console.log('   Fallback configuration created (manual linking may be required)');
  
  process.exit(1);
}
