import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
	console.log('Upload request headers:', Object.fromEntries(request.headers));

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch (err) {
		console.error('Error parsing form data:', err);
		return json({ error: 'Failed to parse form data' }, { status: 400 });
	}

	const file = formData.get('file');

	if (!file || !(file instanceof File)) {
		return json({ error: 'No file uploaded or invalid file' }, { status: 400 });
	}

	try {
		const buffer = new Uint8Array(await file.arrayBuffer());
		const fileName = `${uuidv4()}.png`;
		const filePath = join(process.cwd(), 'static', 'uploads', fileName);

		await writeFile(filePath, buffer);

		return json({ url: `/uploads/${fileName}` }, { status: 200 });
	} catch (error) {
		console.error('Error saving file:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
