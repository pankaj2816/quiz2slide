# Quiz2Slide Studio — GitHub Pages Edition 📊

**Live:** https://pankaj2816.github.io/quiz2slide/

A **100% client-side** tool that turns any quiz / exam PDF (English or Hindi) into a PowerPoint deck — one question per slide — plus a school Result & Mobile Number merger. Nothing is uploaded to a server; everything runs in the browser.

## Features

### Tab 1 — Quiz to PowerPoint
- **Any PDF numbering style**: `Q.1`, `Question 1`, `प्रश्न 1`, or plain `1.` (English *and* Hindi). Section headings (`Section A: …`) are detected and shown on slides.
- **Real PowerPoint templates (Rev 15)**: upload any `.pptx`. Its first slide — background, pictures, shapes, badges, fonts — is reused for every question, so the output keeps your exact design and stays fully editable.
  - **Smart badge detection**: if the slide has a “Question” label and **A / B / C / D** badges (like `new_sample/PPT FORMAT.pptx`), the question goes under the label and each option is written beside its badge automatically.
  - Sample text already on the template slide is removed from the copies, and its position becomes the default text area.
- **Default chalkboard** template or any background image (PNG/JPG) still works.
- **Visual area selector**: one combined area, or separate Question and Option areas, with presets.
- **Custom text colors (Rev 15)**: separate colors for Question text, Option text, Q-number, option labels, section tag, statements and inline answer; 4 one-click themes (Chalkboard, Dark Slide, Light Slide, Exam Paper); bold-options toggle; remembered on your device.
- Math/chemistry formatting (fractions, roots, sub/superscripts), diagram detection, 2×2 grid for short options, auto-fit font sizing, solution slides or inline answers.
- Edit question **and option** text inline before exporting.

### Tab 2 — Result & Mobile Number Merger
Matches a class result sheet (`.xls` SpreadsheetML / `.xlsx` / `.csv`) with the Crystal Report student list by Adm/Roll number (leading zeros ignored, optional name fallback) and exports Excel/CSV with a `Mobile Number` column.

## Files
| File | Purpose |
|---|---|
| `index.html` | UI |
| `app.js` | PDF parsing, slide layout, generator, result merger |
| `template_engine.js` | PPTX template reader, preview renderer, badge detection, slide cloning |
| `style.css` | Styles |
| `chalkboard_b64.js`, `chalkboard_bg.png` | Default chalkboard background |

## Deploy
GitHub Pages serves the `master` branch root. Push to `master` and the site updates within a minute.
