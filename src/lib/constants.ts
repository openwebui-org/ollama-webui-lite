export const OLLAMA_API_BASE_URL = `http://localhost:11434`;
export const WEB_UI_VERSION = 'v0.1.1';
export const VISION_MODELS = ['llama3.2-vision', 'llava', 'bakllava'];

export const isVisionModel = (model: string): boolean => {
	if (!model) return false;
	const modelLower = model.toLowerCase().trim();
	const baseModel = modelLower.split(':')[0];
	return VISION_MODELS.some((vm) => baseModel === vm || modelLower.startsWith(vm));
};

export const getVRAMRequirement = (model: string): string | null => {
	if (model.includes('llama3.2-vision:90b')) return '64GB+ VRAM';
	if (model.includes('llama3.2-vision') || model.includes('llava')) return '8GB+ VRAM';
	return null;
};
