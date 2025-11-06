/**
 * Service Registration Validation Test
 * 
 * Ensures all service files are imported in AllServices.js
 * Prevents runtime errors from missing service registrations
 */

import fs from 'fs';
import path from 'path';

describe('Service Registration', () => {
    const serviceDir = path.join(__dirname, '../../src/service');
    const allServicesFile = path.join(serviceDir, 'AllServices.js');

    /**
     * Recursively find all service files
     */
    function findServiceFiles(dir, fileList = []) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Skip node_modules, __tests__, etc.
                if (!file.startsWith('.') && !file.startsWith('__')) {
                    findServiceFiles(filePath, fileList);
                }
            } else if (file.endsWith('Service.js') && file !== 'AllServices.js' && file !== 'BaseService.js') {
                // Get relative path from service directory
                const relativePath = path.relative(serviceDir, filePath);
                fileList.push(relativePath);
            }
        });

        return fileList;
    }

    /**
     * Parse AllServices.js to extract imported service files
     */
    function getImportedServices() {
        const content = fs.readFileSync(allServicesFile, 'utf8');
        const importRegex = /import\s+['"]\.\/(.+?)['"];/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1] + '.js');
        }

        return imports;
    }

    it('should import all service files in AllServices.js', () => {
        const allServiceFiles = findServiceFiles(serviceDir);
        const importedServices = getImportedServices();

        // Convert to Sets for comparison
        const allServicesSet = new Set(allServiceFiles);
        const importedSet = new Set(importedServices);

        // Find missing services
        const missingServices = allServiceFiles.filter(service => !importedSet.has(service));

        // Find extra imports (services that don't exist)
        const extraImports = importedServices.filter(service => !allServicesSet.has(service));

        // Assert
        if (missingServices.length > 0) {
            console.error('\n❌ Missing service imports in AllServices.js:');
            missingServices.forEach(service => {
                console.error(`   - import './${service.replace('.js', '')}';`);
            });
        }

        if (extraImports.length > 0) {
            console.error('\n⚠️  Extra imports in AllServices.js (files may not exist):');
            extraImports.forEach(service => {
                console.error(`   - ${service}`);
            });
        }

        expect(missingServices).toEqual([]);
        expect(extraImports).toEqual([]);
    });

    it('should have AllServices.js file', () => {
        expect(fs.existsSync(allServicesFile)).toBe(true);
    });

    it('should have proper header documentation', () => {
        const content = fs.readFileSync(allServicesFile, 'utf8');
        
        expect(content).toContain('CRITICAL: Central Service Registration File');
        expect(content).toContain('WHY THIS EXISTS');
        expect(content).toContain('CONSEQUENCES OF REMOVING THIS FILE');
        expect(content).toContain('MAINTENANCE');
    });

    it('should be marked as sideEffect in package.json', () => {
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        expect(packageJson.sideEffects).toBeDefined();
        expect(packageJson.sideEffects).toContain('./src/service/AllServices.js');
    });
});
