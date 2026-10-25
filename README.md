# Pokédex Explorer

This is the final project Conquerblocks' JavaScript module. It is an interactive web app for exploring Pokémon, built with vanilla JavaScript. It uses the [PokeAPI](https://pokeapi.co/) to browse the catalog, search and filter results, save favorites, and compare Pokémon side by side.

The project takes inspiration from the character-explorer format proposed for a Rick and Morty API project, while using the Pokémon universe and adding a visual comparison of stats as its own feature.

## Features

- Browse the full Pokémon catalog in batches of 20.
- Search for a Pokémon by name or Pokédex number/ID.
- Find Pokémon by type and load matching results in batches of 20.
- Open an individual profile with artwork, a description, types, stats, and abilities.
- Add or remove favorites; selections persist in `localStorage` after a page reload.
- Select up to two Pokémon from results or profiles and compare their types and base stats with values and visual bars.
- Return to the previous context after viewing a profile or comparison.
- See loading, validation, and error messages in the interface.
- Use the app on desktop, tablet, or mobile, with keyboard controls, accessible labels, and support for `prefers-reduced-motion`.

## Interface and behavior

The interface is designed to resemble a physical Pokédex. The blue button opens a horizontal navigation menu with search, favorites, catalog browsing, comparison, and a return-to-home option. An opening guide explains the main features. Cards let users save favorites and choose Pokémon to compare; the comparison view becomes available after selecting two.

The comparison displays both Pokémon side by side with their six base stats. The higher value is highlighted for each stat; ties do not designate a winner.

The app interface is currently in Spanish; this README is written in English.

## Technology and data

- Modern JavaScript with ES modules and no frontend framework.
- Vite for the development server and production build.
- PokeAPI for Pokémon, species, descriptions, types, and artwork.
- `localStorage` to store only favorite Pokémon IDs in the user's browser.

The app has no custom backend. Catalog data comes from PokeAPI, while favorites remain in each user's browser.

## Project requirement mapping

Pokédex Explorer is an original adaptation of the explorer format and is not one of the four original project options. It demonstrates the core technical objectives of an API explorer:

| Requirement | How the project demonstrates it |
| --- | --- |
| Asynchronous API requests | `api.js` queries PokeAPI for catalog pages, types, Pokémon, and species data. |
| Search and filtering | `search.js` coordinates searches by name, ID, and type. |
| Dynamic rendering | `dom.js` builds the grid, profiles, messages, and comparison from the returned data. |
| Pagination | `pagination.js` maintains independent flows for the general catalog and type results. |
| Interface state | `state.js` stores the current view, results, selections, and active cursors. |
| Local persistence | `storage.js` stores favorite IDs in `localStorage`; `favorites.js` coordinates favorite actions. |
| Error handling | The API layer reports HTTP errors, and the controllers display appropriate interface messages. |

The side-by-side comparison adds a product feature beyond displaying API records: it relates two Pokémon's stats and makes their differences easy to see.

## Run locally

Requirements: Node.js compatible with the installed Vite version, npm, and an internet connection.

```bash
npm install
npm run dev
```

Open the local address printed by Vite in your browser.

## Build and preview

```bash
npm run build
npm run preview
```

`npm run build` generates the optimized production app in `dist/`. The root `index.html` is the source file; do not edit the generated `dist/index.html`. Vite uses relative asset paths (`base: './'`) so the app can also be served from a repository subpath.

## Project structure

```text
.
├── index.html                  # Source HTML for the app
├── css/
│   ├── style.scss              # Sass entry point imported by js/main.js
│   └── scss/
│       ├── _base.scss           # Global rules and base styles
│       ├── _device.scss         # Pokédex logo and outer shell
│       ├── _navigation.scss     # Top controls, indicator lights, and menu
│       ├── _project-info.scss   # Welcome guide and accessibility adjustments
│       ├── _pokemon-card.scss   # Main profile and type badges
│       ├── _search-results.scss # Feedback, grid, and result cards
│       ├── _comparison.scss     # Selection toolbar and side-by-side comparison
│       ├── _views.scss          # Visual states and view transitions
│       ├── _loading.scss        # Loading overlay and Poké Ball animation
│       ├── _responsive.scss     # General mobile layout adjustments
│       └── _accessibility.scss # Reduced-motion preference
├── js/
│   ├── api.js                  # HTTP requests and PokeAPI response validation
│   ├── dom.js                  # Grid, profile, message, and comparison rendering
│   ├── events.js               # Event registration and callback wiring
│   ├── comparison.js           # Comparison selection and view transitions
│   ├── favorites.js            # Favorite toggling and favorites view
│   ├── main.js                 # App initialization and module/event composition
│   ├── pagination.js           # Incremental catalog and type-result loading
│   ├── search.js               # Name, ID, and type search coordination and validation
│   ├── state.js                # Shared app data and active result source
│   └── storage.js              # Safe reading and writing of favorites
├── public/
│   ├── favicon.svg              # Browser tab icon
│   └── icons.svg                # Available SVG sprite; not currently used in the UI
├── src/img/                     # Logo and background used by the interface
├── dist/                        # Generated by npm run build; do not edit or commit
├── package.json                 # Scripts and project dependencies
├── package-lock.json            # Locked dependency versions
├── vite.config.js
├── .gitignore                   # Excludes dist/ and node_modules/
└── README.md
```

## Behavior decisions

- General browsing has its own offset and appends each catalog page to the loaded results.
- Type search keeps a separate list and offset; “Load more” appends the next batch for the same type.
- Favorites can include Pokémon not yet loaded in the catalog; the app fetches their data when needed.
- “Show favorites” always opens the favorites view, even if it is already active; “Browse all” returns to the catalog.
- Name and ID searches open a profile directly; type searches and general browsing show cards.
- Text received from PokeAPI is escaped before it is inserted into HTML templates.
- Comparison is limited to two Pokémon IDs. Users can remove one to select another or clear the selection.
- Stale requests are ignored so an older search cannot replace more recent visible results.

## Manual test checklist 

The project does not currently include an automated test runner. The build checks that JavaScript and Sass compile, but it does not replace functional testing. Here are some manual test cases to explore the app:

1. Search by name and ID using both the button and Enter; also try a missing name and an invalid ID.
2. Search for a type with more than 20 results, load the next batch, and confirm the filter remains active and results are not duplicated.
3. Add favorites, including one outside the first catalog batch; reload the page and confirm they remain, then remove a favorite and clear the list.
4. Compare two Pokémon from the catalog or search, check all six stats, return to the previous context, and clear the selection.
5. Run a search with no matches and confirm its message appears without leaving old results visible.
6. Navigate the controls with a keyboard and check the layout on mobile and desktop.
