import { directive, NodePart } from "lit-html";
import { attachPartsGarbageCollector, isConnected } from "./cleanup";
import { CLEANUP_PARTS_MS, Values, ValuesCallback } from "./model";
import { get, listenForLangChanged } from "./translate";

// Caches the parts and the translations.
// In the ideal world this would be a weakmap, but it is not possible to loop over weakmaps.
// This is the best solution until lit-html provides an API to clean up after directives.
const partCache = new Map<NodePart, {key: string, values?: Values | ValuesCallback, listen: boolean}>();

/**
 * Listens for changes in the language and updates all of the cached parts if necessary
 */
function attachTranslateListener () {
	listenForLangChanged(() => {
		for (const [part, {key, values, listen}] of partCache) {
			if (listen && isConnected(part)) {
				handleTranslation(part, key, values);
				part.commit();
			}
		}
	});
}

attachTranslateListener();
attachPartsGarbageCollector(partCache, CLEANUP_PARTS_MS);


/**
 * Handles the translation.
 * @param part
 * @param key
 * @param values
 */
function handleTranslation (part: NodePart,
                            key: string,
                            values?: Values | ValuesCallback | null) {

	// Translate the key and interpolate the values
	const translation = get(key, values);

	// Only set the value if the cache has changed
	if (part.value === translation) {
		return;
	}

	// Set the value of the new translation
	part.setValue(translation);
}


/**
 * A lit directive that updates the translation when the language changes.
 * @param key
 * @param values
 * @param listen
 */
export const translate = directive((key: string,
                                    values?: Values | ValuesCallback,
                                    listen = true) => (part: NodePart) => {
	partCache.set(part, {key, values, listen});
	handleTranslation(part, key, values);
});
