# Leonida Ledger — GTA VI trophy guide & tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Goatleaf12/makefun-gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Goatleaf12/makefun-gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Ledger — GTA VI trophy guide & tracker: all 55 trophies, every step cited, platinum roadmap, missables flagged.**

A static, offline trophy guide for Grand Theft Auto VI on PlayStation 5. All 55 official
trophies are listed with their official names, descriptions and grades (1 platinum,
2 gold, 6 silver, 46 bronze), the 28 trophies hidden on PSN are flagged, and every
guide is written in our own words with numbered steps — **every step cites its source**.

## What is inside

- **Checklist** — all 55 trophies grouped by roadmap stage, with grade chips, hidden /
  missable / watch badges and citation refs on every row. Tick trophies off as you earn
  them; progress is saved in your browser (localStorage).
- **Cited guidance** — open any trophy to see its official PlayStation description, a
  one-line summary, and numbered steps that each end with citation numbers pointing at
  the source list. Where the public guides disagree (for example, whether 18 or 15
  meditation spots are required), both versions are shown instead of a false certainty.
- **Roadmap** — seven stages from Chapter 1 to the platinum, with per-stage progress
  and a NEXT UP panel: the missable to do first, the next story beat, the closest counter.
- **Missables & watch** — the possibly-missable Chapter 1 meditation and the other
  trophies worth doing before the story moves on.
- **Sources** — the seven sources behind the guide (PowerPyx, OutputLag, KeenGamer,
  eGamers, Exophase, PSNProfiles and the official list shipped in the contest kit),
  each with its URL, the date it was read, how it was read, and how many guides cite it.
- **Counters** — trophies PlayStation tracks (250 stunts, 42 shooting-range challenges,
  18 meditation spots…) get a +/− stepper that is saved with your progress.
- **Spoiler setting** — with spoilers hidden, unearned story and hidden trophies are
  masked in the list until you reveal or earn them.
- **Export / Import** — download your progress as a JSON file and load it back anywhere.

## Run it

The guide is plain static files with no build step:

```
node serve.ts            # serves app/ on http://localhost:8080
```

or open `app/index.html` in a desktop browser. It works fully offline — everything it
loads lives under `app/`.

To produce the hand-in output (copies `app/` + `screenshots/` and writes the dossier):

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Data

`app/data/trophies.json` holds the official 55-trophy list plus, per trophy: hidden
flag, kind, roadmap stage, tracked count where PlayStation has one, missable and
confirmation status, disagreement notes where sources conflict, a one-line guide, and
numbered steps — each step carrying the numbers of the sources it rests on.
