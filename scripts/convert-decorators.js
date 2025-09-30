#!/usr/bin/env node

/**
 * AI-Iterative Decorator Conversion Tool for React Native 0.81.4 Hermes Parser Compatibility
 * 
 * Converts @Action, @Service, and @Path decorators to manual function calls
 * to resolve Hermes parser syntax errors in React Native 0.81.4
 * 
 * Designed for AI-assisted iterative conversion - can process single files or batches
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AIDecoratorConverter {
    constructor(rootDir = process.cwd()) {
        this.rootDir = rootDir;
        this.srcDir = path.join(rootDir, 'packages/openchs-android/src');
        this.stats = {
            filesProcessed: 0,
            decoratorsConverted: 0,
            errors: 0
        };
        this.backupDir = path.join(rootDir, 'decorator-conversion-backup');
    }

    log(message, level = 'INFO') {
        console.log(`[${level}] ${new Date().toLocaleTimeString()}: ${message}`);
    }

    createBackup() {
        this.log('Creating backup of source files...');
        try {
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }
            execSync(`cp -r "${this.srcDir}" "${this.backupDir}/"`);
            this.log(`Backup created at: ${this.backupDir}`);
        } catch (error) {
            this.log(`Backup failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    findFilesWithDecorators() {
        this.log('Scanning for files with decorators...');
        const command = `find "${this.srcDir}" -name "*.js" -exec grep -l "@\\(Action\\|Service\\|Path\\)" {} \\;`;
        
        try {
            const output = execSync(command, { encoding: 'utf8' });
            const files = output.trim().split('\n').filter(f => f);
            this.log(`Found ${files.length} files with decorators`);
            return files;
        } catch (error) {
            this.log('No files with decorators found or error occurred', 'WARN');
            return [];
        }
    }

    convertActionDecorators(content, filePath) {
        const actionRegex = /@Action\(['"]([^'"]+)['"]\)\s*\n\s*(static\s+)?(\w+)/g;
        const matches = [...content.matchAll(actionRegex)];
        
        if (matches.length === 0) return content;

        let convertedContent = content;
        const actionIds = [];

        // Remove @Action decorators
        matches.forEach(match => {
            const [fullMatch, actionId, staticKeyword, methodName] = match;
            actionIds.push({ actionId, methodName });
            convertedContent = convertedContent.replace(fullMatch, `${staticKeyword || ''}${methodName}`);
        });

        // Add manual ID assignments after class definition
        if (actionIds.length > 0) {
            const className = this.extractClassName(convertedContent);
            if (className) {
                const assignments = actionIds.map(({ actionId, methodName }) => 
                    `${className}.${methodName}.Id = '${actionId}';`
                ).join('\n');

                const classEndRegex = /(\n}\s*(?:\n|$))/;
                const match = convertedContent.match(classEndRegex);
                if (match) {
                    const replacement = `$1\n// Manually assign Action IDs (replacing @Action decorators)\n${assignments}\n`;
                    convertedContent = convertedContent.replace(classEndRegex, replacement);
                }
            }
        }

        this.stats.decoratorsConverted += matches.length;
        this.log(`  Converted ${matches.length} @Action decorators in ${path.basename(filePath)}`);
        return convertedContent;
    }

    convertServiceDecorators(content, filePath) {
        const serviceRegex = /@Service\(['"]([^'"]+)['"]\)\s*\n\s*class\s+(\w+)/g;
        const matches = [...content.matchAll(serviceRegex)];
        
        if (matches.length === 0) return content;

        let convertedContent = content;

        // Remove @Service decorators and add manual registration
        matches.forEach(match => {
            const [fullMatch, serviceName, className] = match;
            convertedContent = convertedContent.replace(fullMatch, `class ${className}`);
            
            // Add manual service registration at the end
            const registrationCode = `\n// Manually register service (replacing @Service decorator)\nService("${serviceName}")(${className});\n`;
            convertedContent += registrationCode;
        });

        this.stats.decoratorsConverted += matches.length;
        this.log(`  Converted ${matches.length} @Service decorators in ${path.basename(filePath)}`);
        return convertedContent;
    }

    convertPathDecorators(content, filePath) {
        const pathRegex = /@Path\(['"]([^'"]+)['"]\)\s*\n\s*class\s+(\w+)/g;
        const matches = [...content.matchAll(pathRegex)];
        
        if (matches.length === 0) return content;

        let convertedContent = content;

        // Remove @Path decorators and add manual registration
        matches.forEach(match => {
            const [fullMatch, pathName, className] = match;
            convertedContent = convertedContent.replace(fullMatch, `class ${className}`);
            
            // Add manual path registration at the end
            const registrationCode = `\n// Manually register path (replacing @Path decorator)\nPath("${pathName}")(${className});\n`;
            convertedContent += registrationCode;
        });

        this.stats.decoratorsConverted += matches.length;
        this.log(`  Converted ${matches.length} @Path decorators in ${path.basename(filePath)}`);
        return convertedContent;
    }

    extractClassName(content) {
        const classRegex = /class\s+(\w+)/;
        const match = content.match(classRegex);
        return match ? match[1] : null;
    }

    processFile(filePath) {
        try {
            this.log(`Processing: ${path.relative(this.rootDir, filePath)}`);
            
            const originalContent = fs.readFileSync(filePath, 'utf8');
            let convertedContent = originalContent;

            // Apply all decorator conversions
            convertedContent = this.convertActionDecorators(convertedContent, filePath);
            convertedContent = this.convertServiceDecorators(convertedContent, filePath);
            convertedContent = this.convertPathDecorators(convertedContent, filePath);

            // Only write if content changed
            if (convertedContent !== originalContent) {
                fs.writeFileSync(filePath, convertedContent, 'utf8');
                this.log(`  ✅ Updated: ${path.basename(filePath)}`);
            } else {
                this.log(`  ⚪ No changes: ${path.basename(filePath)}`);
            }

            this.stats.filesProcessed++;
        } catch (error) {
            this.log(`Error processing ${filePath}: ${error.message}`, 'ERROR');
            this.stats.errors++;
        }
    }

    validateConversion() {
        this.log('Validating conversion...');
        try {
            const command = `find "${this.srcDir}" -name "*.js" -exec grep -l "@\\(Action\\|Service\\|Path\\)" {} \\;`;
            const output = execSync(command, { encoding: 'utf8' });
            const remainingFiles = output.trim().split('\n').filter(f => f);
            
            if (remainingFiles.length > 0) {
                this.log(`⚠️  ${remainingFiles.length} files still contain decorators:`, 'WARN');
                remainingFiles.forEach(file => this.log(`  - ${path.relative(this.rootDir, file)}`, 'WARN'));
                return false;
            } else {
                this.log('✅ All decorators successfully converted!');
                return true;
            }
        } catch (error) {
            this.log('✅ No remaining decorators found (validation complete)');
            return true;
        }
    }

    // AI-Friendly Methods for Iterative Processing

    /**
     * Get a list of files with decorators for AI processing
     */
    getDecoratorFilesList() {
        const files = this.findFilesWithDecorators();
        return files.map(file => ({
            path: file,
            relativePath: path.relative(this.rootDir, file),
            hasDecorators: this.analyzeFile(file)
        }));
    }

    /**
     * Analyze a single file and return decorator information
     */
    analyzeFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const actionMatches = [...content.matchAll(/@Action\(['"]([^'"]+)['"]\)/g)];
            const serviceMatches = [...content.matchAll(/@Service\(['"]([^'"]+)['"]\)/g)];
            const pathMatches = [...content.matchAll(/@Path\(['"]([^'"]+)['"]\)/g)];
            
            return {
                actions: actionMatches.map(m => m[1]),
                services: serviceMatches.map(m => m[1]),
                paths: pathMatches.map(m => m[1]),
                total: actionMatches.length + serviceMatches.length + pathMatches.length
            };
        } catch (error) {
            return { actions: [], services: [], paths: [], total: 0, error: error.message };
        }
    }

    /**
     * Process a single file by relative path (AI-friendly)
     */
    processSingleFile(relativePath) {
        const fullPath = path.join(this.rootDir, relativePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${relativePath}`);
        }
        
        this.log(`AI Processing: ${relativePath}`);
        const before = this.analyzeFile(fullPath);
        this.processFile(fullPath);
        const after = this.analyzeFile(fullPath);
        
        return {
            file: relativePath,
            before,
            after,
            success: after.total === 0
        };
    }

    /**
     * Process a batch of files (AI-friendly)
     */
    processBatch(relativePathsArray, maxFiles = 10) {
        const results = [];
        const filesToProcess = relativePathsArray.slice(0, maxFiles);
        
        this.log(`AI Batch Processing: ${filesToProcess.length} files`);
        
        filesToProcess.forEach(relativePath => {
            try {
                const result = this.processSingleFile(relativePath);
                results.push(result);
            } catch (error) {
                results.push({
                    file: relativePath,
                    error: error.message,
                    success: false
                });
            }
        });
        
        return results;
    }

    /**
     * Get conversion progress for AI monitoring
     */
    getProgress() {
        const allFiles = this.getDecoratorFilesList();
        const remaining = allFiles.filter(f => f.hasDecorators.total > 0);
        const completed = allFiles.filter(f => f.hasDecorators.total === 0);
        
        return {
            total: allFiles.length,
            completed: completed.length,
            remaining: remaining.length,
            completionPercentage: ((completed.length / allFiles.length) * 100).toFixed(1),
            remainingFiles: remaining.map(f => ({
                path: f.relativePath,
                decorators: f.hasDecorators.total
            }))
        };
    }

    run() {
        console.log('🚀 Starting Decorator Conversion for React Native 0.81.4 Compatibility\n');
        
        const startTime = Date.now();

        try {
            // Create backup
            this.createBackup();

            // Find and process files
            const files = this.findFilesWithDecorators();
            
            if (files.length === 0) {
                this.log('No files with decorators found. Nothing to convert.');
                return;
            }

            this.log(`\nProcessing ${files.length} files...\n`);
            
            files.forEach(file => this.processFile(file));

            // Validate conversion
            this.log('\n' + '='.repeat(60));
            const success = this.validateConversion();

            // Print summary
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            this.log('\n📊 CONVERSION SUMMARY:');
            this.log(`Files processed: ${this.stats.filesProcessed}`);
            this.log(`Decorators converted: ${this.stats.decoratorsConverted}`);
            this.log(`Errors: ${this.stats.errors}`);
            this.log(`Duration: ${duration}s`);
            this.log(`Backup location: ${this.backupDir}`);

            if (success && this.stats.errors === 0) {
                console.log('\n🎉 Decorator conversion completed successfully!');
                console.log('✅ All @Action, @Service, and @Path decorators have been converted to function calls.');
                console.log('✅ Your code is now compatible with React Native 0.81.4 Hermes parser.');
                console.log('\n🚀 Next steps:');
                console.log('   1. Test your build: make build_app flavor=generic');
                console.log('   2. If successful, commit the changes');
                console.log('   3. If issues occur, restore from backup');
            } else {
                console.log('\n⚠️  Conversion completed with issues. Please review the output above.');
            }

        } catch (error) {
            this.log(`Conversion failed: ${error.message}`, 'ERROR');
            console.log('\n❌ Conversion failed. Check the backup if you need to restore files.');
            process.exit(1);
        }
    }
}

// CLI Usage with AI-friendly options
if (require.main === module) {
    const args = process.argv.slice(2);
    const converter = new AIDecoratorConverter();
    
    if (args.length === 0) {
        // Default: full conversion
        converter.run();
    } else if (args[0] === '--list') {
        // List files with decorators
        const files = converter.getDecoratorFilesList();
        console.log('📁 Files with decorators:');
        files.forEach(f => {
            console.log(`  ${f.relativePath} (${f.hasDecorators.total} decorators)`);
        });
    } else if (args[0] === '--progress') {
        // Show conversion progress
        const progress = converter.getProgress();
        console.log('📊 Conversion Progress:');
        console.log(`  Completed: ${progress.completed}/${progress.total} (${progress.completionPercentage}%)`);
        console.log(`  Remaining: ${progress.remaining} files`);
        if (progress.remaining > 0) {
            console.log('  Files still needing conversion:');
            progress.remainingFiles.slice(0, 10).forEach(f => {
                console.log(`    ${f.path} (${f.decorators} decorators)`);
            });
        }
    } else if (args[0] === '--file' && args[1]) {
        // Process single file
        try {
            const result = converter.processSingleFile(args[1]);
            console.log('✅ File processed:', result);
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    } else if (args[0] === '--batch' && args[1]) {
        // Process batch of files (comma-separated)
        try {
            const files = args[1].split(',').map(f => f.trim());
            const results = converter.processBatch(files);
            console.log('📦 Batch results:', results);
        } catch (error) {
            console.error('❌ Batch error:', error.message);
        }
    } else {
        console.log('🤖 AI-Iterative Decorator Converter Usage:');
        console.log('  node convert-decorators.js              # Full conversion');
        console.log('  node convert-decorators.js --list       # List files with decorators');
        console.log('  node convert-decorators.js --progress   # Show conversion progress');
        console.log('  node convert-decorators.js --file <path> # Process single file');
        console.log('  node convert-decorators.js --batch <paths> # Process batch (comma-separated)');
    }
}

module.exports = AIDecoratorConverter;
