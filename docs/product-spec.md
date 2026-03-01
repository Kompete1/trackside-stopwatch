# Product Spec

## Primary User

One marshal using one phone at trackside.

## Timing Rules

- Pressing a Lap button on an idle driver starts timing
- Pressing a Lap button on a running driver closes the lap and immediately starts the next lap
- Pressing a Lap button on a paused driver resumes the current lap
- Stop Timing pauses active laps without completing them
- Reset clears all drivers, laps, splits, and event history after confirmation

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

- CSV export includes each completed lap per driver
- Each row includes lap time and any captured split times for that lap
