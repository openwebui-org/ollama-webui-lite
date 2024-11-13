// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	interface Message {
		role: 'user' | 'assistant';
		content: string;
		images?: string[];
		files?: { type: string; url: string }[];
		id?: string;
		edit?: boolean;
		error?: boolean;
		done?: boolean;
		info?: any;
		model?: string;
		parentId?: string | null;
		childrenIds?: string[];
		originalContent?: string;
		editedContent?: string;
	}

	interface ChatHistory {
		messages: Record<string, Message>;
		currentId: string | null;
		title?: string;
	}

	interface ModelInfo {
		name: string;
		modified_at: string;
		size: number;
		digest: string;
		details: {
			format: string;
			family: string;
			families: string[] | null;
			parameter_size: string;
			quantization_level: string;
		};
	}
}

export {};
