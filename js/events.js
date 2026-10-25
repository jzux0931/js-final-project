// Este módulo registra interacciones del usuario y comunica las acciones al controlador mediante callbacks.

/**
 * Usa delegación en el grid: las tarjetas se crean dinámicamente, pero un solo listener detecta sus acciones.
 * También permite deseleccionar una tarjeta cuando el clic ocurre fuera del grid.
 */
export const setupPokemonGridEvents = (onPokemonAction) => {
    const pokemonGrid = document.querySelector("#pokemonGrid");
    const main = document.querySelector("main");

    pokemonGrid.addEventListener("click", (event) => {
        // Busca el botón accionable más cercano, incluso si el clic cayó sobre un elemento dentro del botón.
        const clickTarget = event.target.closest("[data-action]");

        if(!clickTarget) {
            return;
        }

        const action = clickTarget.dataset.action;
        const pokemonId = Number(clickTarget.dataset.pokemonId);

        Promise.resolve(onPokemonAction(action, pokemonId, event)).finally(() => {
            // Los controles se vuelven a crear al renderizar; devuelve el foco al equivalente actualizado.
            if (event.detail !== 0) return;

            const focusTarget = action === "view-detail"
                ? document.querySelector("#backToResultsButton")
                : pokemonGrid.querySelector(`[data-action="${action}"][data-pokemon-id="${pokemonId}"]`);

            if (focusTarget) {
                focusTarget.focus();
            } else {
                pokemonGrid.focus();
            }
        });

    });

    document.addEventListener("click", (event) => {
        // composedPath contempla el camino real del evento y evita deseleccionar al interactuar dentro del grid.
        const clickStartedInsideGrid = event.composedPath().includes(pokemonGrid);

        if (
            main.dataset.view !== "preview-selected"
            || clickStartedInsideGrid
        ) {
            return;
        }

        onPokemonAction("deselect");
    });
};

/** Delega en main las acciones de favorito, comparación y regreso desde la ficha. */
export const setupPokemonDetailsEvents = (onBack, onFavoriteToggle, onCompareToggle, onNavigate) => {
    const pokemonContainer = document.querySelector("#pokemonContainer");

    pokemonContainer.addEventListener("click", (event) => {
        const favoriteButton = event.target.closest('[data-action="toggle-favorite"]');

        if (favoriteButton) {
            onFavoriteToggle(Number(favoriteButton.dataset.pokemonId));
            return;
        }

        const compareButton = event.target.closest('[data-action="toggle-compare"]');

        if (compareButton) {
            onCompareToggle(Number(compareButton.dataset.pokemonId));
            return;
        }

        const navigationButton = event.target.closest('[data-action="navigate-detail"]');

        if (navigationButton) {
            onNavigate(navigationButton.dataset.direction, event);
            return;
        }

        const backButton = event.target.closest("#backToResultsButton");

        if (!backButton) {
            return;
        }

        onBack();
    });
};

/** Conecta el botón del menú y permite cerrarlo con Escape. */
export const setupSearchMenuEvents = (onMenuToggle) => {
    const searchMenuButton = document.querySelector("#searchMenuButton");

    searchMenuButton.addEventListener("click", () => {
        const isOpen = searchMenuButton.getAttribute("aria-expanded") === "true";
        onMenuToggle(!isOpen);
    });

    document.addEventListener("keydown", (event) => {
        const isOpen = searchMenuButton.getAttribute("aria-expanded") === "true";

        if (event.key === "Escape" && isOpen) {
            onMenuToggle(false);
        }
    });
};

/** Abre un desplegable de la barra y mantiene cerradas las demás secciones. */
export const setupSearchNavDropdownEvents = () => {
    const toggles = [...document.querySelectorAll("[data-nav-toggle]")];

    const setDropdownOpen = (toggle, isOpen) => {
        const dropdown = document.getElementById(toggle.getAttribute("aria-controls"));
        toggle.setAttribute("aria-expanded", String(isOpen));
        dropdown.setAttribute("aria-hidden", String(!isOpen));
        dropdown.inert = !isOpen;
        dropdown.hidden = !isOpen;
    };

    const closeOtherDropdowns = (activeToggle) => {
        toggles.forEach((toggle) => {
            if (toggle !== activeToggle) {
                setDropdownOpen(toggle, false);
            }
        });
    };

    toggles.forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const willOpen = toggle.getAttribute("aria-expanded") !== "true";
            closeOtherDropdowns(toggle);
            setDropdownOpen(toggle, willOpen);
        });

        // ArrowDown ofrece una forma de teclado para abrir y entrar directamente a cada sección.
        toggle.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowDown") return;

            event.preventDefault();
            closeOtherDropdowns(toggle);
            setDropdownOpen(toggle, true);
            document
                .getElementById(toggle.getAttribute("aria-controls"))
                .querySelector("input, select, button")
                ?.focus();
        });
    });
};

/** Pide confirmación antes de salir de la vista actual y regresar a la portada limpia. */
export const setupResetHomeEvent = (onReset) => {
    const resetHomeButton = document.querySelector("#resetHomeButton");

    resetHomeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const confirmed = window.confirm(
            "¿Quieres comenzar de nuevo y volver a la portada limpia? Se cerrará la vista actual, pero tus favoritos se conservarán."
        );

        if (confirmed) {
            onReset();
        }
    });
};

/** Presenta la guía breve paso a paso y devuelve el foco al botón al cerrarla. */
export const setupProjectInfoEvents = ({ openOnStart = false } = {}) => {
    const infoButton = document.querySelector("#projectInfoButton");
    const dialog = document.querySelector("#projectInfoDialog");
    const title = document.querySelector("#projectInfoTitle");
    const message = document.querySelector("#projectInfoMessage");
    const progress = document.querySelector("#projectInfoProgress");
    const closeButton = document.querySelector("#projectInfoCloseButton");
    const nextButton = document.querySelector("#projectInfoNextButton");

    const guideSteps = [
        {
            title: "Bienvenido al Pokédex Explorer",
            message: "Tu Pokédex interactiva para descubrir Pokémon, guardar favoritos y comparar sus estadísticas.",
        },
        {
            title: "Busca a cualquier Pokémon",
            message: "Abre el menú principal haciendo clic en el botón azul, entra en «Buscar» y prueba escogiendo por nombre, ID o tipo. Inicia la búsqueda con el botón o presionando Enter.",
        },
        {
            title: "Explora los resultados",
            message: "Los resultados por tipo aparecen como tarjetas interactivas. Selecciona una y haz clic en «Ver tarjeta» para poder ver sus datos y estadísticas.",
        },
        {
            title: "Guarda tus favoritos",
            message: "Haz clic en la estrella de una tarjeta o ficha para guardar el Pokémon en favoritos. La lista de tus favoritos se guarda en memoria y desde «Favoritos» puedes revisarla, comparar Pokémon o vaciarla.",
        },
        {
            title: "Compara y descubre",
            message: "Entra en «Comparar Pokémon» desde el menú. Busca por nombre, ID o tipo, o explora el catálogo; escoge dos tarjetas y compara sus tipos y estadísticas.",
        },
        {
            title: "Vuelve a la portada",
            message: "Para empezar de nuevo, abre el menú principal y haz clic en «Volver a portada». Te pedirá tu confirmación y, al aceptar, tendrás la Pokédex limpia. Tus favoritos se conservarán.",
        },
    ];

    let currentStep = 0;

    const renderStep = () => {
        const step = guideSteps[currentStep];
        const isLastStep = currentStep === guideSteps.length - 1;

        title.textContent = step.title;
        message.textContent = step.message;
        progress.textContent = `${currentStep + 1} / ${guideSteps.length}`;
        nextButton.setAttribute(
            "aria-label",
            isLastStep ? "Terminar guía" : "Siguiente explicación"
        );
        nextButton.classList.toggle("is-final", isLastStep);
        nextButton.innerHTML = isLastStep
            ? '<span aria-hidden="true">✓</span><span>Terminar guía</span>'
            : '<span aria-hidden="true">▼</span>';
    };

    const openGuide = () => {
        currentStep = 0;
        renderStep();
        dialog.showModal();
        infoButton.setAttribute("aria-expanded", "true");
    };

    infoButton.addEventListener("click", openGuide);

    nextButton.addEventListener("click", () => {
        if (currentStep === guideSteps.length - 1) {
            dialog.close();
            return;
        }

        currentStep += 1;
        renderStep();
    });

    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
        infoButton.setAttribute("aria-expanded", "false");
        infoButton.focus();
    });

    if (openOnStart) {
        openGuide();
    }
};

/** Envía al controlador el texto y el criterio de búsqueda tanto con el botón como con Enter. */
export const setupSearchEvents = (onSearch, {
    inputSelector = "#searchInput",
    typeSelector = "#searchType",
    buttonSelector = "#searchButton",
    searchSource = "menu",
} = {}) => {
    const searchInput = document.querySelector(inputSelector);
    const searchType = document.querySelector(typeSelector);
    const searchButton = document.querySelector(buttonSelector);

    // Unifica la lectura de ambos controles para que botón y teclado ejecuten la misma búsqueda.
    const handleSearch = (event) => {
        const searchTerm = searchInput.value.trim();
        const typeSearch = searchType.value;
        
        onSearch(searchTerm, typeSearch, event, searchSource);
    };

    searchButton.addEventListener("click", handleSearch);

    // Enter previene el comportamiento por defecto y reutiliza el mismo callback del botón.
    const handleEnterSearch = (event) => {
        if(event.key === "Enter") {
            event.preventDefault();
            handleSearch(event);
        };
    };

    searchInput.addEventListener("keydown", handleEnterSearch);
    searchType.addEventListener("keydown", handleEnterSearch);
};

/** Abre la vista de favoritos; repetir la acción no la desactiva. */
export const setupFavoritesEvents = (onFavoritesToggle) => {
    const favoritesButton = document.querySelector("#favoritesButton");
    favoritesButton.addEventListener('click', () => {
        favoritesButton.setAttribute("aria-pressed", "true");
        onFavoritesToggle(true);
    });
};

/** Registra la acción de vaciar favoritos; la confirmación y los cambios de estado viven en el controlador. */
export const setupClearFavoritesEvent = (onClearFavorites) => {
    const clearFavoritesButton = document.querySelector("#clearFavoritesButton");

    clearFavoritesButton.addEventListener('click', () => {
        onClearFavorites();
    });
};

/** Conecta el botón de carga incremental con la función que obtiene el siguiente lote. */
export const setupLoadMoreEvents = (onLoadMore) => {
    const loadMoreButton = document.querySelector("#loadMoreButton");

    loadMoreButton.addEventListener("click", () => {
        onLoadMore();
    });
};

/** Permite volver a intentar la carga inicial del catálogo después de un fallo de red. */
export const setupInitialLoadRetryEvent = (onRetry) => {
    const retryButton = document.querySelector("#initialLoadRetryButton");

    retryButton.addEventListener("click", async () => {
        const shouldRestoreFocus = document.activeElement === retryButton;
        await onRetry();

        if (retryButton.hidden && shouldRestoreFocus) {
            document.querySelector("#searchMenuButton")?.focus();
        }
    });
};

/** Conecta la opción de explorar el catálogo completo. */
export const setupBrowseAllEvents = (onBrowseAll) => {
    const browseAllButton = document.querySelector("#browseAllButton");

    browseAllButton.addEventListener("click", (event) => {
        onBrowseAll(event);
    });
};

/** Activa o cancela el modo independiente de selección para comparar Pokémon. */
export const setupComparisonModeEvent = (onComparisonModeToggle) => {
    const compareModeButton = document.querySelector("#compareModeButton");

    compareModeButton.addEventListener("click", (event) => {
        const isActive = compareModeButton.getAttribute("aria-pressed") === "true";
        const nextActive = !isActive;

        compareModeButton.setAttribute("aria-pressed", String(nextActive));
        onComparisonModeToggle(nextActive, event);
    });
};

/** Conecta la vista comparativa, la limpieza de selección y el regreso al contexto anterior. */
export const setupComparisonEvents = (onCompare, onClear, onBack) => {
    const compareNowButton = document.querySelector("#compareNowButton");
    const clearComparisonButton = document.querySelector("#clearComparisonButton");
    const pokemonComparison = document.querySelector("#pokemonComparison");

    compareNowButton.addEventListener("click", onCompare);
    clearComparisonButton.addEventListener("click", onClear);

    pokemonComparison.addEventListener("click", (event) => {
        if (event.target.closest('[data-action="back-to-results"]')) {
            onBack();
        }
    });
};
