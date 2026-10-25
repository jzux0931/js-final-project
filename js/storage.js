// Clave estable con la que se persiste la lista de IDs favoritos en este navegador.
const FAVORITES_STORAGE_KEY = "pokedex-favorites";

/** Lee los favoritos; devuelve una lista vacía si no hay datos o el JSON guardado no es válido. */
export const getFavorites = () => {
    try {
        const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!savedFavorites) {
            return [];
        }

        // localStorage solo guarda texto, por eso se convierte el JSON de vuelta a un array.
        const favorites = JSON.parse(savedFavorites);
        if (!Array.isArray(favorites)) {
            return [];
        }

        return [...new Set(favorites.filter((id) => Number.isInteger(id) && id > 0))];
    } catch {
        // Un valor corrupto o un almacenamiento bloqueado no debe impedir que la app inicie.
        return [];
    }
};

/** Guarda la lista y comunica si el navegador permitió persistirla. */
export const saveFavorites = (favorites) => {
    try {
        const validFavorites = Array.isArray(favorites)
            ? [...new Set(favorites.filter((id) => Number.isInteger(id) && id > 0))]
            : [];
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(validFavorites));
        return true;
    } catch {
        // La aplicación puede seguir usando el estado en memoria durante esta sesión.
        return false;
    }
};
