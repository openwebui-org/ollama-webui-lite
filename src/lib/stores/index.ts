import { writable } from 'svelte/store';

/**
 * Enhanced store setup to ensure we can handle image persistence in chats.
 *
 * We've kept the original stores and added a `selectedChat` store that will hold the currently
 * loaded chat (including any images) after retrieval from `db`.
 *
 * Ensure that when interacting with `db`, we store and retrieve the entire `history`
 * with images included. The `db` should support storing and fetching messages along
 * with their `images` property. When we load a chat using `db`, we set `selectedChat`
 * so that the entire `history` including images is in-memory, making navigation and
 * image persistence reliable.
 */

// Backend info store
export const info = writable({});

// Database reference
export const db = writable(undefined);

// Currently selected chat ID
export const chatId = writable('');

// All available chats (as fetched from db)
export const chats = writable([]);

// Models available on the server
export const models = writable([]);

// User's global settings (including models, advanced parameters, request/response format)
export const settings = writable({});

// Whether the settings modal is shown
export const showSettings = writable(false);

/**
 * The selectedChat store holds the entire chat history including images.
 * When we load a chat from db (or create a new one), we set selectedChat here.
 * This ensures that images are always present as we navigate through the conversation history.
 */
export const selectedChat = writable({
	messages: {},
	currentId: null,
	title: ''
});
