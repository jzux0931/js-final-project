// Estado compartido por los módulos de la aplicación; la interfaz se actualiza a partir de estos datos.
export const state = {
    catalogPokemon: [], // Pokémon cargados para la exploración general, organizados por páginas.
    pokemon: [], // Todos los Pokémon completos que ya están disponibles en memoria/caché.
    favorites: [], // IDs persistidos por el usuario; no se guardan objetos completos.
    filteredPokemon: [], // Lista de Pokémon que corresponde a la vista de resultados actual.
    selectedPokemon: null, // Pokémon seleccionado en el grid antes de abrir su ficha.
    currentView: "search", // Vista actual: búsqueda, resultados, vista previa o ficha.
    resultsMode: null, // Fuente activa del grid: catálogo, tipo, favoritos o detalle directo.
    showFavoritesOnly: false, // Indica si el grid debe mostrar exclusivamente favoritos.
    nextOffset: 0, // Posición desde la que se solicita la siguiente página del catálogo general.
    hasMorePokemon: true, // Indica si PokeAPI reportó otra página del catálogo general.
    catalogTotalCount: 0, // Total de Pokémon informado por PokeAPI para mostrar el progreso del catálogo.
    isLoadingMore: false, // Evita solicitudes simultáneas de paginación general o por tipo.
    activeTypeFilter: null, // Nombre del tipo cuyos resultados incrementales están activos.
    typePokemonReferences: [], // Referencias completas devueltas por el endpoint de tipo.
    typeResultsOffset: 0, // Cantidad de referencias de tipo procesadas hasta ahora.
    comparisonPokemonIds: [], // IDs de los dos Pokémon elegidos para la comparación temporal.
    comparisonSelectionMode: false, // En modo comparación, las búsquedas exactas muestran candidatos en el grid.
    searchRequestId: 0, // Versión usada para ignorar respuestas asíncronas que ya quedaron obsoletas.
};
