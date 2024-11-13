export interface ModelDetails {
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

export interface Settings {
	API_BASE_URL?: string;
	authHeader?: string;
	system?: string;
	models?: string[];
	options?: Record<string, any>;
	seed?: number;
	temperature?: number;
	repeat_penalty?: number;
	top_k?: number;
	top_p?: number;
	num_ctx?: number;
	requestFormat?: string;
	titleAutoGenerate?: boolean;
	notificationEnabled?: boolean;
	responseAutoCopy?: boolean;
}
