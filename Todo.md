# NSD Leave Entry TODOs

- [ ] Handle first-time login for users not pre-provisioned via CSV/roster (currently defaults to "employee" role and "default" building, but requests end up in limbo).
  - *Option A:* Reject login if not explicitly pre-provisioned on the roster.
  - *Option B:* Fallback to route unassigned building requests to District Admins.
