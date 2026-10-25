/** Coordina la selección y las transiciones propias del modo de comparación. */
export const createComparisonController = ({
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
  focusPokemonGrid,
  focusComparisonSearch,
  focusPokemonComparison,
  focusCompareNowButton,
}) => {
  let comparisonReturnView = "results";

  const toggleComparison = (pokemonId) => {
    const isAlreadyCompared = state.comparisonPokemonIds.includes(pokemonId);

    if (isAlreadyCompared) {
      state.comparisonPokemonIds = state.comparisonPokemonIds.filter((id) => id !== pokemonId);
    } else if (state.comparisonPokemonIds.length < 2) {
      state.comparisonPokemonIds = [...state.comparisonPokemonIds, pokemonId];
    } else {
      showSearchFeedback("La comparación admite dos Pokémon. Quita uno para elegir otro.");
      return;
    }

    renderCurrentGrid();

    if (state.currentView === "detail" && state.selectedPokemon?.id === pokemonId) {
      setPokemonDetailsCompared(state.comparisonPokemonIds.includes(pokemonId));
    }
    clearPokemonComparison();
  };

  // El modo comparación reutiliza el catálogo y los controles de búsqueda existentes.
  const handleComparisonModeToggle = (isActive, event) => {
    state.searchRequestId += 1;
    setLoadingIndicator(false);
    setSearchMenuOpen(false);
    state.comparisonSelectionMode = isActive;
    state.comparisonPokemonIds = [];
    state.showFavoritesOnly = false;
    state.resultsMode = "catalog";
    state.selectedPokemon = null;
    state.activeTypeFilter = null;
    state.typePokemonReferences = [];
    state.typeResultsOffset = 0;
    state.isLoadingMore = false;
    state.filteredPokemon = [...state.catalogPokemon];

    setComparisonModeButtonPressed(isActive);
    setFavoritesButtonPressed(false);
    clearPokemonDetails();
    clearPokemonComparison();
    clearSearchFeedback();
    clearSearchValidationFeedback();
    updateLoadMoreButton();
    renderCurrentGrid(null);
    setView("results");

    if (!isActive) {
      showSearchFeedback("Modo comparación cerrado. Explora el catálogo o inicia otra búsqueda.");
    }

    if (event.detail === 0) {
      if (isActive) {
        focusComparisonSearch();
      } else {
        focusPokemonGrid();
      }
    }
  };

  const handleCompareNow = () => {
    const [firstPokemon, secondPokemon] = getComparisonPokemon();
    if (!firstPokemon || !secondPokemon) return;

    comparisonReturnView = state.currentView;
    clearSearchFeedback();
    renderPokemonComparison(firstPokemon, secondPokemon);
    setView("comparison");
    focusPokemonComparison();
  };

  const handleClearComparison = () => {
    state.comparisonPokemonIds = [];
    clearPokemonComparison();

    if (state.currentView === "detail") {
      setPokemonDetailsCompared(false);
    }

    if (state.currentView === "comparison") {
      setView(comparisonReturnView);
    }
    renderCurrentGrid();
  };

  const handleExitComparison = () => {
    clearPokemonComparison();
    setView(comparisonReturnView);
    focusCompareNowButton();
  };

  return {
    toggleComparison,
    handleComparisonModeToggle,
    handleCompareNow,
    handleClearComparison,
    handleExitComparison,
  };
};
