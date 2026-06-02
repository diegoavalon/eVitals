# Squad Decisions

## Active Decisions

### eHealth Core Web Vitals Dashboard Architecture (Morpheus)

**Issue:** https://github.com/diegoavalon/eVitals/issues/1  
**Status:** Approved  
**Owner:** Morpheus

**Decision:** Build v1 as a static GitHub Pages dashboard. Keep source, configuration, tests, and runner scripts on main branch; publish generated site assets, dashboard data, run manifests, Lighthouse JSON reports, and Lighthouse HTML reports to the gh-pages branch.

Use deep, testable module boundaries for:
- Configuration validation
- Lighthouse task orchestration
- Lighthouse report parsing
- Core Web Vitals/category status classification
- Dashboard data generation
- Manifest generation
- Retention pruning
- Static client data loading/selectors
- Report iframe presentation

**Rationale:** Preserves simple static architecture from handoff while making each complex concern independently testable. Avoids always-on server, keeps page/device Lighthouse failures visible as partial run data, and gives React UI compact generated dashboard data instead of requiring browser-side parsing of full Lighthouse JSON.

**Consequences:**
- GitHub Actions owns daily/manual Lighthouse execution and publication
- Browser reads generated static JSON and saved report references
- Tests can focus on external module behavior: config contracts, parsing, status rules, aggregation, retention, and user-visible dashboard interactions

### Issue Slicing: 10 Tracer-Bullet Vertical Slices (Morpheus)

**Issue:** https://github.com/diegoavalon/eVitals/issues/1  
**Status:** Approved by Diego Avalon  
**Owner:** Morpheus

**Decision:** The PRD (issue #1) is decomposed into 10 independently deliverable, vertically-sliced GitHub issues with clear dependency ordering. Each slice delivers external-behavior value. Issues #2–#11 are published under parent #1 with dependency correction applied: issue #11 is blocked by #9, #10, and #2.

**Rationale:**
- Sequential UI track (#2→#3→#4→#5→#6→#7→#8) ensures the client always renders from real generated data before UI features are added
- Runner track (#5→#9→#10→#11) starts after data contracts are stable, so the runner outputs to a known schema
- CI/workflow issue (#11) is HITL because it requires human verification of GitHub Pages settings and real `workflow_dispatch` confirmation
- All other issues are AFK (fully autonomous agent implementation)

**Consequences:**
- Team begins autonomous implementation phase across 10 issues with clear dependencies
- Trinity owns UI/client layers (#2–#3, #6–#8)
- Tank owns data/runner layers (#4–#5, #9–#10)
- Switch owns CI/deployment (#11)
- Neo owns test coverage across all layers

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
