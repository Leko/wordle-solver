# Wordle solver

An unofficial solver for [Wordle - A daily word game](https://www.powerlanguage.co.uk/wordle/).
Currently, it can solve only easy mode.

![screenshot](./docs/screenshot.gif)

## Installation

1. Clone this repository
2. Run `npm i` on the project root
3. Create `words.json` on the project root somehow. The content must be `string[]`

## Getting started

### Launch repl

```
npm run dev
```

### Run in emulation mode

```
npm run dev:emulate {{ANSWER_WORD}}
```

### Logging

You can use `DEBUG` environment variables for verbose logging.
