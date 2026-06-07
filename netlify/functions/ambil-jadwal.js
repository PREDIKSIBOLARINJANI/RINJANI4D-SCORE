const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event, context) {
  // Mengambil kunci aman yang sudah kamu simpan di gembok Netlify kemarin
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON);

  try {
    // Menarik data jadwal pertandingan dari database Supabase kamu
    const { data, error } = await supabase
      .from('jadwal')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Mengembalikan hasil data jadwal ke halaman depan web
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Membuka gerbang akses data agar lancar
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
