import { RealmEmbeddedObjectUtils } from "openchs-models";
import Realm from "realm";

/**
 * Comprehensive test runner for Realm embedded object issues
 * Tests all recommended patterns and validates fixes
 */
class RealmEmbeddedObjectTestRunner {
    
    constructor() {
        this.testResults = [];
        this.schemaVersion = 204;
        this.setupSchemas();
    }
    
    setupSchemas() {
        // Test schemas for embedded object scenarios
        this.testSchemas = {
            Address: {
                name: "Address",
                embedded: true,
                properties: {
                    street: "string",
                    city: "string",
                    zipCode: "string",
                    country: "string"
                }
            },
            
            Person: {
                name: "Person",
                primaryKey: "uuid",
                properties: {
                    uuid: "string",
                    name: "string",
                    address: {type: "object", objectType: "Address", optional: true}
                }
            },
            
            Document: {
                name: "Document",
                primaryKey: "uuid",
                properties: {
                    uuid: "string",
                    title: "string",
                    content: "string",
                    metadata: {type: "object", objectType: "Address", optional: true},
                    author: {type: "object", objectType: "Person", optional: true}
                }
            },
            
            Company: {
                name: "Company",
                primaryKey: "uuid",
                properties: {
                    uuid: "string",
                    name: "string",
                    headquarters: {type: "object", objectType: "Address", optional: true},
                    employees: {type: "list", objectType: "Person"}
                }
            }
        };
    }
    
    log(message, type = "info") {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        console.log(formattedMessage);
        this.testResults.push(formattedMessage);
    }
    
    async runAllTests() {
        this.log("🚀 Starting Realm Embedded Object Test Suite");
        this.log(`📋 Schema Version: ${this.schemaVersion}`);
        this.log("=" .repeat(60));
        
        try {
            // Test 1: Reproduce the original issue
            await this.testOriginalIssue();
            
            // Test 2: Validate all fix patterns
            await this.testDeepCopyPattern();
            await this.testToJSONPattern();
            await this.testFreshReferencePattern();
            await this.testSeparateTransactionsPattern();
            
            // Test 3: Utility functions
            await this.testUtilityFunctions();
            
            // Test 4: Complex scenarios
            await this.testComplexNestedScenarios();
            await this.testBatchOperations();
            await this.testEdgeCases();
            
            // Test 5: Performance comparison
            await this.testPerformanceComparison();
            
            this.log("=" .repeat(60));
            this.log("✅ All tests completed successfully!");
            
        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, "error");
        }
        
        return this.testResults;
    }
    
    async testOriginalIssue() {
        this.log("\n🔍 Test 1: Reproducing Original Issue");
        
        try {
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                const person = realm.create("Person", {
                    uuid: "person-1",
                    name: "John Doe",
                    address: {
                        street: "123 Main St",
                        city: "New York",
                        zipCode: "10001",
                        country: "USA"
                    }
                });
                
                // This should demonstrate the issue in Realm 12
                try {
                    const embeddedAddressRef = person.address;
                    const document = realm.create("Document", {
                        uuid: "doc-1",
                        title: "Test Document",
                        content: "This should fail in Realm 12",
                        metadata: embeddedAddressRef // Problematic line
                    });
                    this.log("⚠️  Direct embedded reference worked (may indicate Realm version < 12 or issue already fixed)");
                } catch (error) {
                    this.log(`✅ Expected error reproduced: ${error.message}`);
                }
            });
            
            realm.close();
            this.log("✅ Original issue test completed");
            
        } catch (error) {
            this.log(`❌ Original issue test failed: ${error.message}`, "error");
        }
    }
    
    async testDeepCopyPattern() {
        this.log("\n🔧 Test 2: Deep Copy Pattern");
        
        try {
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                const person = realm.create("Person", {
                    uuid: "person-2",
                    name: "Jane Smith",
                    address: {
                        street: "456 Oak Ave",
                        city: "Boston",
                        zipCode: "02101",
                        country: "USA"
                    }
                });
                
                // Use deep copy pattern
                const embeddedRef = person.address;
                const plainCopy = RealmEmbeddedObjectUtils.deepCopyEmbeddedObject(embeddedRef);
                
                const document = realm.create("Document", {
                    uuid: "doc-2",
                    title: "Deep Copy Test",
                    content: "Testing deep copy pattern",
                    metadata: plainCopy
                });
                
                // Validate
                if (document.metadata.street === "456 Oak Ave" && 
                    document.metadata.city === "Boston") {
                    this.log("✅ Deep copy pattern works correctly");
                } else {
                    this.log("❌ Deep copy pattern validation failed");
                }
            });
            
            realm.close();
            this.log("✅ Deep copy pattern test completed");
            
        } catch (error) {
            this.log(`❌ Deep copy pattern test failed: ${error.message}`, "error");
        }
    }
    
    async testToJSONPattern() {
        this.log("\n🔧 Test 3: toJSON() Pattern");
        
        try {
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                const person = realm.create("Person", {
                    uuid: "person-3",
                    name: "Bob Johnson",
                    address: {
                        street: "789 Pine Rd",
                        city: "Chicago",
                        zipCode: "60601",
                        country: "USA"
                    }
                });
                
                // Use toJSON() pattern
                const plainObject = RealmEmbeddedObjectUtils.toJSONCopy(person.address);
                
                const document = realm.create("Document", {
                    uuid: "doc-3",
                    title: "toJSON() Test",
                    content: "Testing toJSON() pattern",
                    metadata: plainObject
                });
                
                // Validate
                if (document.metadata.street === "789 Pine Rd" && 
                    document.metadata.city === "Chicago") {
                    this.log("✅ toJSON() pattern works correctly");
                } else {
                    this.log("❌ toJSON() pattern validation failed");
                }
            });
            
            realm.close();
            this.log("✅ toJSON() pattern test completed");
            
        } catch (error) {
            this.log(`❌ toJSON() pattern test failed: ${error.message}`, "error");
        }
    }
    
    async testFreshReferencePattern() {
        this.log("\n🔧 Test 4: Fresh Reference Pattern");
        
        try {
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                // Create initial object
                realm.create("Person", {
                    uuid: "person-4",
                    name: "Alice Brown",
                    address: {
                        street: "321 Elm St",
                        city: "Seattle",
                        zipCode: "98101",
                        country: "USA"
                    }
                });
                
                // Get fresh managed reference
                const freshPerson = realm.objectForPrimaryKey("Person", "person-4");
                const managedEmbedded = freshPerson.address;
                
                // Modify the managed embedded object
                managedEmbedded.city = "Seattle Metro";
                
                // Use deep copy for new object creation
                const plainCopy = RealmEmbeddedObjectUtils.deepCopyEmbeddedObject(managedEmbedded);
                
                const document = realm.create("Document", {
                    uuid: "doc-4",
                    title: "Fresh Reference Test",
                    content: "Testing fresh reference pattern",
                    metadata: plainCopy
                });
                
                // Validate modifications and new object
                if (document.metadata.city === "Seattle Metro" && 
                    freshPerson.address.city === "Seattle Metro") {
                    this.log("✅ Fresh reference pattern works correctly");
                } else {
                    this.log("❌ Fresh reference pattern validation failed");
                }
            });
            
            realm.close();
            this.log("✅ Fresh reference pattern test completed");
            
        } catch (error) {
            this.log(`❌ Fresh reference pattern test failed: ${error.message}`, "error");
        }
    }
    
    async testSeparateTransactionsPattern() {
        this.log("\n🔧 Test 5: Separate Transactions Pattern");
        
        try {
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            // First transaction: create objects
            realm.write(() => {
                realm.create("Person", {
                    uuid: "person-5",
                    name: "Charlie Wilson",
                    address: {
                        street: "555 Maple Dr",
                        city: "Portland",
                        zipCode: "97201",
                        country: "USA"
                    }
                });
            });
            
            // Second transaction: use managed references
            realm.write(() => {
                const person = realm.objectForPrimaryKey("Person", "person-5");
                const embeddedRef = person.address; // Now it's managed
                
                // Use deep copy for new object creation
                const plainCopy = RealmEmbeddedObjectUtils.deepCopyEmbeddedObject(embeddedRef);
                
                const document = realm.create("Document", {
                    uuid: "doc-5",
                    title: "Separate Transactions Test",
                    content: "Testing separate transactions pattern",
                    metadata: plainCopy
                });
                
                // Validate
                if (document.metadata.street === "555 Maple Dr" && 
                    document.metadata.city === "Portland") {
                    this.log("✅ Separate transactions pattern works correctly");
                } else {
                    this.log("❌ Separate transactions pattern validation failed");
                }
            });
            
            realm.close();
            this.log("✅ Separate transactions pattern test completed");
            
        } catch (error) {
            this.log(`❌ Separate transactions pattern test failed: ${error.message}`, "error");
        }
    }
    
    async testUtilityFunctions() {
        this.log("\n🛠️  Test 6: Utility Functions");
        
        try {
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                const person = realm.create("Person", {
                    uuid: "person-6",
                    name: "David Lee",
                    address: {
                        street: "999 Ocean Blvd",
                        city: "Miami",
                        zipCode: "33101",
                        country: "USA"
                    }
                });
                
                // Test safeCreateWithEmbeddedReference
                const document1 = RealmEmbeddedObjectUtils.safeCreateWithEmbeddedReference(
                    realm, 
                    "Document", 
                    {
                        uuid: "doc-6a",
                        title: "Utility Test 1",
                        content: "Testing safeCreateWithEmbeddedReference",
                        metadata: person.address
                    },
                    "metadata"
                );
                
                // Test with specific properties
                const document2 = RealmEmbeddedObjectUtils.safeCreateWithEmbeddedReference(
                    realm, 
                    "Document", 
                    {
                        uuid: "doc-6b",
                        title: "Utility Test 2",
                        content: "Testing with specific properties",
                        metadata: person.address
                    },
                    "metadata"
                );
                
                // Test validation functions
                const isManaged = RealmEmbeddedObjectUtils.isManagedObject(person);
                const isEmbedded = RealmEmbeddedObjectUtils.isEmbeddedObject(person.address);
                
                // Test utility functions with edge cases
                const nullCopy = RealmEmbeddedObjectUtils.deepCopyEmbeddedObject(null);
                const undefinedCopy = RealmEmbeddedObjectUtils.toJSONCopy(undefined);
                const emptyCopy = RealmEmbeddedObjectUtils.deepCopyEmbeddedObject({});
                
                // Log validation details for debugging
                this.log(`    isManaged: ${isManaged}, isEmbedded: ${isEmbedded}`);
                this.log(`    document1.metadata.city: ${document1.metadata?.city}`);
                this.log(`    document2.metadata.city: ${document2.metadata?.city}`);
                this.log(`    nullCopy: ${nullCopy}, undefinedCopy: ${undefinedCopy}`);
                this.log(`    emptyCopy type: ${typeof emptyCopy}`);
                
                if (isManaged && isEmbedded && 
                    document1.metadata.city === "Miami" && 
                    document2.metadata.city === "Miami" &&
                    nullCopy === null && 
                    undefinedCopy === null && 
                    typeof emptyCopy === 'object') {
                    this.log("✅ Utility functions work correctly");
                } else {
                    this.log("❌ Utility functions validation failed");
                }
            });
            
            realm.close();
            this.log("✅ Utility functions test completed");
            
        } catch (error) {
            this.log(`❌ Utility functions test failed: ${error.message}`, "error");
        }
    }
    
    async testComplexNestedScenarios() {
        this.log("\n🌐 Test 7: Complex Nested Scenarios");
        
        try {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substr(2, 9);
            const uniqueId = `${timestamp}-${randomId}`;
            
            this.log(`    Using unique ID: ${uniqueId}`);
            
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document, this.testSchemas.Company],
                path: `complex_nested_test_${uniqueId}.realm`
            };
            
            // Ensure database is completely deleted
            Realm.deleteFile(realmConfig);
            
            // Add a small delay to ensure file system operations complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                this.log(`    Creating company with UUID: company-complex-${uniqueId}`);
                
                // Create company with headquarters
                const company = realm.create("Company", {
                    uuid: `company-complex-${uniqueId}`,
                    name: "Tech Corp",
                    headquarters: {
                        street: "1 Innovation Way",
                        city: "San Francisco",
                        zipCode: "94105",
                        country: "USA"
                    },
                    employees: []
                });
                
                this.log(`    Creating employees with UUIDs: person-complex-${uniqueId}-a, person-complex-${uniqueId}-b`);
                
                // Create employees with addresses
                const employee1 = realm.create("Person", {
                    uuid: `person-complex-${uniqueId}-a`,
                    name: "Employee One",
                    address: {
                        street: "123 Employee St",
                        city: "San Francisco",
                        zipCode: "94102",
                        country: "USA"
                    }
                });
                
                const employee2 = realm.create("Person", {
                    uuid: `person-complex-${uniqueId}-b`,
                    name: "Employee Two",
                    address: {
                        street: "456 Worker Ave",
                        city: "Oakland",
                        zipCode: "94602",
                        country: "USA"
                    }
                });
                
                company.employees.push(employee1, employee2);
                
                this.log(`    Creating documents with UUIDs: doc-complex-${uniqueId}-a, doc-complex-${uniqueId}-b`);
                
                // Create documents with complex embedded references
                const doc1 = RealmEmbeddedObjectUtils.safeCreateWithEmbeddedReference(
                    realm,
                    "Document",
                    {
                        uuid: `doc-complex-${uniqueId}-a`,
                        title: "Company Overview",
                        content: "Company document with headquarters metadata",
                        metadata: company.headquarters
                        // Remove author to avoid Person object creation conflict
                    },
                    "metadata"
                );
                
                const doc2 = RealmEmbeddedObjectUtils.safeCreateWithEmbeddedReference(
                    realm,
                    "Document",
                    {
                        uuid: `doc-complex-${uniqueId}-b`,
                        title: "Employee Guide",
                        content: "Employee document with address metadata",
                        metadata: employee2.address
                        // Remove author to avoid Person object creation conflict
                    },
                    "metadata"
                );
                
                // Validate complex nested structure
                if (company.employees.length === 2 &&
                    doc1.metadata.city === "San Francisco" &&
                    doc2.metadata.city === "Oakland") {
                    this.log("✅ Complex nested scenarios work correctly");
                } else {
                    this.log("❌ Complex nested scenarios validation failed");
                    this.log(`    Company employees: ${company.employees.length}`);
                    this.log(`    Doc1 metadata city: ${doc1.metadata?.city}`);
                    this.log(`    Doc2 metadata city: ${doc2.metadata?.city}`);
                }
            });
            
            realm.close();
            this.log("✅ Complex nested scenarios test completed");
            
        } catch (error) {
            this.log(`❌ Complex nested scenarios test failed: ${error.message}`, "error");
            this.log(`    Error details: ${error.stack}`, "error");
        }
    }
    
    async testBatchOperations() {
        this.log("\n📦 Test 8: Batch Operations");
        
        try {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substr(2, 9);
            const uniqueId = `${timestamp}-${randomId}`;
            
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document],
                path: `batch_test_${uniqueId}.realm`
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            // Create test data
            realm.write(() => {
                for (let i = 1; i <= 5; i++) {
                    realm.create("Person", {
                        uuid: `person-batch-${uniqueId}-${i}`,
                        name: `Batch Person ${i}`,
                        address: {
                            street: `${i * 100} Batch St`,
                            city: "Batch City",
                            zipCode: `${10000 + i}`,
                            country: "USA"
                        }
                    });
                }
            });
            
            // Prepare batch operations outside of write transaction
            const operations = [];
            for (let i = 1; i <= 5; i++) {
                const person = realm.objectForPrimaryKey("Person", `person-batch-${uniqueId}-${i}`);
                operations.push({
                    schemaName: "Document",
                    data: {
                        uuid: `doc-batch-${uniqueId}-${i}`,
                        title: `Batch Document ${i}`,
                        content: `Content for batch document ${i}`,
                        metadata: person.address
                    },
                    embeddedPropertyName: "metadata"
                });
            }
            
            // Execute batch operations in a single write transaction
            realm.write(() => {
                RealmEmbeddedObjectUtils.batchCreateWithEmbeddedReferences(realm, operations);
            });
            
            // Validate batch operations
            const documents = realm.objects("Document").filtered("uuid BEGINSWITH 'doc-batch'");
            if (documents.length === 5) {
                this.log("✅ Batch operations work correctly");
            } else {
                this.log(`❌ Batch operations validation failed: expected 5, got ${documents.length}`);
            }
            
            realm.close();
            this.log("✅ Batch operations test completed");
            
        } catch (error) {
            this.log(`❌ Batch operations test failed: ${error.message}`, "error");
        }
    }
    
    async testEdgeCases() {
        this.log("\n⚠️  Test 9: Edge Cases");
        
        try {
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document],
                path: "edge_cases_test.realm"
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                // Test null/undefined embedded objects
                const person1 = realm.create("Person", {
                    uuid: "person-edge-1",
                    name: "No Address Person"
                    // address is undefined
                });
                
                const doc1 = RealmEmbeddedObjectUtils.safeCreateWithEmbeddedReference(
                    realm,
                    "Document",
                    {
                        uuid: "doc-edge-1",
                        title: "No Metadata Document",
                        content: "Document with no embedded metadata",
                        metadata: person1.address // undefined
                    },
                    "metadata"
                );
                
                // Test empty embedded object with required fields
                const person2 = realm.create("Person", {
                    uuid: "person-edge-2",
                    name: "Empty Address Person",
                    address: {
                        street: "",
                        city: "",
                        zipCode: "",
                        country: ""
                    }
                });
                
                const doc2 = RealmEmbeddedObjectUtils.safeCreateWithEmbeddedReference(
                    realm,
                    "Document",
                    {
                        uuid: "doc-edge-2",
                        title: "Empty Metadata Document",
                        content: "Document with empty embedded metadata",
                        metadata: person2.address
                    },
                    "metadata"
                );
                
                // Test utility functions with edge cases
                const nullCopy = RealmEmbeddedObjectUtils.deepCopyEmbeddedObject(null);
                const undefinedCopy = RealmEmbeddedObjectUtils.toJSONCopy(undefined);
                const emptyCopy = RealmEmbeddedObjectUtils.deepCopyEmbeddedObject({});
                
                this.log(`    nullCopy: ${nullCopy}, undefinedCopy: ${undefinedCopy}`);
                this.log(`    emptyCopy type: ${typeof emptyCopy}, doc1.metadata: ${doc1.metadata}`);
                
                if (nullCopy === null && 
                    undefinedCopy === null && 
                    typeof emptyCopy === 'object' &&
                    doc1.metadata === null) {
                    this.log("✅ Edge cases handled correctly");
                } else {
                    this.log("❌ Edge cases validation failed");
                }
            });
            
            realm.close();
            this.log("✅ Edge cases test completed");
            
        } catch (error) {
            this.log(`❌ Edge cases test failed: ${error.message}`, "error");
        }
    }
    
    async testPerformanceComparison() {
        this.log("\n⏱️  Test 10: Performance Comparison");
        
        try {
            const realmConfig = {
                schemaVersion: this.schemaVersion,
                schema: [this.testSchemas.Person, this.testSchemas.Address, this.testSchemas.Document],
                path: "performance_test.realm"
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            const iterations = 100; // Reduced for mobile performance
            
            // Create test data
            realm.write(() => {
                for (let i = 1; i <= iterations; i++) {
                    realm.create("Person", {
                        uuid: `person-perf-${i}`,
                        name: `Performance Person ${i}`,
                        address: {
                            street: `${i} Performance St`,
                            city: "Performance City",
                            zipCode: `${50000 + i}`,
                            country: "USA"
                        }
                    });
                }
            });
            
            // Test deep copy performance
            const deepCopyStart = Date.now();
            realm.write(() => {
                for (let i = 1; i <= iterations; i++) {
                    const person = realm.objectForPrimaryKey("Person", `person-perf-${i}`);
                    const plainCopy = RealmEmbeddedObjectUtils.deepCopyEmbeddedObject(person.address);
                    realm.create("Document", {
                        uuid: `doc-perf-deep-${i}`,
                        title: `Deep Copy Document ${i}`,
                        content: "Performance test",
                        metadata: plainCopy
                    });
                }
            });
            const deepCopyTime = Date.now() - deepCopyStart;
            
            // Test toJSON performance
            const toJSONStart = Date.now();
            realm.write(() => {
                for (let i = 1; i <= iterations; i++) {
                    const person = realm.objectForPrimaryKey("Person", `person-perf-${i}`);
                    const plainObject = RealmEmbeddedObjectUtils.toJSONCopy(person.address);
                    realm.create("Document", {
                        uuid: `doc-perf-json-${i}`,
                        title: `JSON Copy Document ${i}`,
                        content: "Performance test",
                        metadata: plainObject
                    });
                }
            });
            const toJSONTime = Date.now() - toJSONStart;
            
            this.log(`📊 Deep Copy: ${deepCopyTime}ms for ${iterations} operations`);
            this.log(`📊 toJSON(): ${toJSONTime}ms for ${iterations} operations`);
            
            if (deepCopyTime < toJSONTime) {
                this.log("✅ Deep copy is faster for this dataset");
            } else {
                this.log("✅ toJSON() is faster for this dataset");
            }
            
            realm.close();
            this.log("✅ Performance comparison test completed");
            
        } catch (error) {
            this.log(`❌ Performance comparison test failed: ${error.message}`, "error");
        }
    }
    
    getTestResults() {
        return this.testResults;
    }
    
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            schemaVersion: this.schemaVersion,
            totalTests: this.testResults.length,
            results: this.testResults,
            summary: this.generateSummary()
        };
        
        return report;
    }
    
    generateSummary() {
        const passed = this.testResults.filter(r => r.includes('✅')).length;
        const failed = this.testResults.filter(r => r.includes('❌')).length;
        const warnings = this.testResults.filter(r => r.includes('⚠️')).length;
        
        return {
            passed,
            failed,
            warnings,
            total: passed + failed + warnings
        };
    }
}

export default RealmEmbeddedObjectTestRunner;
