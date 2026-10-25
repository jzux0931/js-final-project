// Controlador principal: conecta API, estado, renderizado y eventos sin mezclar sus responsabilidades.
import "../css/style.scss";

import { 
  getPokemonPage, 
  getPokemonDetails, 
  getPokemonSpecies, 
  getPokemonByIdOrName, 
  getPokemonByType,
} from "./api.js";

import { 
  renderPokemonDetails, 
  renderPokemonGrid, 
  showSearchFeedback, 
  clearSearchFeedback,
  showSearchValidationFeedback,
  showComparisonSearchValidationFeedback,
  clearSearchValidationFeedback,
  clearPokemonGrid,
  clearPokemonDetails,
  setSearchMenuOpen,
  setFavoritesButtonPressed,
  setComparisonModeButtonPressed,
  setLoadMoreButtonState,
  setLoadingIndicator,
  setOperationState,
  setResultsContext,
  setInitialLoadRetryState,
  setPokemonDetailsFavorite,
  renderComparisonToolbar,
  renderPokemonComparison,
  clearPokemonComparison,
  setPokemonDetailsCompared,
} from "./dom.js";

import { 
  setupPokemonGridEvents, 
  setupSearchMenuEvents,
  setupSearchNavDropdownEvents,
  setupProjectInfoEvents,
  setupSearchEvents, 
  setupPokemonDetailsEvents,
  setupResetHomeEvent,
  setupFavoritesEvents,
  setupClearFavoritesEvent, 
  setupLoadMoreEvents,
  setupInitialLoadRetryEvent,
  setupBrowseAllEvents,
  setupComparisonModeEvent,
  setupComparisonEvents,
} from "./events.js";

import { state } from "./state.js";
import { getFavorites, saveFavorites } from "./storage.js";
import { createPaginationController } from "./pagination.js";
import { createSearchController } from "./search.js";
import { createFavoritesController } from "./favorites.js";
import { createComparisonController } from "./comparison.js";

/** Mantiene visible el indicador el tiempo mínimo necesario para que la carga se perciba. */
const waitForMinimumLoading = (durationMs = 1200) => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

/**
 * Ejecuta una operación asíncrona con indicador de carga.
 * El identificador evita que una operación antigua oculte el indicador de una búsqueda más reciente.
 */
const runWithLoading = async (requestId, operation, loadingMessage) => {
  setLoadingIndicator(true, loadingMessage);

  const minimumWait = waitForMinimumLoading();

  try {
    return await operation();
  } finally {
    await minimumWait;

    if (requestId === state.searchRequestId) {
      setLoadingIndicator(false);
    }
  }
};

/** Devuelve la Pokédex a su portada limpia sin borrar los favoritos persistidos. */
const resetPokedexToIdle = () => {
  state.searchRequestId += 1;
  state.selectedPokemon = null;
  state.filteredPokemon = [...state.catalogPokemon];
  state.resultsMode = null;
  state.showFavoritesOnly = false;
  state.isLoadingMore = false;
  state.activeTypeFilter = null;
  state.typePokemonReferences = [];
  state.typeResultsOffset = 0;
  state.comparisonPokemonIds = [];
  state.comparisonSelectionMode = false;

  setSearchMenuOpen(false);
  document.querySelector("#searchInput").value = "";
  document.querySelector("#searchType").value = "";
  document.querySelector("#comparisonSearchInput").value = "";
  document.querySelector("#comparisonSearchType").value = "";

  clearPokemonGrid();
  clearPokemonDetails();
  clearPokemonComparison();
  clearSearchFeedback();
  clearSearchValidationFeedback();
  setFavoritesButtonPressed(false);
  setComparisonModeButtonPressed(false);
  setLoadMoreButtonState({ visible: false });
  renderComparisonToolbar([], false);
  setLoadingIndicator(false);
  setOperationState("idle");

  const app = document.querySelector("main");
  state.currentView = "search";
  app.dataset.view = "search";
  app.dataset.resultsMode = "";
  setResultsContext(null, "search", false);
};

/** Decide los límites de navegación según la colección desde la que se abrió la ficha. */
const getDetailNavigation = (pokemon, navigationMode) => {
  if (!navigationMode) {
    return null;
  }

  if (navigationMode === "favorites") {
    const favoriteIndex = state.favorites.indexOf(pokemon.id);
    return {
      canGoPrevious: favoriteIndex > 0,
      canGoNext: favoriteIndex >= 0 && favoriteIndex < state.favorites.length - 1,
    };
  }

  if (navigationMode === "type") {
    const typeIndex = state.typePokemonReferences.findIndex(({ name }) => name === pokemon.name);
    return {
      canGoPrevious: typeIndex > 0,
      canGoNext: typeIndex >= 0 && typeIndex < state.typePokemonReferences.length - 1,
    };
  }

  return {
    canGoPrevious: pokemon.id > 1,
    canGoNext: pokemon.id < state.catalogTotalCount,
  };
};

/** Obtiene una descripción en español (o inglés como alternativa) y presenta la ficha vigente. */
const selectPokemon = async (pokemon, requestId, backButtonLabel, navigationMode = null) => {
  try {
    const speciesData = await getPokemonSpecies(
      pokemon.species.url
    );

    if (requestId !== state.searchRequestId) {
      return false;
    }

    const descriptionEntries = speciesData.flavor_text_entries ?? [];
    const descriptionEntry = descriptionEntries.find((entry) => entry.language.name === "es")
      ?? descriptionEntries.find((entry) => entry.language.name === "en");

    const description = descriptionEntry?.flavor_text
      ?.replace(/[\n\f]/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? "No hay una descripción disponible.";

    renderPokemonDetails(
      pokemon,
      description,
      backButtonLabel,
      state.favorites.includes(pokemon.id),
      state.comparisonPokemonIds.includes(pokemon.id),
      getDetailNavigation(pokemon, navigationMode)
    );
    return true;
  } catch (error) {
    console.error("No se pudo cargar la ficha del Pokémon:", error);

    if (requestId === state.searchRequestId) {
      setOperationState("error");
      showSearchFeedback("No se pudo cargar la ficha de este Pokémon. Inténtalo de nuevo.");
    }
    return false;
  }
};

/** Busca primero en memoria y consulta la API solo si el Pokémon todavía no está cargado. */
const getPokemonFromCacheOrApi = async (identifier) => {
  const normalizedIdentifier = String(identifier).trim().toLowerCase();

  const cachedPokemon = state.pokemon.find((pokemon) => {
    const matchesId = pokemon.id === Number(normalizedIdentifier);
    const matchesName = pokemon.name === normalizedIdentifier;
    return matchesId || matchesName;
  });

  if (cachedPokemon) {
    return cachedPokemon;
  }

  const fetchedPokemon = await getPokemonByIdOrName(normalizedIdentifier);

  // Otra petición podría haber cargado el mismo Pokémon mientras esta solicitud esperaba a la API.
  const pokemonAddedWhileFetching = state.pokemon.find((pokemon) => {
    return pokemon.id === fetchedPokemon.id;
  });

  if (pokemonAddedWhileFetching) {
    return pokemonAddedWhileFetching;
  }

  state.pokemon = [...state.pokemon, fetchedPokemon];
  return fetchedPokemon;
};

/** Carga el catálogo inicial y registra los callbacks que controlan la aplicación. */
const initApp = async () => {
  try {
    // Se restaura la lista de IDs; los datos completos se resuelven desde caché o PokeAPI cuando se necesitan.
    state.favorites = getFavorites();

    // La portada empieza con 20 Pokémon y conserva los metadatos de paginación devueltos por PokeAPI.
    const data = await getPokemonPage(20, 0);
    state.nextOffset = data.results.length;
    state.hasMorePokemon = data.next !== null;
    state.catalogTotalCount = data.count;
    state.isLoadingMore = false;
    state.activeTypeFilter = null;

    const pokemonPromises = data.results.map((pokemon) => {
      return getPokemonDetails(pokemon.url);
    });

    const pokemonDetails = await Promise.all(pokemonPromises);

    clearSearchFeedback();
    setInitialLoadRetryState({ visible: false });

    state.pokemon = [...pokemonDetails];
    state.catalogPokemon = [...pokemonDetails];
    state.filteredPokemon = [...state.catalogPokemon];

    const app = document.querySelector("main");
    // data-view conecta el estado controlado por JavaScript con las reglas visuales del CSS.
    const setView = (view) => {
      state.currentView = view;
      app.dataset.view = view;
      app.dataset.resultsMode = state.resultsMode ?? "";
      setResultsContext(state.resultsMode, view, state.comparisonSelectionMode);
    };

    let detailReturnView = "search";

    const navigateBetweenPokemon = async (direction, event) => {
      const directionOffset = direction === "previous" ? -1 : direction === "next" ? 1 : 0;
      const currentPokemon = state.selectedPokemon;

      if (!currentPokemon || directionOffset === 0) {
        return;
      }

      let adjacentPokemonRequest;

      if (detailReturnView === "results" && state.resultsMode === "favorites") {
        const currentIndex = state.favorites.indexOf(currentPokemon.id);
        const adjacentFavoriteId = state.favorites[currentIndex + directionOffset];

        if (currentIndex < 0 || adjacentFavoriteId === undefined) {
          return;
        }

        adjacentPokemonRequest = {
          identifier: adjacentFavoriteId,
        };
      } else if (detailReturnView === "results" && state.resultsMode === "type") {
        const currentIndex = state.typePokemonReferences.findIndex(
          ({ name }) => name === currentPokemon.name
        );
        const adjacentReference = state.typePokemonReferences[currentIndex + directionOffset];

        if (currentIndex < 0 || !adjacentReference) {
          return;
        }

        adjacentPokemonRequest = {
          identifier: adjacentReference.name,
        };
      } else {
        const adjacentPokemonId = currentPokemon.id + directionOffset;

        if (adjacentPokemonId < 1 || adjacentPokemonId > state.catalogTotalCount) {
          return;
        }

        adjacentPokemonRequest = {
          identifier: adjacentPokemonId,
        };
      }

      if (!adjacentPokemonRequest) {
        return;
      }

      const requestId = ++state.searchRequestId;
      clearSearchFeedback();

      try {
        const renderedDetails = await runWithLoading(requestId, async () => {
          const adjacentPokemon = await getPokemonFromCacheOrApi(
            adjacentPokemonRequest.identifier
          );

          if (requestId !== state.searchRequestId) {
            return false;
          }

          const didRender = await selectPokemon(
            adjacentPokemon,
            requestId,
            detailReturnView === "search" ? "Volver a buscar" : "Volver a resultados",
            detailReturnView === "search" ? "global" : state.resultsMode
          );

          if (didRender && requestId === state.searchRequestId) {
            state.selectedPokemon = adjacentPokemon;
          }

          return didRender;
        }, `Cargando Pokémon ${direction === "previous" ? "anterior" : "siguiente"}...`);

        if (requestId !== state.searchRequestId || !renderedDetails) {
          return;
        }

        setOperationState("success");

        if (event.detail === 0) {
          document.querySelector(
            `[data-action="navigate-detail"][data-direction="${direction}"]`
          )?.focus();
        }
      } catch (error) {
        if (requestId !== state.searchRequestId) {
          return;
        }

        setOperationState("error");
        showSearchFeedback(
          error.status === 404
            ? `No se encontró el Pokémon ${adjacentPokemonRequest.identifier}.`
            : "No se pudo cargar el Pokémon. Inténtalo de nuevo."
        );
      }
    };

    const getComparisonPokemon = () => state.comparisonPokemonIds
      .map((pokemonId) => state.pokemon.find((pokemon) => pokemon.id === pokemonId))
      .filter(Boolean);

    const renderCurrentGrid = (selectedPokemonId = state.selectedPokemon?.id ?? null) => {
      renderPokemonGrid(
        state.filteredPokemon,
        selectedPokemonId,
        state.favorites,
        state.comparisonPokemonIds
      );
      renderComparisonToolbar(getComparisonPokemon(), state.comparisonSelectionMode);
    };

    const updateLoadMoreButton = (loading = state.isLoadingMore) => {
      const hasMoreResults = state.resultsMode === "type"
        ? state.typeResultsOffset < state.typePokemonReferences.length
        : state.resultsMode === "catalog" && state.hasMorePokemon;

      setLoadMoreButtonState({
        visible: hasMoreResults,
        loading,
        label: state.resultsMode === "type"
          ? "Cargar más Pokémon de este tipo"
          : "Cargar más Pokémon",
      });
    };

    const { loadNextTypeBatch, loadNextCatalogPage } = createPaginationController({
      state,
      getPokemonPage,
      getPokemonFromCacheOrApi,
      renderCurrentGrid,
      showSearchFeedback,
      setOperationState,
      setLoadMoreButtonState,
      updateLoadMoreButton,
    });

    // Evita que una búsqueda sin coincidencias deje visibles resultados o detalles anteriores.
    const showEmptySearch = (message) => {
      state.filteredPokemon = [];
      state.selectedPokemon = null;
      state.resultsMode = null;
      state.activeTypeFilter = null;
      state.typePokemonReferences = [];
      state.typeResultsOffset = 0;
      state.isLoadingMore = false;
      clearPokemonGrid();
      clearPokemonDetails();
      updateLoadMoreButton();
      renderComparisonToolbar(getComparisonPokemon(), state.comparisonSelectionMode);
      setOperationState("error");
      setView("search");
      showSearchFeedback(message);
    };

    // Mantiene la paginación correspondiente a la fuente de resultados activa.
    const resetLoadMoreState = () => {
      state.isLoadingMore = false;
      updateLoadMoreButton();
    };

    // Una validación nueva limpia filtros y resultados anteriores antes de mostrar su mensaje.
    const resetResultsForValidation = () => {
      state.filteredPokemon = [];
      state.selectedPokemon = null;
      state.showFavoritesOnly = false;
      state.resultsMode = null;
      state.isLoadingMore = false;
      state.activeTypeFilter = null;
      state.typePokemonReferences = [];
      state.typeResultsOffset = 0;

      clearPokemonGrid();
      clearPokemonDetails();
      clearSearchFeedback();
      clearSearchValidationFeedback();
      setFavoritesButtonPressed(false);
      updateLoadMoreButton();
      renderComparisonToolbar(getComparisonPokemon(), state.comparisonSelectionMode);
      setLoadingIndicator(false);
      setView("search");
    };

    const favoritesController = createFavoritesController({
      state,
      getPokemonFromCacheOrApi,
      saveFavorites,
      runWithLoading,
      setSearchMenuOpen,
      setLoadingIndicator,
      setOperationState,
      setLoadMoreButtonState,
      setPokemonDetailsFavorite,
      clearPokemonDetails,
      clearSearchFeedback,
      showSearchFeedback,
      updateLoadMoreButton,
      renderCurrentGrid,
      setView,
      resetLoadMoreState,
    });

    const searchController = createSearchController({
      state,
      getPokemonFromCacheOrApi,
      getPokemonByType,
      runWithLoading,
      selectPokemon,
      loadNextTypeBatch,
      clearPokemonGrid,
      clearPokemonDetails,
      showSearchFeedback,
      clearSearchFeedback,
      showSearchValidationFeedback,
      showComparisonSearchValidationFeedback,
      clearSearchValidationFeedback,
      setOperationState,
      setSearchMenuOpen,
      setFavoritesButtonPressed,
      updateLoadMoreButton,
      setView,
      renderCurrentGrid,
      showEmptySearch,
      resetResultsForValidation,
      setDetailReturnView: (view) => {
        detailReturnView = view;
      },
    });

    const comparisonController = createComparisonController({
      state,
      getComparisonPokemon,
      renderCurrentGrid,
      showSearchFeedback,
      setPokemonDetailsCompared,
      setLoadingIndicator,
      setSearchMenuOpen,
      setComparisonModeButtonPressed,
      setFavoritesButtonPressed,
      clearPokemonDetails,
      clearPokemonComparison,
      clearSearchFeedback,
      clearSearchValidationFeedback,
      updateLoadMoreButton,
      setView,
      renderPokemonComparison,
      focusPokemonGrid: () => document.querySelector("#pokemonGrid")?.focus(),
      focusComparisonSearch: () => document.querySelector("#comparisonSearchInput")?.focus(),
      focusPokemonComparison: () => document.querySelector("#pokemonComparison")?.focus(),
      focusCompareNowButton: () => document.querySelector("#compareNowButton")?.focus(),
    });

    setupSearchEvents(searchController.handleSearch);
    setupSearchEvents(searchController.handleSearch, {
      inputSelector: "#comparisonSearchInput",
      typeSelector: "#comparisonSearchType",
      buttonSelector: "#comparisonSearchButton",
      searchSource: "comparison",
    });

    // El callback del botón delega en el paginador correspondiente a la vista activa.
    setupLoadMoreEvents(() => {
      if (state.resultsMode === "type") {
        return loadNextTypeBatch();
      }
      return loadNextCatalogPage();
    });

    setupBrowseAllEvents((event) => {
      state.searchRequestId += 1;
      setLoadingIndicator(false);
      setSearchMenuOpen(false);
      state.resultsMode = "catalog";
      state.showFavoritesOnly = false;
      state.selectedPokemon = null;
      state.activeTypeFilter = null;
      state.typePokemonReferences = [];
      state.typeResultsOffset = 0;
      state.isLoadingMore = false;
      state.filteredPokemon = [...state.catalogPokemon];
      setFavoritesButtonPressed(false);
      clearPokemonDetails();
      clearPokemonComparison();
      clearSearchFeedback();
      clearSearchValidationFeedback();
      updateLoadMoreButton();
      renderCurrentGrid(null);
      showSearchFeedback(
        `Mostrando ${state.catalogPokemon.length} de ${state.catalogTotalCount} Pokémon.`
      );
      setView("results");

      if (event.detail === 0) {
        document.querySelector("#pokemonGrid")?.focus();
      }
    });

    setupComparisonModeEvent(comparisonController.handleComparisonModeToggle);
    setupComparisonEvents(
      comparisonController.handleCompareNow,
      comparisonController.handleClearComparison,
      comparisonController.handleExitComparison
    );

    // Alterna entre el catálogo inicial y todos los favoritos, aunque algunos requieran una consulta a la API.
    setupFavoritesEvents(favoritesController.handleFavoritesToggle);

    setupClearFavoritesEvent(favoritesController.handleClearFavorites);

    // Un único listener delegado procesa selección, favoritos, detalle y clics fuera del grid.
    setupPokemonGridEvents(async (action, pokemonId) => {
      if (action === "deselect") {
        if (state.currentView !== "preview-selected") {
          return;
        }

        state.selectedPokemon = null;
        renderCurrentGrid(null);
        resetLoadMoreState();
        setView("results");
        return;
      }

      const clickedPokemon = state.pokemon.find((pokemon) => {
        return pokemon.id === pokemonId;
      });
      
      if (!clickedPokemon) {
        return;
      }

      if(action === "toggle-favorite") {
        favoritesController.toggleFavorite(pokemonId);
        return;
      }

      if (action === "toggle-compare") {
        comparisonController.toggleComparison(pokemonId);
        return;
      }

      if(action === "select") {
        // La selección resalta una tarjeta y muestra su acción de detalle, sin salir del grid.
        state.searchRequestId += 1;
        setSearchMenuOpen(false);
        resetLoadMoreState();
        state.selectedPokemon = clickedPokemon;

        renderCurrentGrid(state.selectedPokemon.id);

        setView("preview-selected");
        return;
      }

      if(action === "view-detail") {

        if(!state.selectedPokemon) {
          return;
        }
        
        const requestId = ++state.searchRequestId;
        setSearchMenuOpen(false);
        detailReturnView = "results";
        resetLoadMoreState();
        const renderedDetails = await selectPokemon(
          state.selectedPokemon,
          requestId,
          "Volver a resultados",
          state.resultsMode
        );

        if (requestId !== state.searchRequestId) return;

        if (!renderedDetails) {
          setView("preview-selected");
          return;
        }

        setView("detail");
        return;
      };
    });

    // Conecta regreso, favoritos y comparación desde la ficha del Pokémon.
    setupPokemonDetailsEvents(() => {
      state.searchRequestId += 1;
      clearPokemonDetails();
      clearSearchFeedback();

      if (detailReturnView === "results") {
        const selectedPokemonIsVisible = state.filteredPokemon.some((pokemon) => {
          return pokemon.id === state.selectedPokemon?.id;
        });

        if (!selectedPokemonIsVisible) {
          state.selectedPokemon = null;
        }

        renderCurrentGrid();
        if (state.showFavoritesOnly && state.filteredPokemon.length === 0) {
          showSearchFeedback("No hay favoritos.");
        }
        resetLoadMoreState();
        setView(selectedPokemonIsVisible ? "preview-selected" : "results");
        return;
      }

      state.selectedPokemon = null;
      setView("search");
      setSearchMenuOpen(true, { focusSearchInput: true });
    }, favoritesController.handleDetailsFavoriteToggle, comparisonController.toggleComparison, navigateBetweenPokemon);

    setView("search");

  } catch (error) {
      // Si falla la carga inicial, se muestra el estado de error en el panel compartido de feedback.
      console.error("No se pudo iniciar la Pokédex:", error);
      setOperationState("error");
      showSearchFeedback(
        'No se pudieron cargar los datos de Pokémon. Pulsa "Reintentar carga inicial" para intentarlo de nuevo.'
      );
      setInitialLoadRetryState({ visible: true });
  }
};

setupSearchMenuEvents(setSearchMenuOpen);
setupSearchNavDropdownEvents();
setupProjectInfoEvents({ openOnStart: true });
setupResetHomeEvent(resetPokedexToIdle);
setupInitialLoadRetryEvent(async () => {
  setInitialLoadRetryState({ visible: true, loading: true });
  await initApp();
});
initApp();
