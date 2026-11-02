# Philosophy Reader

A bilingual (English / Persian) reader for philosophy articles, hosted on GitHub Pages.

- **Library** with categories and search
- **Reading modes:** English, فارسی, or side by side
- **Per-paragraph translation:** click the `فا` / `EN` button beside any paragraph
- **Table of contents:** clickable sidebar built from the headings (a slide-in panel on phones)
- **Dictionary, only when asked:** double-click a word in the English text, or select a
  phrase and press the small *Translate* button (plain selecting/copying is not interrupted)
  - English definitions: [Free Dictionary API](https://dictionaryapi.dev)
  - English→Persian inside the popup: Google Translate (falls back to [MyMemory](https://mymemory.translated.net))
  - Links to Google Translate, Abadis, Fastdic, Cambridge
- Remembers where you stopped reading, and dark mode

## Adding an article

1. Create `articles/<id>.md`. Write each English paragraph, then its Persian
   translation as a quote (`> `) right below it, with blank lines between paragraphs.
   Use `## ` for a section heading and `### ` for a sub-section. A first line starting
   with `# ` is the file title and is not shown in the reader.

   ```markdown
   # My Article — Author

   ## Section title

   > ## عنوان بخش

   First English paragraph...

   > ترجمهٔ پاراگراف اول...
   ```

   Inline `*italic*` and `**bold**` are supported. A paragraph with no translation
   is marked "English only" in the reader, so gaps are easy to spot.

2. Add an entry to `articles/index.json`:

   ```json
   {
     "id": "my-article",
     "file": "my-article.md",
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
