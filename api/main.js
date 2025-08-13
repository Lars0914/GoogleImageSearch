const { Formidable } = require('formidable');
const axios = require('axios');
const { getJson } = require('serpapi');

module.exports = async (req, res) => {
    // Handle CORS for Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const form = new Formidable({ maxFileSize: 32 * 1024 * 1024 }); // 32MB limit
    try {
        const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
        const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

        if (!IMGBB_API_KEY || !SERPAPI_API_KEY) {
            throw new Error('Missing API keys. Please check environment variables.');
        }

        const [fields, files] = await form.parse(req);
        if (!files.image || files.image.length === 0) {
            throw new Error('No image uploaded.');
        }

        const image = files.image[0];
        const fileData = require('fs').readFileSync(image.filepath);
        const base64Image = Buffer.from(fileData).toString('base64');

        // Upload to ImgBB
        const formData = new URLSearchParams();
        formData.append('image', base64Image);
        const imgBBResponse = await axios.post(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            formData,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const imageUrl = imgBBResponse.data.data.url;

        // Query SerpApi Google Lens
        const response = await getJson({
            engine: 'google_lens',
            api_key: SERPAPI_API_KEY,
            url: imageUrl,
            type: 'visual_matches'
        });

        res.status(200).json(response);
    } catch (err) {
        console.error('Error details:', {
            message: err.message,
            stack: err.stack
        });
        res.status(400).json({ error: err.message });
    }
}