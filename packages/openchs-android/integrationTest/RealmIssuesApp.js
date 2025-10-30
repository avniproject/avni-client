import {Component} from "react";
import {View, Text, ScrollView} from "react-native";
import RealmNestedObjectFrameworkTest from "./RealmNestedObjectFrameworkTest.js";
import { JSONStringify } from "openchs-models";

/**
 * Realm Nested Object Framework Validation App
 * Tests the production-ready framework-level nested object handling
 */
class RealmIssuesApp extends Component {
    
    constructor(props) {
        super(props);
        this.state = {
            testResults: []
        };
    }

    componentDidMount() {
        this.runFrameworkValidation();
    }

    log(message) {
        console.log(message);
        this.setState(prevState => ({
            testResults: [...prevState.testResults, message]
        }));
    }

    async runFrameworkValidation() {
        try {
            const frameworkTest = new RealmNestedObjectFrameworkTest();
            const results = await frameworkTest.runValidation();
            
            this.setState(prevState => ({
                testResults: [...prevState.testResults, ...results]
            }));
            
        } catch (error) {
            this.log(`❌ Framework validation failed: ${error.message}`);
        }
    }

    testNestedObjectReferenceIssue() {
        this.log("\n=== Test 1: Reproducing Nested Object Reference Issue ===");
        
        try {
            const realmConfig = {
                schemaVersion: 204,
                schema: [individualWithAddressSchema, addressSchema, documentSchema]
            };
            
            Realm.deleteFile(realmConfig);
            const realm = new Realm(realmConfig);
            
            realm.write(() => {
                // Create individual with nested address
                const individual = realm.create("IndividualWithAddress", {
                    uuid: "individual-1",
                    name: "John Doe",
                    address: {
                        street: "123 Main St",
                        city: "New York",
                        zipCode: "10001"
                    }
                });
                
                // Try to use the nested object reference directly (this should fail in Realm 12)
                try {
                    const nestedAddressRef = individual.address;
                    
                    // This should cause the "unmanaged object" error in Realm 12
                    const document = realm.create("Document", {
                        uuid: "doc-1",
                        content: "Test document",
                        metadata: nestedAddressRef // This is the problematic line
                    });
                    
                    this.log("❌ UNEXPECTED: Direct nested object reference worked (should fail in Realm 12)");
                } catch (error) {
                    this.log(`✅ EXPECTED: Nested object reference failed: ${error.message}`);
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
                // Create individual with nested address
                const individual = realm.create("IndividualWithAddress", {
                    uuid: "individual-2",
                    name: "Jane Smith",
                    address: {
                        street: "456 Oak Ave",
                        city: "Boston",
                        zipCode: "02101"
                    }
                });
                
                // Fix 1: Deep copy the nested object
                const nestedAddressRef = individual.address;
                const plainCopy = {
                    street: nestedAddressRef.street,
                    city: nestedAddressRef.city,
                    zipCode: nestedAddressRef.zipCode
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
                // Create individual with nested address
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
                const nestedAddressRef = individual.address;
                const plainObject = nestedAddressRef.toJSON();
                
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
                // Create individual with nested object
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
                const managedNested = freshIndividual.address;
                
                // Now we can use the managed reference
                managedNested.street = "322 Elm St"; // Modify the managed nested object
                
                // Create document using the managed reference with deep copy
                const plainCopy = {
                    street: managedNested.street,
                    city: managedNested.city,
                    zipCode: managedNested.zipCode
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
            
            // First transaction: create nested object
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
                const nestedRef = individual.address; // Now it's managed
                
                // Use deep copy approach in separate transaction
                const plainCopy = {
                    street: nestedRef.street,
                    city: nestedRef.city,
                    zipCode: nestedRef.zipCode
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

    testComplexNestedObjects() {
        this.log("\n=== Test 6: Complex Nested Objects ===");
        
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
                
                // Create comment with nested subject reference
                const comment = realm.create("Comment", {
                    uuid: "comment-6",
                    text: "Great post!",
                    subject: {
                        uuid: individual.uuid,
                        name: individual.name
                    }
                });
                
                // Create post with nested author and list of comments
                const post = realm.create("Post", {
                    uuid: "post-6",
                    title: "Test Post",
                    author: {
                        uuid: individual.uuid,
                        name: individual.name
                    },
                    comments: [comment]
                });
                
                // Test modifying nested objects through different paths
                individual.address.city = "Miami Beach";
                
                // Verify complex nested structure
                if (post.author.name === "David Lee" && 
                    post.comments[0].subject.name === "David Lee" &&
                    individual.address.city === "Miami Beach") {
                    this.log("✅ Complex nested objects work correctly");
                } else {
                    this.log("❌ Complex nested objects failed");
                }
            });
            
            realm.close();
        } catch (error) {
            this.log(`❌ Test 6 failed: ${error.message}`);
        }
    }

    render() {
        return (
            <View style={{ flex: 1, padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                    🚀 Realm Nested Object Framework
                </Text>
                <Text style={{ fontSize: 14, marginBottom: 20, color: '#666' }}>
                    Production-ready automatic nested object handling
                </Text>
                <ScrollView style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 18 }}>
                        {this.state.testResults.map((result, index) => `${ JSONStringify(result) || result}`).join('\n')}
                    </Text>
                </ScrollView>
            </View>
        );
    }
}

export default RealmIssuesApp;
