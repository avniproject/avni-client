## **Purpose**

We did a risk assessment of continuing to use Realm based on the speed of maintenance of the database, and the speed of development of other areas of the ecosystem. Details are documented [here](https://github.com/avniproject/avni-client/blob/master/docs/realmDBFutureRoadMapRiskAssessmentAndMigrationPlan.md). What this means is that it is the right time to start thinking about a replacement. 

## **Analysis**

### **New Database Considerations**

#### ORM / Object Mapping Support

The replacement must provide an ORM or object-database abstraction so that models can be fetched and hydrated automatically from the database, rather than requiring manual SQL-to-object mapping everywhere.

#### Observation Query Performance

The app is IO-heavy. Many queries filter on observations — a nested, polymorphic structure stored as JSON. The replacement must support:

* Indexing on nested/related objects (e.g. `observations.concept.uuid`)  
* JSON field querying (e.g. `valueJSON CONTAINS "..."`)  
* Deep relationship traversal in queries (e.g. `programEnrolment.individual.lowestAddressLevel.uuid`)

#### Long-term Maintenance & Community Health

The database must be well-supported with a strong likelihood of active maintenance for the next 10+ years. Evaluate:

* Backing organization / funding model  
* Community size and activity  
* Release cadence and issue responsiveness  
* Track record of surviving React Native breaking changes

#### Result Streaming to Lists

Large result sets (10K+ entities, chunked at 500\) must be streamable or lazily loadable into list views without materializing the entire dataset into memory at once.

#### Encryption at Rest

The app handles health data and currently uses Realm's transparent encryption. The replacement must support database-level encryption with a user-provided key.

#### External Schema Definition Compatibility

\~50 schemas are defined in the external `openchs-models` package, not in this app. The replacement must work with schemas defined and versioned in a separate library, or a clear refactoring path must exist.

#### Upsert Support

The sync pipeline relies heavily on save-or-update semantics (`Realm.UpdateMode.Modified`). The replacement must support efficient upserts by primary key.

#### Bulk Write Performance

Sync and data operations involve large batch writes (up to 1000 items). The replacement needs good bulk insert/upsert throughput within transactions.

#### Transaction Support

The codebase uses nested transaction detection (`db.isInTransaction`) and wraps groups of writes in single transactions. The replacement must support explicit transactions with the ability to detect whether one is already active.

#### React Native Compatibility

Must support React Native 0.76+ and ideally both the old and new RN architectures (JSI / TurboModules). Should have a track record of keeping up with RN version upgrades.

### **Databases analysed**

1. Expo-sqlite \+ Drizzle  
2. Op-sqlite \+ Drizzle  
3. WatermelonDB

WatermelonDB has had maintenance concerns (staying up to date). Expo and op-sqlite and equivalent, especially when using Drizzle. Op-sqlite provides a faster retrieval, which might come in handy because we do quite a bit of IO. Sqlite appears to be our only popular option at this time. 

**Chosen:** op-sqlite \+ Drizzle ORM

## **Development**

**Initial analysis**

1. Check if existing avni-models can be reused in the exact same way with op-sqlite (we will have to live with both for a while)  
2. Write a script that migrates a bunch of Realm dbs to sqlite. Look for  
   1. Data types, and how they can be managed  
   2. Some complex queries, and how they can be written  
3. Keep 5 different sqlite databases, and their realm versions for testing. These will be our standard databases for testing. Ensure that the data is sanitised

**Before introducing sqlite**

1. Move all database access to a repository layer  
2. Ensure the repository layer has clean APIs that can be used by report card queries  
3. Build a db provider that switches based on org configuration. Build this configuration on the server  
4. Build a test suite that validates the repository methods. This should work on our previous standard databases that we created in the initial analysis.   
5. Continue working on the dashboard cards, migrating them one after another to use the repository methods alone. Testing will happen through a realm db. 

**Migration**

1. Build feature by feature. Assuming we have a sqlite standard db, this section can be parallelized  
2. Test report cards with the new sqlite version as well, and confirm that the results match

## **Rollout**

1. We migrate org by org into the new structure. We will ask people to do a fresh sync. We will need to figure out a good strategy to make initial syncs faster  
2. Provide an option to delay migration upto a certain point, beyond which it becomes mandatory  
3. We will need to maintain who all migrated within our system, and provide this as reports to orgs  
4. We keep a backup of the old realm db  
5. We need to provide orgs with ability to control staged roll out of switch to op-sql for their users (Using special user-group or so), this should then create reset-sync which would ensure fresh sync happens on the targeted DB-backed version

## **Questions**

1. How do we deal with fast sync? Can cause issues with sync-concept and variance in user-group permissions.

