const { createClient } = require('@supabase/supabase-js');

// Mengambil kredensial aman dari panggung belakang Netlify
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON; // Disesuaikan dengan nama variabel di akun Netlify-mu
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
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
    const { aksi, email, password, tabel, data, id, limit, filterAktif, sortUrutan } = body;

    // =========================================================================
    // 1. FITUR AUTENTIKASI EMAIL & PASSWORD (Untuk login.html)
    // =========================================================================
    if (aksi === 'login_auth') {
      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email dan password wajib diisi!' })
        };
      }

      // Jalankan fungsi autentikasi resmi bawaan Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: authError.message })
        };
      }

      // Kirim session token ke panggung depan jika sukses
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          message: 'Autentikasi Berhasil!',
          token: authData.session.access_token
        })
      };
    }

    // =========================================================================
    // 2. FITUR BACA DATA (Untuk memunculkan jadwal/hasil di admin & index)
    // =========================================================================
    if (aksi === 'baca') {
      let query = supabase.from(tabel).select('*');
      
      if (sortUrutan) {
        query = query.order('sort_order', { ascending: true });
      } else if (tabel === 'jadwal') {
        query = query.order('time', { ascending: true });
      } else {
        query = query.order('id', { ascending: false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data: resData, error: resErr } = await query;
      if (resErr) throw resErr;

      return { statusCode: 200, headers, body: JSON.stringify({ data: resData }) };
    }

    // =========================================================================
    // 3. FITUR HITUNG DATA (Untuk angka kotak-kotak di dashboard)
    // =========================================================================
    if (aksi === 'hitung') {
      let query = supabase.from(tabel).select('*', { count: 'exact', head: true });
      if (filterAktif) {
        query = query.eq('is_active', true);
      }
      
      const { count, error: countErr } = await query;
      if (countErr) throw countErr;

      return { statusCode: 200, headers, body: JSON.stringify({ count }) };
    }

    // =========================================================================
    // 4. FITUR TAMBAH DATA (Dipertahankan dari kode lamamu)
    // =========================================================================
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

    // =========================================================================
    // 5. FITUR HAPUS DATA (Dipertahankan dari kode lamamu)
    // =========================================================================
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
