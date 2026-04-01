import pb from "./pb";

// Look up a food by barcode in the shared library
export async function getFoodByBarcode(barcode) {
	try {
		const record = await pb
			.collection("food_library")
			.getFirstListItem(`barcode = "${barcode}"`);
		return record;
	} catch {
		return null;
	}
}

// Save a new food to the shared library (skip if barcode already exists)
export async function saveFoodToLibrary(data) {
	try {
		return await pb.collection("food_library").create(data);
	} catch (e) {
		// Unique constraint violation = already exists, that's fine
		if (e?.status === 400) return null;
		throw e;
	}
}

// Search the food library by name or brand
export async function searchFoodLibrary(query) {
	try {
		const filter = query
			? `name ~ "${query}" || brand ~ "${query}"`
			: "";
		const res = await pb.collection("food_library").getList(1, 50, {
			filter,
			sort: "name",
		});
		return res.items;
	} catch {
		return [];
	}
}
export const lookupFoodLibrary = getFoodByBarcode;
export const saveFoodLibrary = saveFoodToLibrary;
