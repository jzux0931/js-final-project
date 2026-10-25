// Coordina la carga incremental del catálogo general y de los resultados por tipo.
export const createPaginationController = ({
  state,
  getPokemonPage,
  getPokemonFromCacheOrApi,
  renderCurrentGrid,
  showSearchFeedback,
  setOperationState,
  setLoadMoreButtonState,
  updateLoadMoreButton,
}) => {
  // Añade hasta 20 Pokémon del tipo activo, reutilizando los que ya están en memoria.
  const loadNextTypeBatch = async () => {
    if (state.isLoadingMore || !state.activeTypeFilter) {
      return;
    }

    const requestId = state.searchRequestId;
    const batch = state.typePokemonReferences.slice(
      state.typeResultsOffset,
      state.typeResultsOffset + 20
    );

    if (!batch.length) {
      setLoadMoreButtonState({ visible: false });
      return;
    }

    state.isLoadingMore = true;
    setLoadMoreButtonState({ visible: true, loading: true });

    try {
      const batchPokemon = await Promise.all(
        batch.map((reference) => getPokemonFromCacheOrApi(reference.name))
      );

      if (requestId !== state.searchRequestId) {
        return;
      }

      const existingIds = new Set(state.filteredPokemon.map((pokemon) => pokemon.id));
      const newPokemon = batchPokemon.filter((pokemon) => !existingIds.has(pokemon.id));

      state.filteredPokemon = [...state.filteredPokemon, ...newPokemon];
      state.typeResultsOffset += batch.length;

      renderCurrentGrid();
      showSearchFeedback(
        `Mostrando ${state.filteredPokemon.length} de ${state.typePokemonReferences.length} Pokémon de tipo ${state.activeTypeFilter}.`
      );
    } catch (error) {
      if (requestId === state.searchRequestId) {
        console.error("No se pudo cargar el siguiente lote por tipo:", error);
        setOperationState("error");
        showSearchFeedback("No se pudieron cargar más Pokémon. Inténtalo de nuevo.");
      }
    } finally {
      if (requestId === state.searchRequestId) {
        state.isLoadingMore = false;
        updateLoadMoreButton();
      }
    }
  };

  // Añade la siguiente página del catálogo sin mezclarla con resultados de tipo o favoritos.
  const loadNextCatalogPage = async () => {
    if (state.isLoadingMore || !state.hasMorePokemon || state.resultsMode !== "catalog") {
      return;
    }

    const requestId = state.searchRequestId;
    state.isLoadingMore = true;
    updateLoadMoreButton(true);

    try {
      const page = await getPokemonPage(20, state.nextOffset);
      if (requestId !== state.searchRequestId) return;

      const pagePokemon = await Promise.all(
        page.results.map(({ name }) => getPokemonFromCacheOrApi(name))
      );
      if (requestId !== state.searchRequestId) return;

      const knownIds = new Set(state.catalogPokemon.map(({ id }) => id));
      const newCatalogPokemon = pagePokemon.filter(({ id }) => !knownIds.has(id));
      state.catalogPokemon = [...state.catalogPokemon, ...newCatalogPokemon];
      state.filteredPokemon = [...state.catalogPokemon];
      state.nextOffset += page.results.length;
      state.hasMorePokemon = Boolean(page.next);
      state.catalogTotalCount = page.count;

      renderCurrentGrid();
      showSearchFeedback(
        `Mostrando ${state.catalogPokemon.length} de ${state.catalogTotalCount} Pokémon.`
      );
    } catch (error) {
      if (requestId === state.searchRequestId) {
        console.error("No se pudo cargar la siguiente página del catálogo:", error);
        setOperationState("error");
        showSearchFeedback("No se pudo cargar más Pokémon. Inténtalo de nuevo.");
      }
    } finally {
      if (requestId === state.searchRequestId) {
        state.isLoadingMore = false;
        updateLoadMoreButton();
      }
    }
  };

  return { loadNextTypeBatch, loadNextCatalogPage };
};
