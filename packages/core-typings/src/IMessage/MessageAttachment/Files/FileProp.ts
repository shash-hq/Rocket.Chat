import * as z from 'zod';

export const FilePropSchema = z.object({
	_id: z.string(),
	name: z.string(),
	type: z.string(),
	format: z.string(),
	size: z.number(),
});

export type FileProp = z.infer<typeof FilePropSchema>;
