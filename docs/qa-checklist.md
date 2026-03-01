# QA Checklist

## Core Timing

- Automated unit tests now cover pause/resume elapsed integrity, sector split position tracking, restore behavior, multi-driver independence, mode switching state safety, reset behavior, and export row generation
- Automated browser tests now cover lap/split updates, restore-after-reload, reset confirmation, settings persistence, export warning behavior, menu order, and mobile fixed-shell no-overflow checks for 2-driver and 4-driver layouts
- Start Driver 1 and confirm the live time increments
- Record at least two laps and confirm best lap updates correctly
- Pause and resume without adding extra elapsed time
- Record Split 1 and Split 2 and confirm Split 2 is shorter than total elapsed

## Multi-Driver

- Start Driver 2 from 1-driver view and confirm the app promotes to 2-driver view
- Start Driver 3 or 4 and confirm the app promotes to 4-driver view
- Confirm all running timers continue while switching layouts
- Start timing and confirm the mode header does not switch layouts until timing is paused
- Confirm the lap/split footer does not move at all while switching between 1-driver, 2-driver, and 4-driver modes
- In 2-driver mode, confirm the live running timer is visually more prominent than the driver name, lap text, and secondary metric tiles for both visible drivers
- Confirm metric labels such as `Last`, `Best`, `Diff`, and `Split` stay in fixed positions when lap and split values update
- In 2-driver mode, confirm the larger Last, Best, Diff, and Split values remain readable without clipping
- In 4-driver mode, confirm the larger main timer and metric values remain readable without clipping

## Persistence

- Reload during an active session and confirm restore works
- Reload after paused timing and confirm paused state is preserved
- Change settings, reload, and confirm settings persist

## Summary

- Record at least one completed lap and confirm the top-right menu > Summary shows the correct lap count
- Confirm Summary best lap and last lap match the visible driver's recorded laps
- Confirm Summary best splits match the driver's best split positions

## Glove Mode

- Enable Glove Mode in Settings and confirm the app keeps the same fixed shell layout
- Confirm buttons and key panels gain stronger contrast and clearer borders
- Reload and confirm Glove Mode stays enabled

## PWA

- Install the app to the home screen
- Open offline and confirm the shell loads
- Update the app and confirm stale cache is replaced

## Feedback

- Verify haptics on a supported Android device
- Verify click audio still works when vibration is unavailable
- Verify wake lock can be enabled and disabled from settings

## Shell Layout

- Confirm the top-right hamburger menu opens and shows Stop Timing, Reset Timing, Summary, Export CSV, Settings, and Help in that order
- Confirm Export CSV still works from the top-right menu after at least one completed lap
- Confirm the main shell does not scroll at `390x844`
- Confirm `L1` through `L4` and `S1` through `S4` remain fixed in the footer across all display modes
- Confirm the footer buttons remain at the same physical screen position across all display modes, like a fixed stopwatch keypad
