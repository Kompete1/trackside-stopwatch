# Product Spec

## Primary User

One marshal using one phone at trackside.

## Shell Layout

- The main timing shell must remain fixed with no page scrolling at a minimum viewport of `390x844`
- The top-right hamburger menu action order is `Stop Timing`, `Reset Timing`, `Summary`, `Export CSV`, `Settings`, and `Help`
- `L1` through `L4` and `S1` through `S4` stay pinned in a fixed footer across 1-driver, 2-driver, and 4-driver layouts
- The lap and split footer must never move when display modes change; it is a hard stopwatch-like invariant for future UI work
- When layout space is reclaimed, the timing cards absorb it first so the larger timing values remain readable without cropping

## Visual Priority

- The live running timer is the highest-priority visual element in every display mode
- Names, lap metadata, and secondary metrics must never visually compete with the live running timer
- Any future layout or typography change must preserve the live running timer as the most prominent timing element on screen
- Metric labels such as `Last`, `Best`, `Diff`, and `Split` must remain in fixed on-screen positions inside their tiles so they never jump when timing values update

## Timing Rules

- Pressing a Lap button on an idle driver starts timing
- Pressing a Lap button on a running driver closes the lap and immediately starts the next lap
- Pressing a Lap button on a paused driver resumes the current lap
- Stop Timing pauses active laps without completing them
- Reset clears all drivers, laps, splits, and event history after confirmation
- The mode header does not allow manual mode changes while any driver is actively running
- Once all drivers are paused or idle, the mode header can cycle layouts again
- Starting Driver 2, 3, or 4 still auto-promotes the display when needed so the active driver stays visible

## Split Rules

- Splits are sector times, not cumulative times
- Split 1 compares only against previous Split 1 times
- Split 2 compares only against previous Split 2 times
- Each completed lap stores the split sequence captured during that lap

## Timing Color Semantics

These color meanings apply to timing values and timing-state emphasis, not to menu/button chrome.

| Color | Meaning | Applies To |
| --- | --- | --- |
| White | Neutral/default timing value | Main timer, normal metric values |
| Purple | Session-leading benchmark | Fastest visible best lap, session-leading displayed best split |
| Green | Improved against personal benchmark | Last lap value when the new lap beats the driver's previous best lap |
| Orange | Slower than personal benchmark | Last lap value when the new lap is slower than the driver's previous best lap |
| Blue outline | Driver actively running | Driver card border and running emphasis |
| Gray outline | Driver paused | Driver card border when timing is paused |

## Persistence

- The current session is saved locally
- Running sessions can be restored after reload
- Settings are saved separately from the session

## Export

- CSV export is launched from the top-right hamburger menu
- CSV export includes each completed lap per driver
- Each row includes lap time and any captured split times for that lap

## Session Summary

- The top-right hamburger menu includes a read-only `Summary` action
- The summary is derived from existing `lapHistory` data and does not change timing state
- The summary shows visible drivers only for the current display mode
- Each visible driver shows:
  - completed lap count
  - best lap
  - last lap
  - best split times by split position

## Glove Mode

- `Glove Mode` is an optional settings toggle
- It does not change timing behavior or the fixed-shell layout
- It increases control emphasis through stronger contrast, heavier button weight, and clearer visual boundaries
- It is intended to make actions easier to identify when using gloves or in harsher outdoor conditions
