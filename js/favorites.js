/** Encapsula las operaciones de favoritos y recibe la interfaz que necesita actualizar. */
export const createFavoritesController = ({
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
}) => {
  /** Resuelve IDs guardados a Pokémon completos, incluidos los que no están en el catálogo inicial. */
  const getFavoritePokemon = async () => {
    const favoritePokemonPromises = state.favorites.map((id) => {
      return getPokemonFromCacheOrApi(id);
    });

    return Promise.all(favoritePokemonPromises);
  };

  /** Alterna un favorito, persiste el cambio y sincroniza el grid actual. */
  const toggleFavorite = (pokemonId) => {
    const isAlreadyFavorite = state.favorites.includes(pokemonId);

    if (isAlreadyFavorite) {
      state.favorites = state.favorites.filter((favoriteId) => {
        return favoriteId !== pokemonId;
      });
    } else {
      state.favorites = [...state.favorites, pokemonId];
    }

    const wasSaved = saveFavorites(state.favorites);

    if (state.showFavoritesOnly) {
      state.filteredPokemon = state.filteredPokemon.filter((pokemon) => {
        return state.favorites.includes(pokemon.id);
      });

      if (state.filteredPokemon.length === 0) {
        showSearchFeedback(wasSaved
          ? "No hay favoritos."
          : "No hay favoritos. Los cambios no se guardaron en este navegador y solo estarán disponibles durante esta sesión.");
      } else {
        clearSearchFeedback();
      }
    }

    renderCurrentGrid();

    if (!wasSaved && (!state.showFavoritesOnly || state.filteredPokemon.length > 0)) {
      showSearchFeedback(
        "Los favoritos cambiaron en esta sesión, pero no se pudieron guardar en este navegador."
      );
    }

    return state.favorites.includes(pokemonId);
  };

  /** Cambia entre el catálogo y todos los favoritos, resolviendo los datos que falten. */
  const handleFavoritesToggle = async (showFavorites) => {
    const requestId = ++state.searchRequestId;
    setSearchMenuOpen(false);
    state.isLoadingMore = false;
    state.showFavoritesOnly = showFavorites;
    state.resultsMode = showFavorites ? "favorites" : "catalog";
    state.selectedPokemon = null;
    state.activeTypeFilter = null;
    state.typePokemonReferences = [];
    state.typeResultsOffset = 0;
    setLoadMoreButtonState({ visible: false });
    setLoadingIndicator(false);

    clearPokemonDetails();
    clearSearchFeedback();

    if (showFavorites) {
      try {
        const favoritePokemon = await runWithLoading(requestId, getFavoritePokemon);

        if (requestId !== state.searchRequestId) return;

        state.filteredPokemon = favoritePokemon;
        if (state.filteredPokemon.length === 0) {
          showSearchFeedback("No hay favoritos.");
        }
      } catch (error) {
        if (requestId !== state.searchRequestId) return;

        console.error("No se pudieron cargar los Pokémon favoritos:", error);
        state.filteredPokemon = [];
        showSearchFeedback("No se pudieron cargar tus favoritos. Comprueba tu conexión e inténtalo de nuevo.");
      }
    } else {
      state.filteredPokemon = [...state.catalogPokemon];
    }

    if (requestId !== state.searchRequestId) return;

    updateLoadMoreButton();
    renderCurrentGrid();
    setView("results");
  };

  /** Vacía la lista solo tras confirmar y mantiene coherentes almacenamiento, estado y vista. */
  const handleClearFavorites = async () => {
    if (state.favorites.length === 0) return;

    const confirmed = window.confirm(
      "¿Seguro que quieres borrar todos los favoritos?"
    );

    if (!confirmed) return;

    setSearchMenuOpen(false);
    const requestId = ++state.searchRequestId;
    resetLoadMoreState();
    let wasSaved;

    try {
      wasSaved = await runWithLoading(
        requestId,
        () => {
          state.favorites = [];
          return saveFavorites(state.favorites);
        },
        "Vaciando favoritos..."
      );
    } catch (error) {
      if (requestId !== state.searchRequestId) return;

      console.error("No se pudieron vaciar los favoritos:", error);
      state.selectedPokemon = null;
      if (state.showFavoritesOnly) state.filteredPokemon = [];
      clearPokemonDetails();
      clearSearchFeedback();
      showSearchFeedback("No se pudieron vaciar los favoritos. Inténtalo de nuevo.");
      renderCurrentGrid();
      setView("results");
      setOperationState("error");
      return;
    }

    if (requestId !== state.searchRequestId) return;

    state.selectedPokemon = null;
    clearPokemonDetails();
    clearSearchFeedback();

    if (state.showFavoritesOnly) {
      state.filteredPokemon = [];
    }

    showSearchFeedback(wasSaved
      ? "Tus favoritos se vaciaron correctamente."
      : "La lista se vació en esta sesión, pero no se pudo guardar el cambio en este navegador.");
    renderCurrentGrid();
    setView("results");
    setOperationState(wasSaved ? "success" : "error");
  };

  /** Sincroniza la estrella de la ficha y evita conservar una selección ya quitada del grid favorito. */
  const handleDetailsFavoriteToggle = (pokemonId) => {
    const isRemovingFavorite = state.favorites.includes(pokemonId);

    if (
      isRemovingFavorite
      && state.showFavoritesOnly
      && state.selectedPokemon?.id === pokemonId
    ) {
      state.selectedPokemon = null;
    }

    const isFavorite = toggleFavorite(pokemonId);
    setPokemonDetailsFavorite(isFavorite);
  };

  return {
    toggleFavorite,
    handleFavoritesToggle,
    handleClearFavorites,
    handleDetailsFavoriteToggle,
  };
};
