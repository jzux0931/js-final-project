// Coordina las búsquedas por nombre, ID y tipo usando servicios y acciones de UI inyectados.
export const createSearchController = ({
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
  setSearchMenuOpen,
  setFavoritesButtonPressed,
  updateLoadMoreButton,
  setView,
  renderCurrentGrid,
  showEmptySearch,
  resetResultsForValidation,
  setOperationState,
  setDetailReturnView,
}) => {
  // En modo comparación una búsqueda exacta muestra una tarjeta candidata en vez de abrir su ficha.
  const showComparisonCandidate = (pokemon) => {
    state.resultsMode = "comparison-search";
    state.activeTypeFilter = null;
    state.typePokemonReferences = [];
    state.typeResultsOffset = 0;
    state.filteredPokemon = [pokemon];
    state.selectedPokemon = null;

    clearPokemonGrid();
    clearPokemonDetails();
    updateLoadMoreButton();
    renderCurrentGrid(null);
    setView("results");
    showSearchFeedback("Selecciona este Pokémon con el botón Comparar de su tarjeta.");
  };

  // El identificador de solicitud permite ignorar resultados de búsquedas que ya quedaron atrás.
  const handleSearch = async (searchTerm, typeSearch, event, searchSource = "menu") => {
    const searchRequestId = ++state.searchRequestId;
    const showValidationFeedback = searchSource === "comparison"
      ? showComparisonSearchValidationFeedback
      : showSearchValidationFeedback;

    if (!searchTerm || !typeSearch) {
      resetResultsForValidation();
      showValidationFeedback("Escribe un Pokémon y selecciona un criterio de búsqueda.");
      return;
    }

    if (typeSearch === "id") {
      const requestedId = Number(searchTerm);

      if (!Number.isInteger(requestedId) || requestedId <= 0) {
        resetResultsForValidation();
        showValidationFeedback("Introduce un ID/numero entero mayor que cero.");
        return;
      }
    }

    clearSearchValidationFeedback();
    clearSearchFeedback();
    setSearchMenuOpen(false);

    state.showFavoritesOnly = false;
    state.resultsMode = null;
    state.isLoadingMore = false;
    setFavoritesButtonPressed(false);
    updateLoadMoreButton();

    if (typeSearch !== "type") {
      state.activeTypeFilter = null;
      state.typePokemonReferences = [];
      state.typeResultsOffset = 0;
    }

    if (typeSearch === "name") {
      state.activeTypeFilter = null;
      state.resultsMode = "detail";
      setDetailReturnView("search");

      const normalizedSearchTerm = searchTerm.toLowerCase();

      if (state.comparisonSelectionMode) {
        let candidatePokemon;

        try {
          candidatePokemon = await runWithLoading(
            searchRequestId,
            () => getPokemonFromCacheOrApi(normalizedSearchTerm)
          );
        } catch (error) {
          if (searchRequestId !== state.searchRequestId) return;

          showEmptySearch(
            error.status === 404
              ? "No se encontró ningún Pokémon llamado \"" + normalizedSearchTerm + "\"."
              : "No se pudieron cargar datos de Pokémon. Inténtalo de nuevo."
          );
          return;
        }

        if (searchRequestId !== state.searchRequestId) return;
        showComparisonCandidate(candidatePokemon);
        setOperationState("success");
        return;
      }

      let renderedDetails;

      try {
        renderedDetails = await runWithLoading(searchRequestId, async () => {
          const resultByName = await getPokemonFromCacheOrApi(normalizedSearchTerm);

          if (searchRequestId !== state.searchRequestId) {
            return false;
          }

          clearSearchFeedback();
          state.selectedPokemon = resultByName;

          return await selectPokemon(
            state.selectedPokemon,
            searchRequestId,
            "Volver a buscar",
            "global"
          );
        });
      } catch (error) {
        if (searchRequestId !== state.searchRequestId) return;

        showEmptySearch(
          error.status === 404
            ? "No se encontró ningún Pokémon llamado \"" + normalizedSearchTerm + "\"."
            : "No se pudieron cargar datos de Pokémon. Inténtalo de nuevo."
        );
        return;
      }

      if (searchRequestId !== state.searchRequestId) return;

      if (!renderedDetails) {
        state.selectedPokemon = null;
        clearPokemonDetails();
        setOperationState("error");
        setView("search");
        return;
      }

      setOperationState("success");
      setView("detail");
      return;
    }

    if (typeSearch === "id") {
      state.activeTypeFilter = null;
      state.resultsMode = "detail";
      setDetailReturnView("search");

      const normalizedSearchById = Number(searchTerm);

      if (state.comparisonSelectionMode) {
        let candidatePokemon;

        try {
          candidatePokemon = await runWithLoading(
            searchRequestId,
            () => getPokemonFromCacheOrApi(normalizedSearchById)
          );
        } catch (error) {
          if (searchRequestId !== state.searchRequestId) return;

          showEmptySearch(
            error.status === 404
              ? "No se encontró ningún Pokémon con el ID " + normalizedSearchById + "."
              : "No se pudieron cargar datos de Pokémon. Inténtalo de nuevo."
          );
          return;
        }

        if (searchRequestId !== state.searchRequestId) return;
        showComparisonCandidate(candidatePokemon);
        setOperationState("success");
        return;
      }

      let renderedDetails;

      try {
        renderedDetails = await runWithLoading(searchRequestId, async () => {
          const resultById = await getPokemonFromCacheOrApi(normalizedSearchById);

          if (searchRequestId !== state.searchRequestId) {
            return false;
          }

          clearSearchFeedback();
          state.selectedPokemon = resultById;

          return await selectPokemon(
            state.selectedPokemon,
            searchRequestId,
            "Volver a buscar",
            "global"
          );
        });
      } catch (error) {
        if (searchRequestId !== state.searchRequestId) return;

        showEmptySearch(
          error.status === 404
            ? "No se encontró ningún Pokémon con el ID " + normalizedSearchById + "."
            : "No se pudieron cargar datos de Pokémon. Inténtalo de nuevo."
        );
        return;
      }

      if (searchRequestId !== state.searchRequestId) return;

      if (!renderedDetails) {
        state.selectedPokemon = null;
        clearPokemonDetails();
        setOperationState("error");
        setView("search");
        return;
      }

      setOperationState("success");
      setView("detail");
      return;
    }

    if (typeSearch === "type") {
      state.resultsMode = "type";
      const normalizedSearchByType = searchTerm.toLowerCase();
      state.activeTypeFilter = normalizedSearchByType;
      state.typePokemonReferences = [];
      state.typeResultsOffset = 0;
      state.filteredPokemon = [];
      state.selectedPokemon = null;

      clearPokemonGrid();
      clearPokemonDetails();

      try {
        await runWithLoading(searchRequestId, async () => {
          const typeData = await getPokemonByType(normalizedSearchByType);

          if (searchRequestId !== state.searchRequestId) return;

          const referencesByName = new Map(
            typeData.pokemon.map(({ pokemon }) => [pokemon.name, pokemon])
          );

          state.typePokemonReferences = [...referencesByName.values()];

          if (!state.typePokemonReferences.length) {
            showEmptySearch(
              "No se encontraron Pokémon del tipo \"" + normalizedSearchByType + "\"."
            );
            return;
          }

          await loadNextTypeBatch();

          if (searchRequestId !== state.searchRequestId) return;
          setView("results");
        });

        if (
          searchRequestId === state.searchRequestId
          && state.resultsMode === "type"
          && state.filteredPokemon.length > 0
        ) {
          setOperationState("success");
        }
      } catch (error) {
        if (searchRequestId === state.searchRequestId) {
          console.error("No se pudo completar la búsqueda por tipo:", error);
          showEmptySearch(
            error.status === 404
              ? "No se encontraron Pokémon del tipo \"" + normalizedSearchByType + "\"."
              : "No se pudieron cargar datos de Pokémon. Inténtalo de nuevo."
          );
        }
      }
      return;
    }

    // Si llega un criterio inesperado, se limpia el filtro y se muestra el catálogo cargado.
    state.activeTypeFilter = null;
    state.typePokemonReferences = [];
    state.typeResultsOffset = 0;
    state.filteredPokemon = [...state.catalogPokemon];
    updateLoadMoreButton();
    setView("results");
  };

  return { handleSearch };
};
