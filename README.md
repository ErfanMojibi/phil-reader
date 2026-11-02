# Philosophy Reader

A bilingual (English / Persian) reader for philosophy articles, hosted on GitHub Pages.

- **Library** with categories and search
- **Reading modes:** English, فارسی, or side by side
- **Per-paragraph translation:** click the `فا` / `EN` button beside any paragraph
- **Dictionary:** double-click a word (or select a phrase) in the English text
  - English definitions: [Free Dictionary API](https://dictionaryapi.dev)
  - Quick English→Persian: [MyMemory](https://mymemory.translated.net)
  - Links to Google Translate, Abadis, Fastdic, Cambridge
- Remembers where you stopped reading, and dark mode

## Adding an article

1. Create `articles/<id>.txt`. Each paragraph pair starts with `===`; inside it,
   `---` separates English (above) from Persian (below). Start a line with `# ` for a heading.

   ```
   ===
   # Section title
   ---
   # عنوان بخش

   ===
   First English paragraph...
   ---
   ترجمهٔ پاراگراف اول...
   ```

   Inline `*italic*` and `**bold**` are supported. If a block is malformed,
   the reader shows a red warning under it so alignment problems are easy to spot.

2. Add an entry to `articles/index.json`:

   ```json
   {
     "id": "my-article",
     "file": "my-article.txt",
     "title": "English title",
     "titleFa": "عنوان فارسی",
     "author": "Author",
     "year": 1900,
     "categories": ["Ethics"]
   }
   ```

## Run locally

```
python3 -m http.server 8000
```
then open http://localhost:8000

## Deploy

Repository → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
