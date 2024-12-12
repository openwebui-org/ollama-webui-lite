<script lang="ts">
	import Modal from '../common/Modal.svelte';
	import { WEB_UI_VERSION, OLLAMA_API_BASE_URL } from '$lib/constants';
	import toast from 'svelte-french-toast';
	import { onMount } from 'svelte';
	import { info, models, settings } from '$lib/stores';
	import { splitStream } from '$lib/utils';
	import Advanced from './Settings/Advanced.svelte';

	export let show = false;

	const saveSettings = async (updated) => {
		console.log(updated);
		updated.options = {
			...updated.options,
			format: format !== '' ? format : undefined
		};
		await settings.set({ ...$settings, ...updated });
		await models.set(await getModels());
		localStorage.setItem('settings', JSON.stringify($settings));
	};

	let selectedTab = 'general';

	// General
	let API_BASE_URL = OLLAMA_API_BASE_URL;
	let theme = 'dark';
	let notificationEnabled = false;

	// Advanced
	let requestFormat = '';
	let format = '';
	let options = {
		seed: 0,
		temperature: '',
		repeat_penalty: '',
		repeat_last_n: '',
		mirostat: '',
		mirostat_eta: '',
		mirostat_tau: '',
		top_k: '',
		top_p: '',
		stop: '',
		tfs_z: '',
		num_ctx: ''
	};

	// Models
	let modelTag = '';
	let deleteModelTag = '';
	let digest = '';
	let pullProgress = null;
	let sourceModel = '';
	let destinationModel = '';
	let runningModels = [];

	const checkOllamaConnection = async () => {
		if (API_BASE_URL === '') {
			API_BASE_URL = OLLAMA_API_BASE_URL;
		}
		const _models = await getModels(API_BASE_URL, 'ollama');

		if (_models.length > 0) {
			toast.success('Server connection verified');
			await models.set(_models);

			saveSettings({
				API_BASE_URL: API_BASE_URL
			});
		}
	};

	const toggleTheme = async () => {
		theme = theme === 'dark' ? 'light' : 'dark';
		localStorage.theme = theme;
		document.documentElement.classList.remove(theme === 'dark' ? 'light' : 'dark');
		document.documentElement.classList.add(theme);
	};

	const toggleRequestFormat = async () => {
		requestFormat = requestFormat === '' ? 'json' : '';
		saveSettings({ requestFormat: requestFormat !== '' ? requestFormat : undefined });
	};

	const pullModelHandler = async () => {
		const res = await fetch(`${API_BASE_URL}/api/pull`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				name: modelTag,
				stream: true
			})
		});

		const reader = res.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(splitStream('\n'))
			.getReader();

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			try {
				let lines = value.split('\n');

				for (const line of lines) {
					if (line !== '') {
						console.log(line);
						let data = JSON.parse(line);
						console.log(data);

						if (data.error) {
							throw data.error;
						}

						if (data.status) {
							if (data.status === 'pulling manifest') {
								toast.success('Pulling model manifest');
							} else if (data.status.startsWith('downloading')) {
								digest = data.digest;
								if (data.total && data.completed) {
									pullProgress = Math.round((data.completed / data.total) * 1000) / 10;
								}
							} else if (data.status === 'verifying sha256 digest') {
								toast.success('Verifying model integrity');
							} else if (data.status === 'writing manifest') {
								toast.success('Writing model manifest');
							} else if (data.status === 'success') {
								toast.success(`Model '${modelTag}' has been successfully downloaded.`);
								if (notificationEnabled) {
									new Notification(`Ollama`, {
										body: `Model '${modelTag}' has been successfully downloaded.`,
										icon: '/favicon.png'
									});
								}
							}
						}
					}
				}
			} catch (error) {
				console.log(error);
				toast.error(error);
			}
		}

		modelTag = '';
		models.set(await getModels());
	};

	const deleteModelHandler = async () => {
		const res = await fetch(`${API_BASE_URL}/api/delete`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				name: deleteModelTag
			})
		});

		if (res.ok) {
			toast.success(`Deleted ${deleteModelTag}`);
			deleteModelTag = '';
			models.set(await getModels());
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to delete model');
		}
	};

	const getModels = async (url = '', type = 'all') => {
		let models = [];
		const apiUrl = url || $settings?.API_BASE_URL || OLLAMA_API_BASE_URL;

		try {
			console.log(`Fetching models from: ${apiUrl}/api/tags`);

			const res = await fetch(`${apiUrl}/api/tags`, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}

			const data = await res.json();
			console.log('Received data:', data);

			if (data && Array.isArray(data.models)) {
				models = data.models.map((model) => ({
					...model,
					size: model.size,
					modified_at: new Date(model.modified_at),
					details: model.details || {}
				}));
				console.log('Processed models:', models);
			} else {
				console.warn('Unexpected data structure:', data);
				toast.warning('Received unexpected data structure from server');
			}
		} catch (error) {
			console.error('Failed to fetch models:', error);
			if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
				toast.error('Failed to connect to Ollama. Is the server running?');
			} else {
				toast.error(`Error fetching models: ${error.message}`);
			}
		}

		if (type !== 'all') {
			models = models.filter((model) => model.type === type);
		}

		return models;
	};

	const copyModel = async (source, destination) => {
		const res = await fetch(`${API_BASE_URL}/api/copy`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ source, destination })
		});

		if (res.ok) {
			toast.success(`Copied ${source} to ${destination}`);
			models.set(await getModels());
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to copy model');
		}
	};

	const getRunningModels = async () => {
		const res = await fetch(`${API_BASE_URL}/api/ps`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			}
		});

		if (res.ok) {
			const data = await res.json();
			runningModels = data.models;
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to get running models');
		}
	};

	const copyModelHandler = async () => {
		if (sourceModel && destinationModel) {
			await copyModel(sourceModel, destinationModel);
			sourceModel = '';
			destinationModel = '';
		} else {
			toast.error('Please provide both source and destination model names');
		}
	};

	const fetchOllamaVersion = async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/api/version`);
			if (response.ok) {
				const data = await response.json();
				info.update((i) => ({ ...i, ollama: { ...i.ollama, version: data.version } }));
			} else {
				console.error('Failed to fetch Ollama version');
			}
		} catch (error) {
			console.error('Error fetching Ollama version:', error);
		}
	};

	onMount(() => {
		let settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
		console.log(settings);

		theme = localStorage.theme ?? 'dark';
		notificationEnabled = settings.notificationEnabled ?? false;

		API_BASE_URL = settings.API_BASE_URL ?? OLLAMA_API_BASE_URL;

		requestFormat = settings.requestFormat ?? '';
		format = settings.format ?? '';

		options.seed = settings.seed ?? 0;
		options.temperature = settings.temperature ?? '';
		options.repeat_penalty = settings.repeat_penalty ?? '';
		options.top_k = settings.top_k ?? '';
		options.top_p = settings.top_p ?? '';
		options.num_ctx = settings.num_ctx ?? '';
		options = { ...options, ...settings.options };
		fetchOllamaVersion();
		getRunningModels();
	});
</script>

<Modal bind:show>
	<div>
		<div class="flex justify-between dark:text-gray-300 px-5 py-4">
			<div class="text-lg font-medium self-center">Settings</div>
			<button
				class="self-center"
				on:click={() => {
					show = false;
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="w-5 h-5"
				>
					<path
						d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
					/>
				</svg>
			</button>
		</div>
		<hr class="dark:border-gray-800" />

		<div class="flex flex-col md:flex-row w-full p-4 md:space-x-4">
			<div
				class="tabs flex flex-row overflow-x-auto space-x-1 md:space-x-0 md:space-y-1 md:flex-col flex-1 md:flex-none md:w-40 dark:text-gray-200 text-xs text-left mb-3 md:mb-0"
			>
				<button
					class="px-2.5 py-2.5 min-w-fit rounded-lg flex-1 md:flex-none flex text-right transition {selectedTab ===
					'general'
						? 'bg-gray-200 dark:bg-gray-700'
						: ' hover:bg-gray-300 dark:hover:bg-gray-800'}"
					on:click={() => {
						selectedTab = 'general';
					}}
				>
					<div class="self-center mr-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-4 h-4"
						>
							<path
								fill-rule="evenodd"
								d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 01.804.98v1.361a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.294 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.294A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.294-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="self-center">General</div>
				</button>

				<button
					class="px-2.5 py-2.5 min-w-fit rounded-lg flex-1 md:flex-none flex text-right transition {selectedTab ===
					'advanced'
						? 'bg-gray-200 dark:bg-gray-700'
						: ' hover:bg-gray-300 dark:hover:bg-gray-800'}"
					on:click={() => {
						selectedTab = 'advanced';
					}}
				>
					<div class="self-center mr-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-4 h-4"
						>
							<path
								d="M17 2.75a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5zM17 15.75a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5zM3.75 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM4.5 2.75a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5zM10 11a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5A.75.75 0 0110 11zM10.75 2.75a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5zM10 6a2 2 0 100 4 2 2 0 000-4zM3.75 10a2 2 0 100 4 2 2 0 000-4zM16.25 10a2 2 0 100 4 2 2 0 000-4z"
							/>
						</svg>
					</div>
					<div class="self-center">Advanced</div>
				</button>

				<button
					class="px-2.5 py-2.5 min-w-fit rounded-lg flex-1 md:flex-none flex text-right transition {selectedTab ===
					'models'
						? 'bg-gray-200 dark:bg-gray-700'
						: ' hover:bg-gray-300 dark:hover:bg-gray-800'}"
					on:click={() => {
						selectedTab = 'models';
					}}
				>
					<div class="self-center mr-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-4 h-4"
						>
							<path
								fill-rule="evenodd"
								d="M10 1c3.866 0 7 1.79 7 4s-3.134 4-7 4-7-1.79-7-4 3.134-4 7-4zm5.694 8.13c.464-.264.91-.583 1.306-.952V10c0 2.21-3.134 4-7 4s-7-1.79-7-4V8.178c.396.37.842.688 1.306.953C5.838 10.006 7.854 10.5 10 10.5s4.162-.494 5.694-1.37zM3 13.179V15c0 2.21 3.134 4 7 4s7-1.79 7-4v-1.822c-.396.37-.842.688-1.306.953-1.532.875-3.548 1.369-5.694 1.369s-4.162-.494-5.694-1.37A7.009 7.009 0 013 13.179z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="self-center">Models</div>
				</button>

				<button
					class="px-2.5 py-2.5 min-w-fit rounded-lg flex-1 md:flex-none flex text-right transition {selectedTab ===
					'about'
						? 'bg-gray-200 dark:bg-gray-700'
						: ' hover:bg-gray-300 dark:hover:bg-gray-800'}"
					on:click={() => {
						selectedTab = 'about';
					}}
				>
					<div class="self-center mr-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-4 h-4"
						>
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="self-center">About</div>
				</button>
			</div>
			<div class="flex-1 md:min-h-[340px]">
				{#if selectedTab === 'general'}
					<div class="flex flex-col space-y-3">
						<div>
							<div class="mb-1 text-sm font-medium">Settings</div>

							<div class="py-0.5 flex w-full justify-between">
								<div class="self-center text-xs font-medium">Theme</div>

								<button
									class="p-1 px-3 text-xs flex rounded transition"
									on:click={() => {
										toggleTheme();
									}}
								>
									{#if theme === 'dark'}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-4 h-4"
										>
											<path
												fill-rule="evenodd"
												d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z"
												clip-rule="evenodd"
											/>
										</svg>

										<span class="ml-2 self-center"> Dark </span>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-4 h-4 self-center"
										>
											<path
												d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z"
											/>
										</svg>
										<span class="ml-2 self-center"> Light </span>
									{/if}
								</button>
							</div>
						</div>

						<hr class="dark:border-gray-700" />
						<div>
							<div class="mb-2.5 text-sm font-medium">Ollama Server URL</div>
							<div class="flex w-full">
								<div class="flex-1 mr-2">
									<input
										class="w-full rounded py-2 px-4 text-sm dark:text-gray-300 dark:bg-gray-800 outline-none"
										placeholder="Enter URL (e.g. http://localhost:11434)"
										bind:value={API_BASE_URL}
									/>
								</div>
								<button
									class="px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 rounded transition"
									on:click={() => {
										checkOllamaConnection();
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										class="w-4 h-4"
									>
										<path
											fill-rule="evenodd"
											d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							</div>

							<div class="mt-2 text-xs text-gray-400 dark:text-gray-500">
								Trouble accessing Ollama? <a
									class="text-gray-500 dark:text-gray-300 font-medium"
									href="https://github.com/ollama-webui/ollama-webui#troubleshooting"
									target="_blank"
								>
									Click here for help.
								</a>
							</div>
						</div>

						<hr class="dark:border-gray-700" />

						<div class="flex justify-end pt-3 text-sm font-medium">
							<button
								class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-100 transition rounded"
								on:click={() => {
									saveSettings({
										API_BASE_URL: API_BASE_URL === '' ? OLLAMA_API_BASE_URL : API_BASE_URL
									});
									show = false;
								}}
							>
								Save
							</button>
						</div>
					</div>
				{:else if selectedTab === 'advanced'}
					<div class="flex flex-col h-full justify-between text-sm">
						<div class="space-y-3 pr-1.5 overflow-y-scroll max-h-72">
							<div class="text-sm font-medium">Parameters</div>

							<Advanced bind:options />
							<hr class="dark:border-gray-700" />

							<div>
								<div class="py-1 flex w-full justify-between">
									<div class="self-center text-sm font-medium">Request Mode</div>

									<button
										class="p-1 px-3 text-xs flex rounded transition"
										on:click={() => {
											toggleRequestFormat();
										}}
									>
										{#if requestFormat === ''}
											<span class="ml-2 self-center"> Default </span>
										{:else if requestFormat === 'json'}
											<span class="ml-2 self-center"> JSON </span>
										{/if}
									</button>
								</div>
							</div>

							<div>
								<div class="py-1 flex w-full justify-between">
									<div class="self-center text-sm font-medium">Response Format</div>
									<select bind:value={format} class="p-1 px-3 text-xs rounded transition">
										<option value="">Default</option>
										<option value="json">JSON</option>
									</select>
								</div>
							</div>
						</div>

						<div class="flex justify-end pt-3 text-sm font-medium">
							<button
								class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-100 transition rounded"
								on:click={() => {
									saveSettings({
										options: {
											seed: (options.seed !== 0 ? options.seed : undefined) ?? undefined,
											stop: options.stop !== '' ? options.stop : undefined,
											temperature: options.temperature !== '' ? options.temperature : undefined,
											repeat_penalty:
												options.repeat_penalty !== '' ? options.repeat_penalty : undefined,
											repeat_last_n:
												options.repeat_last_n !== '' ? options.repeat_last_n : undefined,
											mirostat: options.mirostat !== '' ? options.mirostat : undefined,
											mirostat_eta: options.mirostat_eta !== '' ? options.mirostat_eta : undefined,
											mirostat_tau: options.mirostat_tau !== '' ? options.mirostat_tau : undefined,
											top_k: options.top_k !== '' ? options.top_k : undefined,
											top_p: options.top_p !== '' ? options.top_p : undefined,
											tfs_z: options.tfs_z !== '' ? options.tfs_z : undefined,
											num_ctx: options.num_ctx !== '' ? options.num_ctx : undefined
										}
									});
									show = false;
								}}
							>
								Save
							</button>
						</div>
					</div>
				{:else if selectedTab === 'models'}
					<div class="flex flex-col space-y-3 text-sm mb-10">
						<div>
							<div class="mb-2.5 text-sm font-medium">Pull a model</div>
							<div class="flex w-full">
								<div class="flex-1 mr-2">
									<input
										class="w-full rounded py-2 px-4 text-sm dark:text-gray-300 dark:bg-gray-800 outline-none"
										placeholder="Enter model tag (e.g. mistral:7b)"
										bind:value={modelTag}
									/>
								</div>
								<button
									class="px-3 text-gray-100 bg-emerald-600 hover:bg-emerald-700 rounded transition"
									on:click={() => {
										pullModelHandler();
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										class="w-4 h-4"
									>
										<path
											d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
										/>
										<path
											d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
										/>
									</svg>
								</button>
							</div>
							<div class="mt-2 text-xs text-gray-400 dark:text-gray-500">
								To access the available model names for downloading, <a
									class="text-gray-500 dark:text-gray-300 font-medium"
									href="https://ollama.ai/library"
									target="_blank">click here.</a
								>
							</div>

							{#if pullProgress !== null}
								<div class="mt-2">
									<div class="mb-2 text-xs">Pull Progress</div>
									<div class="w-full rounded-full dark:bg-gray-800">
										<div
											class="dark:bg-gray-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
											style="width: {Math.max(15, pullProgress ?? 0)}%"
										>
											{pullProgress ?? 0}%
										</div>
									</div>
									<div class="mt-1 text-xs dark:text-gray-500" style="font-size: 0.5rem;">
										{digest}
									</div>
								</div>
							{/if}
						</div>
						<hr class="dark:border-gray-700" />

						<div>
							<div class="mb-2.5 text-sm font-medium">Delete a model</div>
							<div class="flex w-full">
								<div class="flex-1 mr-2">
									<select
										class="w-full rounded py-2 px-4 text-sm dark:text-gray-300 dark:bg-gray-800 outline-none"
										bind:value={deleteModelTag}
										placeholder="Select a model"
									>
										{#if !deleteModelTag}
											<option value="" disabled selected>Select a model</option>
										{/if}
										{#each $models.filter((m) => m.size != null) as model}
											<option value={model.name} class="bg-gray-100 dark:bg-gray-700"
												>{model.name + ' (' + (model.size / 1024 ** 3).toFixed(1) + ' GB)'}</option
											>
										{/each}
									</select>
								</div>
								<button
									class="px-3 bg-red-700 hover:bg-red-800 text-gray-100 rounded transition"
									on:click={() => {
										deleteModelHandler();
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										class="w-4 h-4"
									>
										<path
											fill-rule="evenodd"
											d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							</div>
						</div>

						<hr class="dark:border-gray-700" />

						<div>
							<div class="mb-2.5 text-sm font-medium">Copy a model</div>
							<div class="flex w-full mb-2">
								<div class="flex-1 mr-2">
									<input
										class="w-full rounded py-2 px-4 text-sm dark:text-gray-300 dark:bg-gray-800 outline-none"
										placeholder="Source model name"
										bind:value={sourceModel}
									/>
								</div>
							</div>
							<div class="flex w-full">
								<div class="flex-1 mr-2">
									<input
										class="w-full rounded py-2 px-4 text-sm dark:text-gray-300 dark:bg-gray-800 outline-none"
										placeholder="Destination model name"
										bind:value={destinationModel}
									/>
								</div>
								<button
									class="px-3 bg-blue-600 hover:bg-blue-700 text-gray-100 rounded transition"
									on:click={copyModelHandler}
								>
									Copy
								</button>
							</div>
						</div>

						<hr class="dark:border-gray-700" />

						<div>
							<div class="mb-2.5 text-sm font-medium">Running Models</div>
							<button
								class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-gray-100 rounded transition"
								on:click={getRunningModels}
							>
								Refresh Running Models
							</button>
							<div class="mt-2">
								{#if runningModels.length > 0}
									<ul class="list-disc list-inside">
										{#each runningModels as model}
											<li>{model.name} (Expires: {new Date(model.expires_at).toLocaleString()})</li>
										{/each}
									</ul>
								{:else}
									<p>No models currently running.</p>
								{/if}
							</div>
						</div>
					</div>
				{:else if selectedTab === 'about'}
					<div class="flex flex-col h-full justify-between space-y-3 text-sm mb-6">
						<div class="space-y-3">
							<div>
								<div class="mb-2.5 text-sm font-medium">OllamaUI Version</div>
								<div class="flex w-full">
									<div class="flex-1 text-xs text-gray-700 dark:text-gray-200">
										{WEB_UI_VERSION}
									</div>
								</div>
							</div>
							<hr class="dark:border-gray-700" />
							<div>
								<div class="mb-2.5 text-sm font-medium">Ollama Version</div>
								<div class="flex w-full">
									<div class="flex-1 text-xs text-gray-700 dark:text-gray-200">
										{#if $info?.ollama?.version}
											{$info.ollama.version}
										{:else}
											Loading...
										{/if}
									</div>
								</div>
							</div>
							<hr class="dark:border-gray-700" />
							<div class="mt-2 text-xs text-gray-400 dark:text-gray-500">
								This is a minimalist fork maintained by
								<a
									class="text-gray-500 dark:text-gray-300 font-medium"
									href="https://kroonen.ai"
									target="_blank"
								>
									Robin Kroonen
								</a>
							</div>
							<div class="mt-2 text-xs text-gray-400 dark:text-gray-500">
								For the full experience, try
								<a
									class="text-gray-500 dark:text-gray-300 font-medium"
									href="https://openwebui.com"
									target="_blank"
								>
									OpenWebUI
								</a>
							</div>
							<div>
								<a href="https://github.com/OllamaUI/OllamaUI" target="_blank">
									<img
										alt="Github Repo"
										src="https://img.shields.io/github/stars/OllamaUI/OllamaUI?style=social&label=Star us on Github"
									/>
								</a>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</Modal>

<style>
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.tabs {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
