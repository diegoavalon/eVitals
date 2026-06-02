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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
