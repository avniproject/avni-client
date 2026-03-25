import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {Individual, ProgramEncounter, ProgramEnrolment, Encounter, Concept} from "openchs-models";
import General from "../utility/General";
import _ from "lodash";

const TARGETS = {
    searchMs: 20,
    dashboardMs: 1000,
};

function timeIt(fn) {
    const start = Date.now();
    const result = fn();
    return {elapsed: Date.now() - start, result};
}

@Service("performanceBenchmarkService")
class PerformanceBenchmarkService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    runAll() {
        General.logInfo("PerfBenchmark", "=== PERFORMANCE BENCHMARK START ===");
        const results = [];
        const benchmarks = [
            ["Search", () => this._benchmarkSearch()],
            ["Dashboard", () => this._benchmarkDashboardQueries()],
            ["Filtered", () => this._benchmarkFilteredQueries()],
            ["Sorted", () => this._benchmarkSortedQueries()],
            ["Hydration", () => this._benchmarkHydration()],
        ];
        for (const [name, fn] of benchmarks) {
            try {
                results.push(...fn());
            } catch (e) {
                General.logError("PerfBenchmark", `${name} benchmark failed: ${e.message || e}`);
            }
        }

        this._printReport(results);
        return results;
    }

    _benchmarkSearch() {
        const results = [];

        // 1a. findAll + sorted (the core of IndividualService.search with no filter criteria)
        const {elapsed: findAllSortedMs, result: allSorted} = timeIt(() => {
            return this.findAll(Individual.schema.name).sorted("name");
        });
        const totalSubjects = allSorted.length;
        results.push({
            name: "findAll(Individual).sorted(name)",
            elapsed: findAllSortedMs,
            rows: totalSubjects,
            target: null,
            note: "Baseline: full table scan + sort"
        });

        // 1b. Search with name filter (CONTAINS[c])
        if (totalSubjects > 0) {
            const sampleName = this._getSampleName(allSorted);
            if (sampleName) {
                const {elapsed: searchMs, result: searchResult} = timeIt(() => {
                    return this.findAll(Individual.schema.name)
                        .filtered("voided = false AND name CONTAINS[c] $0", sampleName)
                        .sorted("name");
                });
                results.push({
                    name: `search(name CONTAINS[c] "${sampleName}")`,
                    elapsed: searchMs,
                    rows: searchResult.length,
                    target: TARGETS.searchMs,
                    note: `Target: ≤${TARGETS.searchMs}ms for 1000 entities`
                });
            }
        }

        // 1c. findByUUID (single lookup)
        if (totalSubjects > 0) {
            const uuid = allSorted[0].uuid;
            const times = [];
            for (let i = 0; i < 10; i++) {
                const {elapsed} = timeIt(() => this.findByUUID(uuid, Individual.schema.name));
                times.push(elapsed);
            }
            const avgMs = _.mean(times);
            results.push({
                name: "findByUUID(Individual) x10 avg",
                elapsed: Math.round(avgMs * 100) / 100,
                rows: 1,
                target: 5,
                note: "Target: ≤5ms per lookup"
            });
        }

        return results;
    }

    _benchmarkDashboardQueries() {
        const results = [];
        const now = new Date();
        const dateMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const dateMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        // 2a. Scheduled visits query
        const {elapsed: scheduledMs, result: scheduled} = timeIt(() => {
            return this.findAll(ProgramEncounter.schema.name)
                .filtered(
                    'earliestVisitDateTime <= $0 ' +
                    'AND maxVisitDateTime >= $1 ' +
                    'AND encounterDateTime = null ' +
                    'AND cancelDateTime = null ' +
                    'AND programEnrolment.programExitDateTime = null ' +
                    'AND programEnrolment.voided = false ' +
                    'AND programEnrolment.individual.voided = false ' +
                    'AND voided = false',
                    dateMidnight,
                    dateMorning
                );
        });
        results.push({
            name: "Dashboard: scheduled visits",
            elapsed: scheduledMs,
            rows: scheduled.length,
            target: TARGETS.dashboardMs,
            note: "ProgramEncounter multi-join filter"
        });

        // 2b. Overdue visits query
        const {elapsed: overdueMs, result: overdue} = timeIt(() => {
            return this.findAll(ProgramEncounter.schema.name)
                .filtered(
                    'maxVisitDateTime < $0 ' +
                    'AND cancelDateTime = null ' +
                    'AND encounterDateTime = null ' +
                    'AND programEnrolment.programExitDateTime = null ' +
                    'AND programEnrolment.voided = false ' +
                    'AND programEnrolment.individual.voided = false ' +
                    'AND voided = false',
                    dateMorning
                );
        });
        results.push({
            name: "Dashboard: overdue visits",
            elapsed: overdueMs,
            rows: overdue.length,
            target: TARGETS.dashboardMs,
            note: "ProgramEncounter multi-join filter"
        });

        // 2c. Total (all non-voided individuals sorted)
        const {elapsed: totalMs, result: total} = timeIt(() => {
            return this.findAll(Individual.schema.name)
                .filtered("voided = false")
                .sorted("name");
        });
        results.push({
            name: "Dashboard: total subjects",
            elapsed: totalMs,
            rows: total.length,
            target: TARGETS.dashboardMs,
            note: "All non-voided individuals"
        });

        // 2d. General encounters scheduled
        const {elapsed: genEncMs, result: genEnc} = timeIt(() => {
            return this.findAll(Encounter.schema.name)
                .filtered(
                    'earliestVisitDateTime <= $0 ' +
                    'AND maxVisitDateTime >= $1 ' +
                    'AND encounterDateTime = null ' +
                    'AND cancelDateTime = null ' +
                    'AND individual.voided = false ' +
                    'AND voided = false',
                    dateMidnight,
                    dateMorning
                );
        });
        results.push({
            name: "Dashboard: general encounters scheduled",
            elapsed: genEncMs,
            rows: genEnc.length,
            target: TARGETS.dashboardMs,
            note: "Encounter with individual join"
        });

        return results;
    }

    _benchmarkFilteredQueries() {
        const results = [];

        // 3a. Active enrolments
        const {elapsed: enrolMs, result: enrols} = timeIt(() => {
            return this.findAll(ProgramEnrolment.schema.name)
                .filtered("programExitDateTime = null AND voided = false AND individual.voided = false");
        });
        results.push({
            name: "Active enrolments",
            elapsed: enrolMs,
            rows: enrols.length,
            target: null,
            note: "ProgramEnrolment with individual join"
        });

        // 3b. Concepts by data type
        const {elapsed: conceptMs, result: concepts} = timeIt(() => {
            return this.findAll(Concept.schema.name)
                .filtered("voided = false AND datatype = $0", "Numeric");
        });
        results.push({
            name: "Concepts filtered by dataType",
            elapsed: conceptMs,
            rows: concepts.length,
            target: null,
            note: "Simple equality filter"
        });

        return results;
    }

    _benchmarkSortedQueries() {
        const results = [];

        // 4. Sort by registrationDate descending
        const {elapsed: sortMs, result: sorted} = timeIt(() => {
            return this.findAll(Individual.schema.name)
                .filtered("voided = false")
                .sorted("registrationDate", true);
        });
        results.push({
            name: "Individuals sorted by registrationDate DESC",
            elapsed: sortMs,
            rows: sorted.length,
            target: null,
            note: "Filter + reverse sort"
        });

        return results;
    }

    _benchmarkHydration() {
        const results = [];

        // 5. Iterate and access nested properties (forces hydration)
        const allIndividuals = this.findAll(Individual.schema.name)
            .filtered("voided = false");
        const count = Math.min(allIndividuals.length, 1000);

        if (count > 0) {
            const {elapsed: hydrateMs} = timeIt(() => {
                for (let i = 0; i < count; i++) {
                    const ind = allIndividuals[i];
                    // Access properties that require FK hydration
                    const _name = ind.name;
                    const _st = ind.subjectType && ind.subjectType.name;
                    const _addr = ind.lowestAddressLevel && ind.lowestAddressLevel.title;
                }
            });
            results.push({
                name: `Hydrate ${count} individuals (name+subjectType+address)`,
                elapsed: hydrateMs,
                rows: count,
                target: TARGETS.searchMs,
                note: `Target: ≤${TARGETS.searchMs}ms for 1000 entities (access + FK resolution)`
            });
        }

        return results;
    }

    _getSampleName(allSorted) {
        if (allSorted.length === 0) return null;
        const mid = Math.floor(allSorted.length / 2);
        const name = allSorted[mid].name || allSorted[mid].firstName;
        if (!name) return null;
        // Use first 3 chars for a reasonable partial match
        return name.substring(0, Math.min(3, name.length));
    }

    _printReport(results) {
        General.logInfo("PerfBenchmark", "");
        General.logInfo("PerfBenchmark", "=== PERFORMANCE BENCHMARK RESULTS ===");
        General.logInfo("PerfBenchmark", "");
        General.logInfo("PerfBenchmark",
            _.padEnd("Benchmark", 52) +
            _.padStart("Time(ms)", 10) +
            _.padStart("Rows", 8) +
            _.padStart("Target", 10) +
            _.padStart("Status", 8)
        );
        General.logInfo("PerfBenchmark", "-".repeat(88));

        let passed = 0, failed = 0, noTarget = 0;

        for (const r of results) {
            const status = r.target == null ? "-" : (r.elapsed <= r.target ? "PASS" : "FAIL");
            if (r.target == null) noTarget++;
            else if (status === "PASS") passed++;
            else failed++;

            General.logInfo("PerfBenchmark",
                _.padEnd(r.name, 52) +
                _.padStart(String(r.elapsed), 10) +
                _.padStart(String(r.rows), 8) +
                _.padStart(r.target != null ? `≤${r.target}` : "-", 10) +
                _.padStart(status, 8)
            );
        }

        General.logInfo("PerfBenchmark", "-".repeat(88));
        General.logInfo("PerfBenchmark", `PASSED: ${passed}  FAILED: ${failed}  NO TARGET: ${noTarget}`);
        if (failed > 0) {
            General.logInfo("PerfBenchmark", "FAILED benchmarks:");
            for (const r of results) {
                if (r.target != null && r.elapsed > r.target) {
                    General.logInfo("PerfBenchmark", `  ${r.name}: ${r.elapsed}ms (target ≤${r.target}ms) — ${r.note}`);
                }
            }
        }
        General.logInfo("PerfBenchmark", "=== PERFORMANCE BENCHMARK END ===");
    }
}

export default PerformanceBenchmarkService;
