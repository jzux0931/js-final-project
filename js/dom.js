// Referencias a los contenedores estables del HTML; los resultados internos se vuelven a renderizar dinámicamente.
const pokemonContainer = document.querySelector("#pokemonContainer");
const pokemonGrid = document.querySelector("#pokemonGrid");
const searchFeedback = document.querySelector("#searchFeedback");
const searchValidationFeedback = document.querySelector("#searchValidationFeedback");
const favoritesButton = document.querySelector("#favoritesButton");
const comparisonSearchPanel = document.querySelector("#comparisonSearchPanel");
const comparisonSearchValidationFeedback = document.querySelector("#comparisonSearchValidationFeedback");
const resultsToolbar = document.querySelector("#resultsToolbar");
const resultsTitle = document.querySelector("#resultsTitle");
const clearFavoritesButton = document.querySelector("#clearFavoritesButton");
const loadMoreButton = document.querySelector("#loadMoreButton");
const initialLoadRetryButton = document.querySelector("#initialLoadRetryButton");
const comparisonToolbar = document.querySelector("#comparisonToolbar");
const comparisonStatus = document.querySelector("#comparisonStatus");
const comparisonSelection = document.querySelector("#comparisonSelection");
const compareNowButton = document.querySelector("#compareNowButton");
const clearComparisonButton = document.querySelector("#clearComparisonButton");
const compareModeButton = document.querySelector("#compareModeButton");
const pokemonComparison = document.querySelector("#pokemonComparison");
const main = document.querySelector("main");
const searchMenuButton = document.querySelector("#searchMenuButton");
const searchMenu = document.querySelector("#searchMenu");
const searchNavToggle = document.querySelector("#searchNavToggle");
const loadingIndicator = document.querySelector("#loadingIndicator");
const loadingIndicatorMessage = loadingIndicator.querySelector("p");
let operationIndicatorTimeoutId;

// Al cerrar la barra principal, todos los paneles internos vuelven a su estado cerrado.
const closeSearchMenuDropdowns = () => {
  searchMenu.querySelectorAll("[data-nav-toggle]").forEach((toggle) => {
    const dropdown = document.getElementById(toggle.getAttribute("aria-controls"));
    toggle.setAttribute("aria-expanded", "false");
    dropdown.setAttribute("aria-hidden", "true");
    dropdown.inert = true;
    dropdown.hidden = true;
  });
};

// Da formato legible a los valores de la API sin modificar los datos originales.
const capitalizeFirstLetter = (value) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Los datos remotos se insertan en plantillas HTML; se escapan para que se interpreten como texto.
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);

const formatDisplayLabel = (value) =>
  value
    .split(/[-_]+/)
    .map(capitalizeFirstLetter)
    .join(" ");

const formatStatName = (name) =>
  name === "hp" ? "HP" : formatDisplayLabel(name);

const getPokemonImage = (pokemon) =>
  pokemon.sprites.other?.["official-artwork"]?.front_default
    ?? pokemon.sprites.front_default
    ?? "";

// Reutiliza el mismo formato de etiqueta de tipo en las tarjetas pequeñas y en la ficha completa.
const createTypesMarkup = (types) => {
  // Cada tipo se convierte en una etiqueta con una clase que permite aplicar su color en CSS.
  return types.map((typeInfo) => {
    const typeName = typeInfo.type.name;
    const safeTypeName = escapeHtml(typeName);

    return `
      <span class="pokemon-card__type pokemon-card__type--${safeTypeName}">
          ${escapeHtml(capitalizeFirstLetter(typeName))}
      </span>
      `;
    })
    .join("");
  };

/** Muestra un mensaje informativo dentro del panel de búsqueda/resultados. */
export const showSearchFeedback = (message) => {
  searchFeedback.textContent = message; 
}; 

/** Quita el mensaje informativo sin modificar el resto de la vista. */
export const clearSearchFeedback = () => {
    searchFeedback.textContent = "";
};

/** Presenta errores de validación del formulario, separados del feedback de resultados. */
export const showSearchValidationFeedback = (message) => {
  setOperationState("error");
  searchValidationFeedback.textContent = message;
  searchValidationFeedback.hidden = false;
};

/** Presenta errores de validación junto al buscador propio de la comparación. */
export const showComparisonSearchValidationFeedback = (message) => {
  setOperationState("error");
  comparisonSearchValidationFeedback.textContent = message;
  comparisonSearchValidationFeedback.hidden = false;
};

/** Actualiza el estado visual de las luces sin acoplarlo al contenido del mensaje. */
export const setOperationState = (operationState) => {
  const allowedStates = ["idle", "loading", "success", "error"];

  if (!allowedStates.includes(operationState)) {
    throw new Error(`Estado de operación desconocido: ${operationState}`);
  }

  window.clearTimeout(operationIndicatorTimeoutId);
  operationIndicatorTimeoutId = undefined;
  main.dataset.operation = operationState;

  if (operationState === "success" || operationState === "error") {
    operationIndicatorTimeoutId = window.setTimeout(() => {
      if (main.dataset.operation === operationState) {
        main.dataset.operation = "idle";
      }
      operationIndicatorTimeoutId = undefined;
    }, 2000);
  }
};

/** Sincroniza el indicador de carga con los estados accesibles del contenido principal. */
export const setLoadingIndicator = (isVisible, message = "Cargando Pokémon...") => {
  if (isVisible) {
    loadingIndicatorMessage.textContent = message;
  }

  loadingIndicator.hidden = !isVisible;
  main.setAttribute("aria-busy", String(isVisible));

  if (isVisible) {
    setOperationState("loading");
  } else if (main.dataset.operation === "loading") {
    setOperationState("idle");
  }
};

/** Sincroniza el panel de comparación y los controles de contexto de resultados. */
export const setResultsContext = (resultsMode, view, comparisonSelectionMode = false) => {
  const isResultsView = view === "results" || view === "preview-selected";
  const isCatalogView = resultsMode === "catalog";
  const isFavoritesView = resultsMode === "favorites";
  const isComparisonSelectionView = comparisonSelectionMode
    && view !== "comparison"
    && view !== "detail";
  const shouldShowToolbar = isResultsView
    && (isFavoritesView || (isCatalogView && !isComparisonSelectionView));

  comparisonSearchPanel.hidden = !isComparisonSelectionView;
  resultsToolbar.hidden = !shouldShowToolbar;
  clearFavoritesButton.hidden = !isFavoritesView;
  resultsTitle.textContent = isFavoritesView
    ? "Mis favoritos"
    : isCatalogView
      ? "Pokédex completa"
      : "";
};

/** Limpia y oculta el mensaje de validación del formulario. */
export const clearSearchValidationFeedback = () => {
  searchValidationFeedback.textContent = "";
  searchValidationFeedback.hidden = true;
  comparisonSearchValidationFeedback.textContent = "";
  comparisonSearchValidationFeedback.hidden = true;
};

/** Vacía las tarjetas de resultados del grid. */
export const clearPokemonGrid = () => {
  pokemonGrid.innerHTML = "";
  pokemonGrid.classList.remove("is-single-result");
};

/** Vacía el punto de montaje de la ficha detallada. */
export const clearPokemonDetails = () => {
  pokemonContainer.innerHTML = "";
};

/** Mantiene sincronizados el menú visual, aria-expanded, aria-hidden, inert y el foco del teclado. */
export const setSearchMenuOpen = (isOpen, { focusSearchInput = false } = {}) => {
  if (!isOpen && main.dataset.menuState !== "open") {
    return;
  }

  if (isOpen) {
    clearSearchValidationFeedback();
    closeSearchMenuDropdowns();
    main.dataset.menuState = "open";
    searchMenuButton.setAttribute("aria-expanded", "true");
    searchMenuButton.setAttribute("aria-label", "Cerrar menú de búsqueda y favoritos");
    searchMenu.setAttribute("aria-hidden", "false");
    searchMenu.inert = false;

    if (focusSearchInput) {
      const searchOptions = document.querySelector("#searchOptions");
      searchNavToggle.setAttribute("aria-expanded", "true");
      searchOptions.setAttribute("aria-hidden", "false");
      searchOptions.inert = false;
      searchOptions.hidden = false;
      searchOptions.querySelector("#searchInput")?.focus();
      return;
    }

    searchNavToggle.focus();
    return;
  }

  closeSearchMenuDropdowns();
  searchMenuButton.focus();
  main.dataset.menuState = "closed";
  searchMenuButton.setAttribute("aria-expanded", "false");
  searchMenuButton.setAttribute("aria-label", "Abrir menú de búsqueda y favoritos");
  searchMenu.setAttribute("aria-hidden", "true");
  searchMenu.inert = true;
};

/** Refleja en aria-pressed si el filtro de favoritos está activo. */
export const setFavoritesButtonPressed = (isPressed) => {
    favoritesButton.setAttribute(
      "aria-pressed",
      String(isPressed)
    );
};

/** Refleja si el usuario está eligiendo Pokémon para una comparación. */
export const setComparisonModeButtonPressed = (isPressed) => {
  compareModeButton.setAttribute("aria-pressed", String(isPressed));
  compareModeButton.textContent = isPressed ? "Salir de comparación" : "Comparar Pokémon";
};

/** Muestra u oculta la carga incremental y comunica si la petición está en curso. */
export const setLoadMoreButtonState = ({ visible, loading = false, label = "Cargar más Pokémon" }) => {
  loadMoreButton.hidden = !visible;
  loadMoreButton.disabled = loading;
  loadMoreButton.setAttribute("aria-busy", String(loading));
  loadMoreButton.textContent = loading ? "Cargando..." : label;
};

/** Muestra el reintento de inicio y refleja cuando una nueva petición está en curso. */
export const setInitialLoadRetryState = ({ visible, loading = false }) => {
  initialLoadRetryButton.hidden = !visible;
  initialLoadRetryButton.disabled = loading;
  initialLoadRetryButton.setAttribute("aria-busy", String(loading));
  initialLoadRetryButton.textContent = loading
    ? "Reintentando carga..."
    : "Reintentar carga inicial";
};

/** Construye las tarjetas del grid a partir de datos; marca selección y favoritos para el render actual. */
export const renderPokemonGrid = (pokemonArray, selectedPokemonId, favoriteIds = [], comparisonIds = []) => {
  // Una sola coincidencia se centra y limita en CSS, en lugar de estirarse por todo el grid.
  pokemonGrid.classList.toggle("is-single-result", pokemonArray.length === 1);

  // Convierte cada registro en una tarjeta; data-action y data-pokemon-id permiten delegar sus eventos.
  const cardsMarkup = pokemonArray.map((pokemon) => {
    const isSelected = pokemon.id === selectedPokemonId;
    const isFavorite = favoriteIds.includes(pokemon.id);
    const isCompared = comparisonIds.includes(pokemon.id);
    const pokemonName = escapeHtml(capitalizeFirstLetter(pokemon.name));
    const pokemonImage = escapeHtml(getPokemonImage(pokemon));

    const typesMarkup = createTypesMarkup(pokemon.types);
      return `
        <article class="pokemon-preview-card${isSelected ? " is-selected" : ""}">
          <button 
            class="pokemon-preview-card__button" 
            data-action="select" 
            type="button" 
            data-pokemon-id="${pokemon.id}"
            >

            <img
              src="${pokemonImage}"
              alt="${pokemonName}"
              class="pokemon-preview-card__image"
            >
            <span># ${pokemon.id}</span>
            <span>${pokemonName}</span>
            <span class="pokemon-preview-card__types">${typesMarkup}</span>
          </button>
          <button
            class="pokemon-favorite-button pokemon-preview-card__favorite${isFavorite ? " is-favorite" : ""}"
            type="button"
            data-action="toggle-favorite"
            data-pokemon-id="${pokemon.id}"
            aria-pressed="${isFavorite}"
            aria-label="${isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}"
          >
            ${isFavorite ? "★" : "☆"}
          </button>
          <button
            class="pokemon-preview-card__compare${isCompared ? " is-compared" : ""}"
            type="button"
            data-action="toggle-compare"
            data-pokemon-id="${pokemon.id}"
            aria-pressed="${isCompared}"
            aria-label="${isCompared ? "Quitar" : "Añadir"} ${pokemonName} ${isCompared ? "de" : "a"} la comparación"
          >
            ${isCompared ? "En comparación" : "Comparar"}
          </button>
          <button 
            class="pokemon-preview-card__details" 
            type="button" 
            data-action="view-detail"
            data-pokemon-id="${pokemon.id}">
            Ver Tarjeta
          </button>
        </article>  
        `;}
      )
      .join("");
      
    pokemonGrid.innerHTML = cardsMarkup;
  };

/** Mantiene visible qué Pokémon forman la pareja elegida y habilita comparar solo con dos. */
export const renderComparisonToolbar = (comparisonPokemon, selectionMode = false) => {
  const selectedCount = comparisonPokemon.length;
  comparisonToolbar.hidden = selectedCount === 0 && !selectionMode;
  comparisonStatus.textContent = `Seleccionados para comparar: ${selectedCount} de 2.`;
  compareNowButton.disabled = comparisonPokemon.length !== 2;
  compareNowButton.textContent = `Comparar (${selectedCount}/2)`;
  clearComparisonButton.hidden = selectedCount === 0;
  clearComparisonButton.textContent = "Limpiar comparación";

  comparisonSelection.replaceChildren();
  comparisonPokemon.forEach((pokemon) => {
    const nameChip = document.createElement("span");
    nameChip.className = "comparison-toolbar__name";
    nameChip.textContent = capitalizeFirstLetter(pokemon.name);
    comparisonSelection.append(nameChip);
  });
};

/** Presenta dos Pokémon y compara sus estadísticas con barras proporcionales al mayor valor de cada par. */
export const renderPokemonComparison = (firstPokemon, secondPokemon) => {
  const firstName = escapeHtml(capitalizeFirstLetter(firstPokemon.name));
  const secondName = escapeHtml(capitalizeFirstLetter(secondPokemon.name));
  const firstStatsByName = new Map(
    firstPokemon.stats.map(({ stat, base_stat }) => [stat.name, base_stat])
  );

  const statsMarkup = secondPokemon.stats.map(({ stat, base_stat: secondValue }) => {
    const firstValue = firstStatsByName.get(stat.name) ?? 0;
    const maximumValue = Math.max(firstValue, secondValue, 1);
    const firstWidth = Math.round((firstValue / maximumValue) * 100);
    const secondWidth = Math.round((secondValue / maximumValue) * 100);
    const statName = escapeHtml(formatStatName(stat.name));
    const firstWinnerClass = firstValue > secondValue ? " is-higher" : "";
    const secondWinnerClass = secondValue > firstValue ? " is-higher" : "";

    return `
      <div class="pokemon-comparison__stat-row" role="row">
        <h3 role="rowheader">${statName}</h3>
        <div
          class="pokemon-comparison__stat-value pokemon-comparison__stat-value--first${firstWinnerClass}"
          role="cell"
          aria-label="${firstName}: ${statName} ${escapeHtml(firstValue)}"
        >
          <strong>${escapeHtml(firstValue)}</strong>
          <div class="pokemon-comparison__bar" aria-hidden="true">
            <span style="width: ${firstWidth}%"></span>
          </div>
        </div>
        <div
          class="pokemon-comparison__stat-value pokemon-comparison__stat-value--second${secondWinnerClass}"
          role="cell"
          aria-label="${secondName}: ${statName} ${escapeHtml(secondValue)}"
        >
          <strong>${escapeHtml(secondValue)}</strong>
          <div class="pokemon-comparison__bar" aria-hidden="true">
            <span style="width: ${secondWidth}%"></span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const renderPokemonPanel = (pokemon, name) => `
    <article class="pokemon-comparison__pokemon">
      <img src="${escapeHtml(getPokemonImage(pokemon))}" alt="Ilustración de ${name}">
      <div class="pokemon-comparison__identity">
        <span>#${pokemon.id}</span>
        <h3>${name}</h3>
      </div>
      <div class="pokemon-comparison__types" aria-label="Tipos">
        ${createTypesMarkup(pokemon.types)}
      </div>
    </article>
  `;

  pokemonComparison.innerHTML = `
    <header class="pokemon-comparison__header">
      <div>
        <p>Duelo de estadísticas</p>
        <h2>Comparación de Pokémon</h2>
      </div>
      <button class="pokemon-comparison__back-button" type="button" data-action="back-to-results">
        Volver
      </button>
    </header>
    <div class="pokemon-comparison__pair">
      ${renderPokemonPanel(firstPokemon, firstName)}
      ${renderPokemonPanel(secondPokemon, secondName)}
    </div>
    <section class="pokemon-comparison__stats" aria-label="Comparación de estadísticas">
      <h2>Estadísticas base</h2>
      <div class="pokemon-comparison__stat-table" role="table" aria-label="Estadísticas de ${firstName} y ${secondName}">
        <div class="pokemon-comparison__stat-columns" role="row">
          <span role="columnheader">Estadística</span>
          <strong role="columnheader">${firstName}</strong>
          <strong role="columnheader">${secondName}</strong>
        </div>
        ${statsMarkup}
      </div>
    </section>
  `;
  pokemonComparison.hidden = false;
};

/** Borra la vista comparativa al limpiar la pareja seleccionada. */
export const clearPokemonComparison = () => {
  pokemonComparison.innerHTML = "";
  pokemonComparison.hidden = true;
};

/** Construye la ficha completa, incluyendo descripción, tipos, estadísticas, habilidades y botón de regreso. */
export const renderPokemonDetails = (
  pokemon,
  description,
  backButtonLabel,
  isFavorite = false,
  isCompared = false,
  navigation = null
) => {
    const typesMarkup = createTypesMarkup(pokemon.types);
    const pokemonName = escapeHtml(capitalizeFirstLetter(pokemon.name));
    const pokemonImage = escapeHtml(getPokemonImage(pokemon));
    const safeDescription = escapeHtml(description);

    // Las estadísticas y habilidades vienen como objetos anidados desde PokeAPI; aquí se preparan para mostrarlas.
    const statsMarkup = pokemon.stats.map((statInfo) => {
        const statName = escapeHtml(formatStatName(statInfo.stat.name));
        const statValue = statInfo.base_stat;

        return `
            <p><strong>${statName}:</strong> ${escapeHtml(statValue)}</p>
    `;
    })
    .join("");

    const abilityMarkup = pokemon.abilities.map((abilityInfo) => {
        const abilityName = escapeHtml(formatDisplayLabel(abilityInfo.ability.name));

        return `
            <p>${abilityName}</p>
    `;
    })
    .join("");

    pokemonContainer.innerHTML = `
        <article class="pokemon-card">
          <button
            id="backToResultsButton"
            class="pokemon-card__back-button"
            type="button"
          >
            ${escapeHtml(backButtonLabel)}
          </button>

          <div class="pokemon-card__content-border">
            <div class="pokemon-card__content">

              <section class="pokemon-card__left">
                <div class="pokemon-card__heading">
                  <h2 class="pokemon-card__name">${pokemonName}</h2>
                  <div class="pokemon-card__heading-actions">
                    <span class="pokemon-card__id">#${pokemon.id}</span>
                    <button
                      class="pokemon-favorite-button pokemon-card__favorite${isFavorite ? " is-favorite" : ""}"
                      type="button"
                      data-action="toggle-favorite"
                      data-pokemon-id="${pokemon.id}"
                      aria-pressed="${isFavorite}"
                      aria-label="${isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}"
                    >
                      ${isFavorite ? "★" : "☆"}
                    </button>
                  </div>
                </div>

                <div class="pokemon-card__image">
                  <img
                    src="${pokemonImage}"
                    alt="${pokemonName}"
                    class="pokemon-image"
                  >
                </div>

                <div class="pokemon-card__description">
                  <strong>Descripción:</strong>
                  <p>
                  ${safeDescription}
                  </p>
                </div>

                ${navigation ? `
                  <nav class="pokemon-card__navigation" aria-label="Navegación entre Pokémon">
                    <button
                      class="pokemon-card__navigation-button pokemon-card__navigation-button--previous"
                      type="button"
                      data-action="navigate-detail"
                      data-direction="previous"
                      aria-label="Ver Pokémon anterior"
                      ${navigation.canGoPrevious ? "" : "disabled"}
                    >
                      <span class="pokemon-card__navigation-arrow" aria-hidden="true">&larr;</span>
                      <span>Anterior</span>
                    </button>
                    <button
                      class="pokemon-card__navigation-button pokemon-card__navigation-button--next"
                      type="button"
                      data-action="navigate-detail"
                      data-direction="next"
                      aria-label="Ver Pokémon siguiente"
                      ${navigation.canGoNext ? "" : "disabled"}
                    >
                      <span class="pokemon-card__navigation-arrow" aria-hidden="true">&rarr;</span>
                      <span>Siguiente</span>
                    </button>
                  </nav>
                ` : ""}
              </section>

              <div class="pokemon-card__fold" aria-hidden="true">
                <span class="small"></span>
                <span class="large"></span>
                <span class="small"></span>
                <span class="large"></span>
                <span class="small"></span>
                <span class="large"></span>
                <span class="small"></span>
              </div>

              <section class="pokemon-card__right">
                <div class="pokemon-card__types">
                <strong>Tipos:</strong>
                ${typesMarkup}
                </div>

                <button
                  class="pokemon-card__compare${isCompared ? " is-compared" : ""}"
                  type="button"
                  data-action="toggle-compare"
                  data-pokemon-id="${pokemon.id}"
                  aria-pressed="${isCompared}"
                  aria-label="${isCompared ? "Quitar" : "Añadir"} ${pokemonName} ${isCompared ? "de" : "a"} la comparación"
                >
                  ${isCompared ? "Quitar de comparación" : "Añadir a comparación"}
                </button>

                <div class="pokemon-card__stats">
                <strong>Estadísticas:</strong>
                ${statsMarkup}
                </div>

                <div class="pokemon-card__abilities">
                <strong>Habilidades:</strong>
                ${abilityMarkup}
                </div>
              </section>

            </div>
          </div>
        </article>
`;
}

/** Actualiza la estrella de la ficha sin volver a descargar ni volver a renderizar sus datos. */
export const setPokemonDetailsFavorite = (isFavorite) => {
  const favoriteButton = pokemonContainer.querySelector(".pokemon-card__favorite");

  if (!favoriteButton) {
    return;
  }

  favoriteButton.classList.toggle("is-favorite", isFavorite);
  favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  favoriteButton.setAttribute(
    "aria-label",
    isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"
  );
  favoriteButton.textContent = isFavorite ? "★" : "☆";
};

/** Actualiza el botón comparativo de la ficha sin reconstruir toda la tarjeta. */
export const setPokemonDetailsCompared = (isCompared) => {
  const compareButton = pokemonContainer.querySelector('[data-action="toggle-compare"]');

  if (!compareButton) {
    return;
  }

  const pokemonName = pokemonContainer.querySelector(".pokemon-card__name")?.textContent ?? "Pokémon";
  compareButton.classList.toggle("is-compared", isCompared);
  compareButton.setAttribute("aria-pressed", String(isCompared));
  compareButton.setAttribute(
    "aria-label",
    `${isCompared ? "Quitar" : "Añadir"} ${pokemonName} ${isCompared ? "de" : "a"} la comparación`
  );
  compareButton.textContent = isCompared ? "Quitar de comparación" : "Añadir a comparación";
};
