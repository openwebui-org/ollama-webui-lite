<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import { openDB, deleteDB } from 'idb';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';

	import { info, showSettings, settings, models, db, chats, chatId } from '$lib/stores';

	import SettingsModal from '$lib/components/chat/SettingsModal.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import toast from 'svelte-french-toast';
	import { OLLAMA_API_BASE_URL } from '$lib/constants';

	let requiredOllamaVersion = '0.1.16';
	let loaded = false;
	let dbReady = false;

	const getModels = async () => {
		let models = [];
		try {
			const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/api/tags`, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				}
			});
			if (!res.ok) throw await res.json();
			const data = await res.json();
			models.push(...(data?.models ?? []));
		} catch (error) {
			console.error('Error fetching models:', error);
			if ('detail' in error) {
				toast.error(error.detail);
			} else {
				toast.error('Server connection failed');
			}
		}
		return models;
	};

	const getDB = async () => {
		const DB = await openDB('Chats', 2, {
			// Increased version number
			upgrade(db, oldVersion, newVersion, transaction) {
				if (!db.objectStoreNames.contains('chats')) {
					const store = db.createObjectStore('chats', {
						keyPath: 'id',
						autoIncrement: true
					});
					store.createIndex('timestamp', 'timestamp');
				}
			}
		});

		return {
			db: DB,
			getChatById: async function (id) {
				try {
					return await this.db.get('chats', id);
				} catch (error) {
					console.error('Error getting chat by ID:', error);
					throw error;
				}
			},
			getChats: async function () {
				try {
					let chats = await this.db.getAllFromIndex('chats', 'timestamp');
					return chats.map((item, idx) => ({
						title: chats[chats.length - 1 - idx].title,
						id: chats[chats.length - 1 - idx].id
					}));
				} catch (error) {
					console.error('Error getting chats:', error);
					throw error;
				}
			},
			exportChats: async function () {
				try {
					let chats = await this.db.getAllFromIndex('chats', 'timestamp');
					return chats.map((item, idx) => chats[chats.length - 1 - idx]);
				} catch (error) {
					console.error('Error exporting chats:', error);
					throw error;
				}
			},
			addChats: async function (_chats) {
				try {
					for (const chat of _chats) {
						await this.addChat(chat);
					}
					await chats.set(await this.getChats());
				} catch (error) {
					console.error('Error adding chats:', error);
					throw error;
				}
			},
			addChat: async function (chat) {
				try {
					await this.db.put('chats', {
						...chat
					});
				} catch (error) {
					console.error('Error adding chat:', error);
					throw error;
				}
			},
			createNewChat: async function (chat) {
				try {
					await this.addChat({ ...chat, timestamp: Date.now() });
					await chats.set(await this.getChats());
				} catch (error) {
					console.error('Error creating new chat:', error);
					throw error;
				}
			},
			updateChatById: async function (id, updated) {
				try {
					const chat = await this.getChatById(id);
					await this.db.put('chats', {
						...chat,
						...updated,
						timestamp: Date.now()
					});
					await chats.set(await this.getChats());
				} catch (error) {
					console.error('Error updating chat:', error);
					throw error;
				}
			},
			deleteChatById: async function (id) {
				try {
					if ($chatId === id) {
						goto('/');
						await chatId.set(uuidv4());
					}
					await this.db.delete('chats', id);
					await chats.set(await this.getChats());
				} catch (error) {
					console.error('Error deleting chat:', error);
					throw error;
				}
			},
			deleteAllChat: async function () {
				try {
					const tx = this.db.transaction('chats', 'readwrite');
					await Promise.all([tx.store.clear(), tx.done]);
					await chats.set(await this.getChats());
				} catch (error) {
					console.error('Error deleting all chats:', error);
					throw error;
				}
			}
		};
	};

	const getOllamaVersion = async () => {
		try {
			const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/api/version`, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				}
			});
			if (!res.ok) throw await res.json();
			const data = await res.json();
			return data?.version ?? '0';
		} catch (error) {
			console.error('Error getting Ollama version:', error);
			if ('detail' in error) {
				toast.error(error.detail);
			} else {
				toast.error('Server connection failed');
			}
			return '0';
		}
	};

	const setOllamaVersion = async (ollamaVersion) => {
		await info.set({ ...$info, ollama: { version: ollamaVersion } });

		if (
			ollamaVersion.localeCompare(requiredOllamaVersion, undefined, {
				numeric: true,
				sensitivity: 'case',
				caseFirst: 'upper'
			}) < 0
		) {
			toast.error(`Ollama Version: ${ollamaVersion}`);
		}
	};

	onMount(async () => {
		try {
			await settings.set(JSON.parse(localStorage.getItem('settings') ?? '{}'));

			await models.set(await getModels());

			let _db = await getDB();
			await db.set(_db);
			dbReady = true;

			await setOllamaVersion(await getOllamaVersion());

			await tick();
			loaded = true;
		} catch (error) {
			console.error('Error during initialization:', error);
			toast.error('Failed to initialize the application. Please refresh the page.');
		}
	});
</script>

{#if loaded && dbReady}
	<div class="app relative">
		{#if ($info?.ollama?.version ?? '0').localeCompare( requiredOllamaVersion, undefined, { numeric: true, sensitivity: 'case', caseFirst: 'upper' } ) < 0}
			<div class="flex items-center justify-center h-screen">
				<div
					class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
					role="alert"
				>
					<strong class="font-bold">Upgrade Required!</strong>
					<span class="block sm:inline">
						Please upgrade Ollama to version {requiredOllamaVersion} or higher. Current version: {$info
							?.ollama?.version}
					</span>
				</div>
			</div>
		{/if}

		<div
			class="text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-h-screen overflow-auto flex flex-row"
		>
			<Sidebar />
			<SettingsModal bind:show={$showSettings} />
			<slot />
		</div>
	</div>
{:else}
	<div class="flex items-center justify-center h-screen">
		<p>Loading...</p>
	</div>
{/if}

<style>
	@keyframes l {
		to {
			clip-path: inset(0 -1ch 0 0);
		}
	}
</style>
