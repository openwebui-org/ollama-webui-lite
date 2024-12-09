<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import toast from 'svelte-french-toast';

	import { OLLAMA_API_BASE_URL } from '$lib/constants';
	import { tick } from 'svelte';
	import { convertMessagesToHistory, splitStream } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { models, settings, db, chats, chatId } from '$lib/stores';

	import MessageInput from '$lib/components/chat/MessageInput.svelte';
	import Messages from '$lib/components/chat/Messages.svelte';
	import ModelSelector from '$lib/components/chat/ModelSelector.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import { page } from '$app/stores';

	let loaded = false;
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

	$: if ($page.params.id) {
		(async () => {
			let chat = await loadChat();
			await tick();
			if (chat) {
				loaded = true;
			} else {
				await goto('/');
			}
		})();
	}

	const loadChat = async () => {
		await chatId.set($page.params.id);
		const chat = await $db.getChatById($chatId);

		if (chat) {
			selectedModels = chat.models ?? [chat.model ?? ''];
			history =
				(chat?.history ?? undefined) !== undefined
					? chat.history
					: convertMessagesToHistory(chat.messages);
			title = chat.title;

			let _settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
			await settings.set({
				..._settings,
				system: chat.system ?? _settings.system,
				options: chat.options ?? _settings.options
			});
			autoScroll = true;

			await tick();
			if (messages.length > 0) {
				history.messages[messages.at(-1).id].done = true;
			}
			await tick();

			return chat;
		} else {
			return null;
		}
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
			() => console.log('Async: Copying to clipboard was successful!'),
			(err) => console.error('Async: Could not copy text: ', err)
		);
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
		console.log('sendPromptOllama', { model, userPrompt, parentId, _chatId });
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
			history.messages[parentId].childrenIds.push(responseMessageId);
		}

		await tick();
		window.scrollTo({ top: document.body.scrollHeight });

		try {
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
					if (message.images && message.images.length > 0) {
						payload.images = message.images; // base64 images
					}
					if (message.files && message.files.length > 0) {
						payload.files = message.files; // uploaded file URLs
					}
					return payload;
				});

			document.getElementById('chat-textarea')?.setAttribute('style', '');

			const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...($settings.authHeader && { Authorization: $settings.authHeader })
				},
				body: JSON.stringify({
					model: model,
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
				const error = await res.json();
				console.error('API Error:', error);
				responseMessage.error = true;
				responseMessage.content = error.detail || error.error || 'An error occurred';
				responseMessage.done = true;
				toast.error(responseMessage.content);
			} else {
				const reader = res.body
					.pipeThrough(new TextDecoderStream())
					.pipeThrough(splitStream('\n'))
					.getReader();

				while (true) {
					const { value, done } = await reader.read();
					if (done || stopResponseFlag) break;

					const lines = value.split('\n');
					for (const line of lines) {
						if (line.trim() !== '') {
							try {
								const data = JSON.parse(line);
								console.log('Received data:', data);
								if ('message' in data) {
									responseMessage.content += data.message.content;
									messages = messages;
								}
								if (data.done) {
									responseMessage.done = true;
									responseMessage.info = {
										total_duration: data.total_duration,
										load_duration: data.load_duration,
										prompt_eval_count: data.prompt_eval_count,
										eval_count: data.eval_count,
										eval_duration: data.eval_duration
									};
									messages = messages;
								}
							} catch (error) {
								console.error('Error parsing stream:', error);
							}
						}
					}
				}
			}
		} catch (error) {
			console.error('Error:', error);
			responseMessage.error = true;
			responseMessage.content = `Error: ${error.message}`;
			responseMessage.done = true;
			messages = messages;
			toast.error(`Error connecting to Ollama: ${error.message}`);
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

	const submitPrompt = async (
		userPrompt: string,
		imageBase64: string | null = null,
		uploadUrl: string | null = null
	) => {
		const _chatId = JSON.parse(JSON.stringify($chatId));
		console.log('submitPrompt', { userPrompt, hasImage: !!imageBase64, uploadUrl, _chatId });

		if (selectedModels.includes('')) {
			toast.error('Model not selected');
			return;
		}

		if (messages.length != 0 && messages.at(-1)?.done != true) {
			console.log('Wait for previous message to complete');
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

		if (imageBase64 && uploadUrl) {
			const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
			userMessage.images = [rawBase64];
			userMessage.files = [{ type: 'image', url: uploadUrl }];
		}

		if (messages.length !== 0 && messages.at(-1)?.id) {
			history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
		}

		history.messages[userMessageId] = userMessage;
		history.currentId = userMessageId;

		await tick();

		// If this is the first message in the chat
		if (messages.length <= 1) {
			await $db.createNewChat({
				id: _chatId,
				title: 'New Chat',
				models: selectedModels,
				system: $settings.system ?? undefined,
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
		} else {
			// If not the first message, update chat so model sees the image right away
			await $db.updateChatById(_chatId, {
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
	on:scroll={(e) => {
		autoScroll = window.innerHeight + window.scrollY >= document.body.offsetHeight - 40;
	}}
/>

{#if loaded}
	<Navbar {title} shareEnabled={messages.length > 0} />
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
{/if}
