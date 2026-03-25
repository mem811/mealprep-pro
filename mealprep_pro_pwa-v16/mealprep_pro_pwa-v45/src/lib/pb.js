import PocketBase from 'pocketbase';

const pb = new PocketBase('https://db.mealplanner.cloud');
pb.autoCancellation(false);

export default pb;