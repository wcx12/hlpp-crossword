# HLPP Crossword

A multi-platform crossword puzzle game built with modern technologies.

## Platforms

| Platform | Tech Stack | Location |
|----------|------------|----------|
| Android | Kotlin, Jetpack Compose, Material3 | `android/` |
| Web | React 18, TypeScript, Vite | `web/` |

## Features

- **Crossword Generation**: Greedy algorithm generates puzzles from word lists
- **Interactive Grid**: Tap/click cells, input via on-screen keyboard
- **Direction Toggle**: Switch between horizontal and vertical
- **Multiple Word Lists**: Built-in and custom word list support
- **Word Search**: Search across word lists
- **Persistent Storage**: Web version uses localStorage; Android uses internal storage

## Architecture

Both platforms follow Clean Architecture:

```
├── domain/           # Business logic (CrosswordGenerator)
├── data/             # Data layer (repositories, models)
└── ui/               # Presentation layer
```

## Building

**Android:**
```bash
cd android
./gradlew assembleDebug
```

**Web:**
```bash
cd web
npm install
npm run dev      # Development
npm run build    # Production build
```

## Inspired by

This project is a Kotlin/Android and React/Web port of [genxword](https://github.com/riverrun/genxword) by Peter H. Miller.
