# QA Checklist

## Core Timing

- Automated unit tests now cover pause/resume elapsed integrity, sector split position tracking, restore behavior, multi-driver independence, mode switching state safety, reset behavior, and export row generation
- Automated browser tests now cover lap/split updates, restore-after-reload, reset confirmation, settings persistence, export warning behavior, and a mobile no-scroll shell check
- Start Driver 1 and confirm the live time increments
- Record at least two laps and confirm best lap updates correctly
- Pause and resume without adding extra elapsed time
- Record Split 1 and Split 2 and confirm Split 2 is shorter than total elapsed

## Multi-Driver

- Start Driver 2 from 1-driver view and confirm the app promotes to 2-driver view
- Start Driver 3 or 4 and confirm the app promotes to 4-driver view
- Confirm all running timers continue while switching layouts
- Start timing and confirm the mode header does not switch layouts until timing is paused

## Persistence

- Reload during an active session and confirm restore works
- Reload after paused timing and confirm paused state is preserved
- Change settings, reload, and confirm settings persist

## PWA

- Install the app to the home screen
- Open offline and confirm the shell loads
- Update the app and confirm stale cache is replaced

## Feedback

- Verify haptics on a supported Android device
- Verify click audio still works when vibration is unavailable
- Verify wake lock can be enabled and disabled from settings
