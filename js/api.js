// Centraliza las peticiones HTTP a PokeAPI y convierte sus respuestas en datos JavaScript.
const POKEMON_API_URL = "https://pokeapi.co/api/v2/pokemon";

// Crea errores con el estado HTTP para que la interfaz pueda distinguir, por ejemplo, un 404.
const createApiError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/** Obtiene una página de referencias de Pokémon y conserva los metadatos de paginación de la API. */
export const getPokemonPage = async (limit, offset) => {
  const response = await fetch(
    `${POKEMON_API_URL}?limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw createApiError("No se pudo obtener la lista de Pokémon.", response.status);
  };

  const data = await response.json();

  return data;
};

/** Obtiene de PokeAPI la lista de Pokémon asociados con un tipo. */
export const getPokemonByType = async (type) => {
  const response = await fetch(
    `https://pokeapi.co/api/v2/type/${encodeURIComponent(String(type).trim().toLowerCase())}`
  );

  if (!response.ok) {
    throw createApiError("No se pudo obtener la lista de Pokémon por tipo.", response.status);
  }

  return response.json();
};

/** Busca un Pokémon por nombre o ID; normaliza el identificador antes de construir la URL. */
export const getPokemonByIdOrName = async (identifier) => {
  const normalizedIdentifier = encodeURIComponent(String(identifier).trim().toLowerCase());
  const pokemonUrl = `${POKEMON_API_URL}/${normalizedIdentifier}`;
  const pokemon = await getPokemonDetails(pokemonUrl);

  return pokemon;
};

/** Descarga y devuelve los datos completos de un Pokémon a partir de su URL. */
export const getPokemonDetails = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw createApiError("No se pudieron obtener los detalles del Pokémon.", response.status);
  };

  const details = await response.json();

  return details;
};

/** Descarga los datos de especie, que incluyen las descripciones traducidas del Pokémon. */
export const getPokemonSpecies = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw createApiError("No se pudo obtener la especie del Pokémon.", response.status);
  };

  const speciesData = await response.json();

  return speciesData;
};
