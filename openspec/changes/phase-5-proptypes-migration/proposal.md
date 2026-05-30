# Phase 5: PropTypes Migration & Cleanup

## Why

The renderer still uses PropTypes for component validation, which is deprecated in React 19. Migrating to JSDoc type annotations:

- **PropTypes deprecated**: React 19 marks PropTypes as deprecated
- **Type safety**: JSDoc provides better IDE support and type checking
- **Bundle size**: Removing PropTypes reduces bundle size
- **Modern patterns**: Aligns with current React best practices

## What Changes

### Dependencies Updated

| Package | Current | Target |
|---------|---------|--------|
| `prop-types` | (implicit) | (removed) |

### Files Modified

| File | Changes |
|------|---------|
| `src/renderer/components/Transaction.js` | Replace PropTypes with JSDoc annotations |
| `eslint.config.js` | Remove PropTypes from unused vars ignore list |
| `package.json` | Remove prop-types dependency if present |

### PropTypes → JSDoc Migration

```javascript
// Before:
import PropTypes from 'prop-types'

function Transaction({ transaction }) {
  // ...
}

Transaction.propTypes = {
  transaction: PropTypes.object.isRequired,
}

// After:
/**
 * @param {Object} props
 * @param {Object} props.transaction
 * @returns {JSX.Element}
 */
function Transaction({ transaction }) {
  // ...
}
```

## Scope

**In scope**:
- Replace PropTypes with JSDoc annotations in Transaction.js
- Remove PropTypes from eslint config ignore list
- Remove prop-types dependency if present
- Verify all components still work correctly

**Out of scope**:
- TypeScript migration
- Runtime type checking
- New features or functionality

## Success Criteria

1. `npm install` completes without errors
2. `npm test` passes (same results as Phase 4)
3. `npm run lint` passes with no PropTypes warnings
4. All renderer components render correctly
5. No PropTypes imports remaining in codebase

## Risks

- PropTypes removal may reveal missing prop validation — add JSDoc comments
- ESLint rules may need updates for JSDoc patterns
- IDE type checking may require restart

## Migration Steps

1. Replace PropTypes import with JSDoc annotations in Transaction.js
2. Remove PropTypes from eslint config ignore list
3. Remove prop-types from package.json if present
4. Run `npm install` to update dependencies
5. Run `npm test` to verify no regressions
6. Run `npm run lint` to verify no PropTypes warnings
7. Test app launch to verify components render correctly
