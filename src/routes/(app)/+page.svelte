<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import toast from 'svelte-french-toast';

	import { OLLAMA_API_BASE_URL } from '$lib/constants';
	import { onMount, tick } from 'svelte';
	import { splitStream } from '$lib/utils';
	import { settings, db, chats, chatId } from '$lib/stores';
	import { page } from '$app/stores';

	import MessageInput from '$lib/components/chat/MessageInput.svelte';
	import Messages from '$lib/components/chat/Messages.svelte';
	import ModelSelector from '$lib/components/chat/ModelSelector.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';

	let stopResponseFlag = false;
	let autoScroll = true;

	let selectedModels = [''];

	let title = '';
	let prompt = '';
	let messages = [];
	let history = {
		messages: {},
		currentId: null
	};

	$: if (history.currentId !== null) {
		let _messages = [];
		let currentMessage = history.messages[history.currentId];
		while (currentMessage !== null) {
			_messages.unshift({ ...currentMessage });
			currentMessage =
				currentMessage.parentId !== null ? history.messages[currentMessage.parentId] : null;
		}
		messages = _messages;
	} else {
		messages = [];
	}

	onMount(async () => {
		await chatId.set(uuidv4());

		chatId.subscribe(async () => {
			await initNewChat();
		});
	});

	const initNewChat = async () => {
		console.log($chatId);

		autoScroll = true;
		title = '';
		messages = [];
		history = {
			messages: {},
			currentId: null
		};

		selectedModels = $page.url.searchParams.get('models')
			? $page.url.searchParams.get('models')?.split(',')
			: $settings.models ?? [''];

		let _settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
		console.log(_settings);
		settings.set({
			..._settings
		});
	};

	const copyToClipboard = (text) => {
		if (!navigator.clipboard) {
			const textArea = document.createElement('textarea');
			textArea.value = text;

			textArea.style.top = '0';
			textArea.style.left = '0';
			textArea.style.position = 'fixed';

			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			try {
				document.execCommand('copy');
				console.log('Fallback: Copying text command was successful');
			} catch (err) {
				console.error('Fallback: Oops, unable to copy', err);
			}

			document.body.removeChild(textArea);
			return;
		}
		navigator.clipboard.writeText(text).then(
			() => {
				console.log('Async: Copying to clipboard was successful!');
			},
			(err) => {
				console.error('Async: Could not copy text: ', err);
			}
		);
	};

	const checkAndPullModel = async (model) => {
		try {
			const response = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/api/show`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: model })
			});

			if (!response.ok) {
				toast.info(`Model ${model} not found. Attempting to pull...`);
				const pullResponse = await fetch(
					`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/api/pull`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ name: model })
					}
				);

				if (!pullResponse.ok) {
					throw await pullResponse.json();
				}

				toast.success(`Model ${model} has been pulled successfully.`);
			}
		} catch (error) {
			console.error('Error checking/pulling model:', error);
			toast.error(`Failed to check/pull model ${model}: ${error.error || 'Unknown error'}`);
			throw error;
		}
	};

	const sendPrompt = async (userPrompt, parentId, _chatId) => {
		await Promise.all(
			selectedModels.map(async (model) => {
				await sendPromptOllama(model, userPrompt, parentId, _chatId);
			})
		);

		await chats.set(await $db.getChats());
	};

	const sendPromptOllama = async (model, userPrompt, parentId, _chatId) => {
		console.log('sendPromptOllama');
		let responseMessageId = uuidv4();
		let responseMessage = {
			parentId: parentId,
			id: responseMessageId,
			childrenIds: [],
			role: 'assistant',
			content: '',
			model: model
		};

		history.messages[responseMessageId] = responseMessage;
		history.currentId = responseMessageId;
		if (parentId !== null) {
			history.messages[parentId].childrenIds = [
				...history.messages[parentId].childrenIds,
				responseMessageId
			];
		}

		await tick();
		window.scrollTo({ top: document.body.scrollHeight });

		try {
			// Construct the message payload, including images if present
			const messagePayload = [
				$settings.system ? { role: 'system', content: $settings.system } : undefined,
				...messages
			]
				.filter((m): m is Message => !!m)
				.map((message) => {
					const payload: any = {
						role: message.role,
						content: message.content
					};
					// If images exist in the message, attach them here
					if (message.images && message.images.length > 0) {
						payload.images = message.images;
					}
					return payload;
				});

			document.getElementById('chat-textarea')?.setAttribute('style', '');

			const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: model,
					prompt: userPrompt,
					messages: messagePayload,
					options: {
						seed: $settings.seed ?? undefined,
						temperature: $settings.temperature ?? undefined,
						repeat_penalty: $settings.repeat_penalty ?? undefined,
						top_k: $settings.top_k ?? undefined,
						top_p: $settings.top_p ?? undefined,
						num_ctx: $settings.num_ctx ?? undefined,
						...($settings.options ?? {})
					},
					stream: true
				})
			});

			if (!res.ok) {
				throw await res.json();
			}

			const reader = res.body
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(splitStream('\n'))
				.getReader();

			while (true) {
				const { value, done } = await reader.read();
				if (done || stopResponseFlag || _chatId !== $chatId) {
					responseMessage.done = true;
					messages = messages;
					break;
				}

				const lines = value.split('\n');

				for (const line of lines) {
					if (line !== '') {
						try {
							let data = JSON.parse(line);

							if ('error' in data) {
								throw new Error(data.error);
							}

							if (!data.done) {
								responseMessage.content += data.response;
								messages = messages;
							} else {
								responseMessage.done = true;
								responseMessage.context = data.context ?? null;
								responseMessage.info = {
									total_duration: data.total_duration,
									load_duration: data.load_duration,
									sample_count: data.sample_count,
									sample_duration: data.sample_duration,
									prompt_eval_count: data.prompt_eval_count,
									prompt_eval_duration: data.prompt_eval_duration,
									eval_count: data.eval_count,
									eval_duration: data.eval_duration
								};
								messages = messages;

								if ($settings.responseAutoCopy) {
									copyToClipboard(responseMessage.content);
								}
							}
						} catch (error) {
							console.error(error);
							toast.error(error.message);
							break;
						}
					}
				}

				if (autoScroll) {
					window.scrollTo({ top: document.body.scrollHeight });
				}

				await $db.updateChatById(_chatId, {
					title: title === '' ? 'New Chat' : title,
					models: selectedModels,
					options: {
						seed: $settings.seed ?? undefined,
						temperature: $settings.temperature ?? undefined,
						repeat_penalty: $settings.repeat_penalty ?? undefined,
						top_k: $settings.top_k ?? undefined,
						top_p: $settings.top_p ?? undefined,
						num_ctx: $settings.num_ctx ?? undefined,
						...($settings.options ?? {})
					},
					messages: messages,
					history: history
				});
			}
		} catch (error) {
			console.error('API Error:', error);
			responseMessage.error = true;
			responseMessage.content = `Error: ${error.message || 'Unknown error occurred'}`;
			responseMessage.done = true;
			messages = messages;
			toast.error(`Error: ${error.message || 'Unknown error occurred'}`);
		}

		stopResponseFlag = false;
		await tick();
		if (autoScroll) {
			window.scrollTo({ top: document.body.scrollHeight });
		}

		if (messages.length == 2 && messages.at(1).content !== '') {
			await generateChatTitle(_chatId, userPrompt);
		}
	};

	const submitPrompt = async (userPrompt: string, imageBase64: string | null = null) => {
		const _chatId = JSON.parse(JSON.stringify($chatId));
		console.log('submitPrompt', { userPrompt, hasImage: !!imageBase64, _chatId });

		if (selectedModels.includes('')) {
			toast.error('Model not selected');
			return;
		}

		if (messages.length != 0 && messages.at(-1)?.done != true) {
			console.log('wait for previous message to complete');
			return;
		}

		let userMessageId = uuidv4();
		let userMessage: any = {
			id: userMessageId,
			parentId: messages.length !== 0 ? messages.at(-1)?.id : null,
			childrenIds: [],
			role: 'user',
			content: userPrompt
		};

		// If we have base64 image data
		if (imageBase64) {
			const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
			userMessage.images = [rawBase64];
		}

		if (messages.length !== 0 && messages.at(-1)?.id) {
			history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
		}

		history.messages[userMessageId] = userMessage;
		history.currentId = userMessageId;

		await tick();

		// Initialize the chat if this is the first message
		if (messages.length <= 1) {
			await $db.createNewChat({
				id: _chatId,
				title: 'New Chat',
				models: selectedModels,
				options: {
					seed: $settings.seed ?? undefined,
					temperature: $settings.temperature ?? undefined,
					repeat_penalty: $settings.repeat_penalty ?? undefined,
					top_k: $settings.top_k ?? undefined,
					top_p: $settings.top_p ?? undefined,
					num_ctx: $settings.num_ctx ?? undefined,
					...($settings.options ?? {})
				},
				messages: messages,
				history: history
			});
		}

		prompt = '';

		setTimeout(() => {
			window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
		}, 50);

		await sendPrompt(userPrompt, userMessageId, _chatId);
	};

	const stopResponse = () => {
		stopResponseFlag = true;
		console.log('stopResponse');
	};

	const regenerateResponse = async () => {
		const _chatId = JSON.parse(JSON.stringify($chatId));
		console.log('regenerateResponse', _chatId);

		if (messages.length != 0 && messages.at(-1).done == true) {
			messages.splice(messages.length - 1, 1);
			messages = messages;

			let userMessage = messages.at(-1);
			let userPrompt = userMessage.content;

			await sendPrompt(userPrompt, userMessage.id, _chatId);
		}
	};

	const generateChatTitle = async (_chatId, userPrompt) => {
		if ($settings.titleAutoGenerate ?? true) {
			console.log('generateChatTitle');

			try {
				const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/api/generate`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model: selectedModels[0],
						prompt: `Generate a brief 3-5 word title for this question, excluding the term 'title.' Then, please reply with only the title: ${userPrompt}`,
						stream: false
					})
				});

				if (!res.ok) {
					throw await res.json();
				}

				const data = await res.json();
				await setChatTitle(_chatId, data.response === '' ? 'New Chat' : data.response);
			} catch (error) {
				console.error('Error generating chat title:', error);
				toast.error(`Failed to generate chat title: ${error.error || 'Unknown error'}`);
				await setChatTitle(_chatId, 'New Chat');
			}
		} else {
			await setChatTitle(_chatId, `${userPrompt}`);
		}
	};

	const setChatTitle = async (_chatId, _title) => {
		await $db.updateChatById(_chatId, { title: _title });
		if (_chatId === $chatId) {
			title = _title;
		}
	};
</script>

<svelte:window
	on:scroll={() => {
		autoScroll = window.innerHeight + window.scrollY >= document.body.offsetHeight - 40;
	}}
/>

<Navbar {title} />
<div class="min-h-screen w-full flex justify-center">
	<div class="py-2.5 flex flex-col justify-between w-full">
		<div class="max-w-2xl mx-auto w-full px-3 md:px-0 mt-10">
			<ModelSelector bind:selectedModels disabled={messages.length > 0} />
		</div>

		<div class="h-full mt-10 mb-32 w-full flex flex-col">
			<Messages
				{selectedModels}
				bind:history
				bind:messages
				bind:autoScroll
				{sendPrompt}
				{regenerateResponse}
			/>
		</div>
	</div>

	<MessageInput
		bind:prompt
		bind:autoScroll
		{messages}
		{submitPrompt}
		{stopResponse}
		{selectedModels}
	/>
</div>
