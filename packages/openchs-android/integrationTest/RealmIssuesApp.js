import {Component} from "react";
import {View, Text, ScrollView} from "react-native";
import { RealmEmbeddedObjectUtils, EmbeddedObjectPatterns } from "openchs-models";
import RealmEmbeddedObjectTestRunner from "./RealmEmbeddedObjectTestRunner";

const commentSchema = {
    name: "Comment",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        subject: {type: "object", objectType: "Individual"},
        text: "string"
    },
};

const individualSchema = {
    name: "Individual",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        name: "string"
    },
};

const postSchema = {
    name: "Post",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        title: "string",
        author: {type: "object", objectType: "Individual"},
        comments: {type: "list", objectType: "Comment"}
    },
};

const addressSchema = {
    name: "Address",
    embedded: true,
    properties: {
        street: "string",
        city: "string",
        zipCode: "string"
    }
};

const individualWithAddressSchema = {
    name: "IndividualWithAddress",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        name: "string",
        address: {type: "object", objectType: "Address", optional: true}
    },
};

const documentSchema = {
    name: "Document",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        content: "string",
        metadata: {type: "object", objectType: "Address", optional: true}
    },
};

class RealmIssuesApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            testResults: []
        };
    }

    componentDidMount() {
        this.runComprehensiveTests();
    }

    log(message) {
        console.log(message);
        this.setState(prevState => ({
            testResults: [...prevState.testResults, message]
        }));
    }

    async runComprehensiveTests() {
        this.log("🚀 Starting Comprehensive Realm Embedded Object Tests");
        this.log("=" .repeat(80));
        
        try {
            // Initialize the comprehensive test runner
            const testRunner = new RealmEmbeddedObjectTestRunner();
            
            // Run all tests
            const results = await testRunner.runAllTests();
            
            // Add results to state
            this.setState(prevState => ({
                testResults: [...prevState.testResults, ...results]
            }));
            
            // Generate and display summary
            const report = testRunner.generateReport();
            this.log("\n" + "=".repeat(80));
            this.log("📊 TEST SUMMARY");
            this.log("=".repeat(80));
            this.log(`Total Tests: ${report.summary.total}`);
            this.log(`Passed: ${report.summary.passed} ✅`);
            this.log(`Failed: ${report.summary.failed} ❌`);
            this.log(`Warnings: ${report.summary.warnings} ⚠️`);
            this.log("=".repeat(80));
            
            // Display recommended patterns
            this.log("\n📚 RECOMMENDED PATTERNS FOR REALM 12+");
            this.log("=".repeat(80));
            this.log("1. ✅ Deep Copy Pattern: Most reliable for all scenarios");
            this.log("2. ✅ toJSON() Pattern: Convenient and readable");
            this.log("3. ✅ Fresh Reference Pattern: Best for modifications");
            this.log("4. ✅ Separate Transactions Pattern: Clean separation of concerns");
            this.log("5. ✅ Utility Functions: Use RealmEmbeddedObjectUtils for safety");
            this.log("=".repeat(80));
            
        } catch (error) {
            this.log(`❌ Comprehensive test suite failed: ${error.message}`);
        }
    }

    testEmbeddedObjectReferenceIssue() {
        this.log("\n=== Test 1: Reproducing Embedded Object Reference Issue ===");
        
        try {
            const realmConfig = {
                schemaVersion: 204,
                schema: [individualWithAddressSchema, addressSchema, documentSchema]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                // Create individual with embedded address
                const individual = realm.create("IndividualWithAddress", {
                    uuid: "individual-1",
                    name: "John Doe",
                    address: {
                        street: "123 Main St",
                        city: "New York",
                        zipCode: "10001"
                    }
                });
                
                // Try to use the embedded object reference directly (this should fail in Realm 12)
                try {
                    const embeddedAddressRef = individual.address;
                    
                    // This should cause the "unmanaged object" error in Realm 12
                    const document = realm.create("Document", {
                        uuid: "doc-1",
                        content: "Test document",
                        metadata: embeddedAddressRef // This is the problematic line
                    });
                    
                    this.log("❌ UNEXPECTED: Direct embedded object reference worked (should fail in Realm 12)");
                } catch (error) {
                    this.log(`✅ EXPECTED: Embedded object reference failed: ${error.message}`);
                }
            });
            
            realm.close();
        } catch (error) {
            this.log(`❌ Test 1 failed: ${error.message}`);
        }
    }

    testDeepCopyFix() {
        this.log("\n=== Test 2: Deep Copy Fix Validation ===");
        
        try {
            const realmConfig = {
                schemaVersion: 204,
                schema: [individualWithAddressSchema, addressSchema, documentSchema]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                // Create individual with embedded address
                const individual = realm.create("IndividualWithAddress", {
                    uuid: "individual-2",
                    name: "Jane Smith",
                    address: {
                        street: "456 Oak Ave",
                        city: "Boston",
                        zipCode: "02101"
                    }
                });
                
                // Fix 1: Deep copy the embedded object
                const embeddedAddressRef = individual.address;
                const plainCopy = {
                    street: embeddedAddressRef.street,
                    city: embeddedAddressRef.city,
                    zipCode: embeddedAddressRef.zipCode
                };
                
                // Use the plain copy to create new object
                const document = realm.create("Document", {
                    uuid: "doc-2",
                    content: "Test document with deep copy",
                    metadata: plainCopy
                });
                
                // Verify the data was copied correctly
                if (document.metadata.street === "456 Oak Ave" && 
                    document.metadata.city === "Boston") {
                    this.log("✅ Deep copy fix works correctly");
                } else {
                    this.log("❌ Deep copy fix failed: data not copied correctly");
                }
            });
            
            realm.close();
        } catch (error) {
            this.log(`❌ Test 2 failed: ${error.message}`);
        }
    }

    testToJSONFix() {
        this.log("\n=== Test 3: toJSON() Fix Validation ===");
        
        try {
            const realmConfig = {
                schemaVersion: 204,
                schema: [individualWithAddressSchema, addressSchema, documentSchema]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                // Create individual with embedded address
                const individual = realm.create("IndividualWithAddress", {
                    uuid: "individual-3",
                    name: "Bob Johnson",
                    address: {
                        street: "789 Pine Rd",
                        city: "Chicago",
                        zipCode: "60601"
                    }
                });
                
                // Fix 2: Use toJSON() method
                const embeddedAddressRef = individual.address;
                const plainObject = embeddedAddressRef.toJSON();
                
                // Use the plain object to create new object
                const document = realm.create("Document", {
                    uuid: "doc-3",
                    content: "Test document with toJSON()",
                    metadata: plainObject
                });
                
                // Verify the data was copied correctly
                if (document.metadata.street === "789 Pine Rd" && 
                    document.metadata.city === "Chicago") {
                    this.log("✅ toJSON() fix works correctly");
                } else {
                    this.log("❌ toJSON() fix failed: data not copied correctly");
                }
            });
            
            realm.close();
        } catch (error) {
            this.log(`❌ Test 3 failed: ${error.message}`);
        }
    }

    testFreshReferenceFix() {
        this.log("\n=== Test 4: Fresh Reference Fix Validation ===");
        
        try {
            const realmConfig = {
                schemaVersion: 204,
                schema: [individualWithAddressSchema, addressSchema, documentSchema]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                // Create individual with embedded object
                const individual = realm.create("IndividualWithAddress", {
                    uuid: "individual-4",
                    name: "Alice Brown",
                    address: {
                        street: "321 Elm St",
                        city: "Seattle",
                        zipCode: "98101"
                    }
                });
                
                // Fix 3: Query for fresh reference
                const freshIndividual = realm.objectForPrimaryKey("IndividualWithAddress", "individual-4");
                const managedEmbedded = freshIndividual.address;
                
                // Now we can use the managed reference
                managedEmbedded.street = "322 Elm St"; // Modify the managed embedded object
                
                // Create document using the managed reference with deep copy
                const plainCopy = {
                    street: managedEmbedded.street,
                    city: managedEmbedded.city,
                    zipCode: managedEmbedded.zipCode
                };
                
                const document = realm.create("Document", {
                    uuid: "doc-4",
                    content: "Test document with fresh reference",
                    metadata: plainCopy
                });
                
                // Verify the modifications and data
                if (document.metadata.street === "322 Elm St" && 
                    individual.address.street === "322 Elm St") {
                    this.log("✅ Fresh reference fix works correctly");
                } else {
                    this.log("❌ Fresh reference fix failed: modifications not reflected");
                }
            });
            
            realm.close();
        } catch (error) {
            this.log(`❌ Test 4 failed: ${error.message}`);
        }
    }

    testSeparateTransactionsFix() {
        this.log("\n=== Test 5: Separate Transactions Fix Validation ===");
        
        try {
            const realmConfig = {
                schemaVersion: 204,
                schema: [individualWithAddressSchema, addressSchema, documentSchema]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            // First transaction: create embedded object
            realm.write(() => {
                const individual = realm.create("IndividualWithAddress", {
                    uuid: "individual-5",
                    name: "Charlie Wilson",
                    address: {
                        street: "555 Maple Dr",
                        city: "Portland",
                        zipCode: "97201"
                    }
                });
            });
            
            // Second transaction: use the reference
            realm.write(() => {
                const individual = realm.objectForPrimaryKey("IndividualWithAddress", "individual-5");
                const embeddedRef = individual.address; // Now it's managed
                
                // Use deep copy approach in separate transaction
                const plainCopy = {
                    street: embeddedRef.street,
                    city: embeddedRef.city,
                    zipCode: embeddedRef.zipCode
                };
                
                const document = realm.create("Document", {
                    uuid: "doc-5",
                    content: "Test document with separate transactions",
                    metadata: plainCopy
                });
                
                // Verify the data
                if (document.metadata.street === "555 Maple Dr" && 
                    document.metadata.city === "Portland") {
                    this.log("✅ Separate transactions fix works correctly");
                } else {
                    this.log("❌ Separate transactions fix failed: data not copied correctly");
                }
            });
            
            realm.close();
        } catch (error) {
            this.log(`❌ Test 5 failed: ${error.message}`);
        }
    }

    testComplexNestedEmbeddedObjects() {
        this.log("\n=== Test 6: Complex Nested Embedded Objects ===");
        
        try {
            const realmConfig = {
                schemaVersion: 204,
                schema: [commentSchema, individualSchema, postSchema, individualWithAddressSchema, addressSchema]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                // Create individual with address
                const individual = realm.create("IndividualWithAddress", {
                    uuid: "individual-6",
                    name: "David Lee",
                    address: {
                        street: "999 Ocean Blvd",
                        city: "Miami",
                        zipCode: "33101"
                    }
                });
                
                // Create comment with embedded subject reference
                const comment = realm.create("Comment", {
                    uuid: "comment-6",
                    text: "Great post!",
                    subject: {
                        uuid: individual.uuid,
                        name: individual.name
                    }
                });
                
                // Create post with embedded author and list of comments
                const post = realm.create("Post", {
                    uuid: "post-6",
                    title: "Test Post",
                    author: {
                        uuid: individual.uuid,
                        name: individual.name
                    },
                    comments: [comment]
                });
                
                // Test modifying embedded objects through different paths
                individual.address.city = "Miami Beach";
                
                // Verify complex nested structure
                if (post.author.name === "David Lee" && 
                    post.comments[0].subject.name === "David Lee" &&
                    individual.address.city === "Miami Beach") {
                    this.log("✅ Complex nested embedded objects work correctly");
                } else {
                    this.log("❌ Complex nested embedded objects failed");
                }
            });
            
            realm.close();
        } catch (error) {
            this.log(`❌ Test 6 failed: ${error.message}`);
        }
    }

    render() {
        return (
            <View style={{padding: 20, flex: 1}}>
                <Text style={{
                    fontSize: 20, 
                    fontWeight: 'bold', 
                    color: '#333', 
                    marginBottom: 10,
                    borderBottomWidth: 2,
                    borderBottomColor: '#007bff',
                    paddingBottom: 10
                }}>
                    🧪 Realm Embedded Object Tests - Schema Version 204
                </Text>
                <ScrollView style={{
                    backgroundColor: '#f8f9fa', 
                    borderWidth: 1, 
                    borderColor: '#dee2e6', 
                    borderRadius: 5, 
                    padding: 15,
                    flex: 1
                }}>
                    <Text style={{
                        fontFamily: 'monospace', 
                        fontSize: 12, 
                        color: '#333'
                    }}>
                        {this.state.testResults.join('\\n')}
                    </Text>
                </ScrollView>
                <View style={{marginTop: 20, padding: 15, backgroundColor: '#e9ecef', borderRadius: 5}}>
                    <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#495057'}}>
                        📋 Test Information
                    </Text>
                    <Text style={{fontSize: 14, color: '#6c757d', marginBottom: 5}}>
                        <Text style={{fontWeight: 'bold'}}>Schema Version:</Text> 204 (matching Avni models)
                    </Text>
                    <Text style={{fontSize: 14, color: '#6c757d', marginBottom: 5}}>
                        <Text style={{fontWeight: 'bold'}}>Realm Issue:</Text> Embedded object reference invalidation in Realm 12+
                    </Text>
                    <Text style={{fontSize: 14, color: '#6c757d'}}>
                        <Text style={{fontWeight: 'bold'}}>Purpose:</Text> Reproduce issue and validate all recommended fixes
                    </Text>
                </View>
            </View>
        );
    }
}

export default RealmIssuesApp;
