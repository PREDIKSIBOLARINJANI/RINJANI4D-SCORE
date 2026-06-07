const { createClient } = require('@supabase/supabase-js');

// Mengambil kredensial aman dari panggung belakang Netlify
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event) => {
    // Atur Header CORS agar aman dan bisa diakses frontend
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { aksi, tabel, data, id } = body;

        // 1. FITUR TAMBAH DATA (POST)
        if (aksi === 'tambah') {
            const { data: result, error } = await supabase
                .from(tabel)
                .insert([data])
                .select();

            if (error) throw error;
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Data berhasil ditambahkan', result })
            };
        }

        // 2. FITUR HAPUS DATA (DELETE)
        if (aksi === 'hapus') {
            const { error } = await supabase
                .from(tabel)
                .delete()
                .eq('id', id);

            if (error) throw error;
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Data berhasil dihapus' })
            };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Aksi tidak dikenali' }) };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
