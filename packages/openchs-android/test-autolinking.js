#!/usr/bin/env node

// Test script to verify autolinking.json generation
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Testing autolinking configuration...');

try {
    // Ensure directory exists
    const autolinkingDir = path.join(__dirname, 'android/build/generated/autolinking');
    if (!fs.existsSync(autolinkingDir)) {
        fs.mkdirSync(autolinkingDir, { recursive: true });
        console.log('✅ Created autolinking directory');
    }

    // Generate autolinking.json
    console.log('📝 Generating autolinking.json...');
    const output = execSync('npx react-native config --platform android', { 
        cwd: __dirname,
        encoding: 'utf8' 
    });
    
    // Write to file
    const autolinkingFile = path.join(autolinkingDir, 'autolinking.json');
    fs.writeFileSync(autolinkingFile, output);
    
    console.log('✅ Generated autolinking.json');
    
    // Parse and analyze the content
    const config = JSON.parse(output);
    console.log('📊 Analysis:');
    console.log(`- React Native version: ${config.reactNativeVersion}`);
    console.log(`- Dependencies found: ${Object.keys(config.dependencies || {}).length}`);
    
    if (config.dependencies) {
        const enabledDeps = Object.entries(config.dependencies)
            .filter(([name, dep]) => dep.platforms && dep.platforms.android)
            .map(([name]) => name);
        
        console.log(`- Enabled Android dependencies: ${enabledDeps.length}`);
        if (enabledDeps.length > 0) {
            console.log('⚠️  WARNING: Some dependencies are still enabled:');
            enabledDeps.forEach(dep => console.log(`  - ${dep}`));
        } else {
            console.log('✅ All dependencies properly disabled for autolinking');
        }
    }
    
    console.log('\n🎯 Autolinking test completed successfully!');
    
} catch (error) {
    console.error('❌ Autolinking test failed:', error.message);
    process.exit(1);
}
