<script lang="ts">
	import { models, settings } from '$lib/stores';
	import toast from 'svelte-french-toast';

	export let submitPrompt: (content: string, imageBase64: string | null) => Promise<void>;
	export let stopResponse: () => void;
	export let autoScroll = true;
	export let prompt = '';
	export let messages: Message[] = [];
	export let selectedModels: string[] = [];

	let imageFile: File | null = null;
	let imagePreview: string | null = null;
	let dragOver = false;

	const VISION_MODELS = ['llama3.2-vision', 'llava', 'bakllava'];

	const isVisionModel = (model: string): boolean => {
		if (!model) return false;
		const modelLower = model.toLowerCase().trim();
		// Log for debugging
		console.log('Checking model:', modelLower);
		// Check both with and without tag
		const baseModel = modelLower.split(':')[0];
		const isVision = VISION_MODELS.some((vm) => baseModel === vm || modelLower.startsWith(vm));
		console.log('Is vision model:', isVision, 'Base model:', baseModel);
		return isVision;
	};

	const getVRAMWarning = (models: string[]): string | null => {
		for (const model of models) {
			if (model.includes('llama3.2-vision:90b')) return '⚠️ Requires 64GB+ VRAM';
			if (model.includes('llama3.2-vision') || model.includes('llava'))
				return '⚠️ Requires 8GB+ VRAM';
		}
		return null;
	};
	$: {
		if (selectedModels.length > 0) {
			console.log('Selected models:', selectedModels);
			console.log(
				'Vision models check:',
				selectedModels.map((m) => ({
					model: m,
					baseModel: m.split(':')[0],
					isVision: isVisionModel(m)
				}))
			);
		}
	}

	$: hasVisionModel = selectedModels.some(isVisionModel);
	$: vramWarning = getVRAMWarning(selectedModels); // Add this line

	async function convertImageToBase64(file: File): Promise<string | null> {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = () => {
				try {
					const base64String = reader.result?.toString().split(',')[1] || null;
					resolve(base64String);
				} catch (error) {
					console.error('Error converting image:', error);
					resolve(null);
				}
			};
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(file);
		});
	}

	async function handleImageUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			if (!hasVisionModel) {
				console.log('Selected models:', selectedModels);
				console.log(
					'Vision check:',
					selectedModels.map((m) => ({
						model: m,
						isVision: isVisionModel(m)
					}))
				);
				toast.error('Please select a vision-capable model first');
				return;
			}
			const file = target.files[0];
			if (file.size > 10 * 1024 * 1024) {
				toast.error('Image size must be under 10MB');
				return;
			}
			try {
				imageFile = file;
				imagePreview = URL.createObjectURL(file);
			} catch (error) {
				console.error('Error handling image:', error);
				toast.error('Error processing image');
				removeImage();
			}
		}
	}

	function removeImage() {
		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
		}
		imageFile = null;
		imagePreview = null;
	}

	async function handleSubmit() {
		if (!prompt && !imageFile) return;

		let imageBase64: string | null = null;
		if (imageFile) {
			if (!hasVisionModel) {
				console.log('Current models:', selectedModels);
				toast.error('Please select a vision-capable model first');
				return;
			}
			try {
				imageBase64 = await convertImageToBase64(imageFile);
				if (!imageBase64) {
					toast.error('Error processing image');
					return;
				}
				console.log('Image converted successfully');
			} catch (error) {
				console.error('Error processing image:', error);
				toast.error('Error processing image');
				return;
			}
		}

		const message = imageFile ? 'Analyze this image' : prompt;
		await submitPrompt(message, imageBase64);
		prompt = '';
		removeImage();
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;

		const file = e.dataTransfer?.files[0];
		if (!file) return;

		if (!hasVisionModel) {
			console.log('Current models:', selectedModels);
			toast.error('Please select a vision-capable model first');
			return;
		}

		if (!file.type.startsWith('image/')) {
			toast.error('Only image files are supported');
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			toast.error('Image size must be under 10MB');
			return;
		}

		try {
			imageFile = file;
			imagePreview = URL.createObjectURL(file);
		} catch (error) {
			console.error('Error handling image:', error);
			toast.error('Error processing image');
			removeImage();
		}
	}
</script>

<div class="fixed bottom-0 w-full">
	<div class="px-2.5 pt-2.5 -mb-0.5 mx-auto inset-x-0 bg-transparent flex justify-center">
		{#if autoScroll === false && messages.length > 0}
			<div class=" flex justify-center mb-4">
				<button
					class=" bg-white border border-gray-100 dark:border-none dark:bg-white/20 p-1.5 rounded-full"
					on:click={() => {
						autoScroll = true;
						window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="w-5 h-5"
					>
						<path
							fill-rule="evenodd"
							d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
		{/if}
	</div>
	<div class="bg-white dark:bg-gray-800">
		<div class="max-w-3xl px-2.5 -mb-0.5 mx-auto inset-x-0">
			<div class="bg-gradient-to-t from-white dark:from-gray-800 from-40% pb-2">
				{#if imagePreview}
					<div class="relative mb-2">
						<img src={imagePreview} alt="Preview" class="max-h-48 rounded-lg mx-auto" />
						<button
							class="absolute top-1 right-1 p-1 bg-gray-800/50 rounded-full text-white hover:bg-gray-700/50"
							on:click={removeImage}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</div>
					{#if vramWarning}
						<div class="text-xs text-amber-500 dark:text-amber-400 text-center mb-2">
							{vramWarning}
						</div>
					{/if}
				{/if}

				<form
					class="flex flex-col relative w-full rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100"
					on:submit|preventDefault={handleSubmit}
					on:dragover={handleDragOver}
					on:dragleave={handleDragLeave}
					on:drop={handleDrop}
					class:dragover={dragOver}
				>
					<div class="flex">
						<div class="flex items-center pl-3">
							<label class="cursor-pointer">
								<input type="file" accept="image/*" class="hidden" on:change={handleImageUpload} />
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 {hasVisionModel
										? 'text-gray-500 hover:text-gray-700'
										: 'text-gray-300'}"
									viewBox="0 0 20 20"
									fill="currentColor"
									title={hasVisionModel ? 'Upload image' : 'Select a vision model to upload images'}
								>
									<path
										fill-rule="evenodd"
										d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
										clip-rule="evenodd"
									/>
								</svg>
							</label>
						</div>

						<textarea
							id="chat-textarea"
							class="dark:bg-gray-800 dark:text-gray-100 outline-none w-full py-3 px-2 pl-2 rounded-xl resize-none"
							placeholder={imageFile
								? 'Ask about the image or press Enter to analyze it'
								: 'Send a message'}
							bind:value={prompt}
							on:keypress={(e) => {
								if (e.keyCode == 13 && !e.shiftKey) {
									e.preventDefault();
								}
								if ((prompt !== '' || imageFile) && e.keyCode == 13 && !e.shiftKey) {
									handleSubmit();
								}
							}}
							rows="1"
							on:input={(e) => {
								e.target.style.height = '';
								e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
							}}
						/>

						<div class="self-end mb-2 flex space-x-0.5 mr-2">
							{#if messages.length == 0 || messages.at(-1).done == true}
								<button
									class="{prompt !== '' || imageFile
										? 'bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100'
										: 'text-white bg-gray-100 dark:text-gray-800 dark:bg-gray-600 disabled'} transition rounded-lg p-1 mr-0.5 w-7 h-7 self-center"
									type="submit"
									disabled={prompt === '' && !imageFile}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										class="w-5 h-5"
									>
										<path
											fill-rule="evenodd"
											d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							{:else}
								<button
									class="bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800 transition rounded-lg p-1.5"
									on:click={stopResponse}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="w-5 h-5"
									>
										<path
											fill-rule="evenodd"
											d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 01-1.313-1.313V9.564z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							{/if}
						</div>
					</div>
				</form>

				<div class="mt-1.5 text-xs text-gray-500 text-center">
					{#if hasVisionModel}
						Drag & drop images or use the upload button. Max size: 10MB.
					{:else}
						LLMs can make mistakes. Verify important information.
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dragover {
		@apply ring-2 ring-blue-500;
	}
</style>
