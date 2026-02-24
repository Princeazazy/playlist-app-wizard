

## Performance Analysis: Live TV Loading Speed

After reviewing the codebase, here are the bottlenecks causing the Live TV screen to feel slow when you click into it:

### Current Bottlenecks Identified

1. **`useBulkChannelLogos` runs on every mount** — When you navigate to Live TV, it passes ALL channels to this hook, which iterates through every channel checking for missing logos and fires batched edge function calls (5 at a time with 500ms delays). This blocks rendering.

2. **`mergeAndSortGroups` + `normalizeGroupName` recalculates on mount** — The sidebar groups are rebuilt from scratch every time the component mounts, iterating all channels.

3. **Framer Motion animations on the sidebar** — The `motion.div` sidebar animates width on every mount with a spring animation, adding perceived delay.

4. **Progressive list resets to 50 items** — Each time you enter, it starts with `initial: 50` and re-slices, causing a brief empty/loading flash.

5. **`LivePreviewChannelTile` uses `motion.button`** — Each tile has `initial={{ opacity: 0, x: -10 }}` entrance animation, meaning all 50 tiles animate in sequentially, adding visual delay.

6. **Weather hook fires on mount** — `useWeather()` triggers a geolocation + API call every time the component mounts.

### Proposed Optimizations

**A. Remove entrance animations from channel tiles**
Replace `motion.button` with a plain `button` in `LivePreviewChannelTile`. The per-tile fade-in animation is the single biggest contributor to perceived slowness.

**B. Increase initial progressive list count**
Change from `initial: 50` to `initial: 80` (already the default in the hook, but the component overrides it to 50). This reduces "Loading more..." flashes.

**C. Remove sidebar spring animation on mount**
Replace the animated `motion.div` sidebar with a static `div` that uses CSS transitions only for the collapse toggle, not on initial mount.

**D. Defer bulk logo resolution**
Wrap the `useBulkChannelLogos` call in a `requestIdleCallback` or add a 1-second delay before starting logo fetches, so the list renders immediately with fallback icons.

**E. Memoize weather data at the app level**
Move the `useWeather()` hook up to the Index page so it persists across screen changes instead of re-fetching on every Live TV mount.

### Technical Details

```text
Current flow:
  Click "Live TV" → Mount MiLiveTVList → 
    → useBulkChannelLogos iterates all channels
    → mergeAndSortGroups builds sidebar groups  
    → motion.div animates sidebar width (spring)
    → 50 motion.buttons animate in (opacity 0→1, x -10→0)
    → useWeather fires geolocation
    → ~300-500ms before interactive

Optimized flow:
  Click "Live TV" → Mount MiLiveTVList →
    → Groups built from pre-filtered channels (already fast)
    → Static sidebar renders instantly
    → 80 plain buttons render immediately
    → Logos load lazily in background after 1s
    → Weather cached from parent
    → ~50-100ms before interactive
```

The biggest wins come from items A (remove tile animations) and C (remove sidebar mount animation). These are purely visual changes that eliminate the "sliding in" feeling and make it feel instant.

